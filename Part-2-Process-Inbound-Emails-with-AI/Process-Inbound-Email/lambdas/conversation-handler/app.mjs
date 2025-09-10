/**
 * Conversation Email Handler
 * 
 * This Lambda function handles emails categorized as conversation-related.
 * It manages conversation tracking and generates conversational responses.
 */

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getEmailFromS3, saveToS3 } from "/opt/s3-operations.mjs";
import { generateConversationResponse } from "./bedrock-operations.mjs";
import { nanoid } from "nanoid";

const snsClient = new SNSClient({ region: process.env.REGION });
const s3Client = new S3Client({ region: process.env.REGION });

export const lambdaHandler = async (event) => {
    console.log("Conversation Email Handler - Event received:", JSON.stringify(event, null, 2));
    
    // Extract email details from the event
    const emailData = event.detail;
    
    console.log("Processing conversation email:", {
        messageId: emailData.messageId,
        from: emailData.originalEmail?.from,
        to: emailData.originalEmail?.to,
        subject: emailData.originalEmail?.subject,
        category: emailData.categorization?.category,
        confidence: emailData.categorization?.confidence,
        conversationId: emailData.conversationId
    });
    
    try {
        // Fetch the original email.json from S3
        const emailJson = await getEmailFromS3(emailData.messageId);
        
        console.log("Successfully fetched email.json from S3");
        
        let conversationId = emailData.conversationId;
        let conversationHistory = [];
        
        // If no conversation ID exists, create a new conversation
        if (!conversationId) {
            conversationId = nanoid(6);
            console.log(`Created new conversation ID: ${conversationId}`);
        } else {
            // Load existing conversation history
            conversationHistory = await loadConversationHistory(conversationId);
            console.log(`Loaded conversation history with ${conversationHistory.length} messages`);
        }
        
        // Generate AI conversation response using Bedrock
        const conversationResponse = await generateConversationResponse(emailJson, emailData, conversationHistory);
        console.log("Successfully generated conversation response from Bedrock");
        
        // Save Bedrock response to S3 as llm-response.json
        const llmResponseData = {
            messageId: emailData.messageId,
            category: emailData.categorization?.category || 'conversation',
            confidence: emailData.categorization?.confidence || 0,
            response: conversationResponse,
            timestamp: new Date().toISOString(),
            handler: 'conversation-handler',
            conversationId: conversationId
        };
        
        const llmResponseKey = `${emailData.messageId}/llm-response.json`;
        const saveSuccess = await saveToS3(llmResponseKey, process.env.SENDGRID_INBOUND_PARSE_BUCKET, llmResponseData);
        
        if (saveSuccess) {
            console.log(`Successfully saved LLM response to S3: ${llmResponseKey}`);
        } else {
            console.error(`Failed to save LLM response to S3: ${llmResponseKey}`);
        }
        
        // Add current email to conversation history
        let messageContent = emailJson.emailContent['text/plain'] || emailJson.emailContent['text/html'] || 'No content';
        
        // Include attachment information if available
        if (emailJson.emailAttachments && emailJson.emailAttachments.length > 0) {
            messageContent += "\n\nAttachments:";
            emailJson.emailAttachments.forEach((attachment, index) => {
                messageContent += `\n${index + 1}. ${attachment.filename || 'Unknown file'}`;
                if (attachment.summary) {
                    messageContent += ` - ${attachment.summary}`;
                }
            });
        }
        
        const currentMessage = {
            role: "user",
            content: messageContent,
            timestamp: new Date().toISOString(),
            messageId: emailData.messageId
        };
        
        // Add AI response to conversation history
        const aiResponse = {
            role: "assistant",
            content: conversationResponse,
            timestamp: new Date().toISOString(),
            messageId: emailData.messageId
        };
        
        conversationHistory.push(currentMessage, aiResponse);
        
        // Save updated conversation history
        await saveConversationHistory(conversationId, conversationHistory);
        console.log("Successfully saved conversation history");
        
        // Format email data for display
        const formattedEmailData = `
${conversationResponse}

${'='.repeat(60)}
CONVERSATION DETAILS:
${'='.repeat(60)}

- Message ID: ${emailData.messageId || 'N/A'}
- From: ${emailData.originalEmail?.from || 'N/A'}
- To: ${emailData.originalEmail?.to || 'N/A'}
- Subject: ${emailData.originalEmail?.subject || 'N/A'}
- Category: ${emailData.categorization?.category || 'N/A'}
- Confidence: ${emailData.categorization?.confidence || 'N/A'}
- Conversation ID: ${conversationId}
- Content: ${emailData.originalEmail?.text || emailData.originalEmail?.html || 'N/A'}
`;

        const htmlFormattedEmailData = `
<div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Conversation Response</h2>
        <div style="white-space: pre-wrap;">${conversationResponse}</div>
    </div>
    
    <hr style="border: 2px solid #e9ecef; margin: 30px 0;">
    
    <div style="background-color: #f1f3f4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #495057; margin-top: 0;">Conversation Details</h3>
        <ul style="list-style-type: none; padding: 0;">
            <li><strong>Message ID:</strong> ${emailData.messageId || 'N/A'}</li>
            <li><strong>From:</strong> ${emailData.originalEmail?.from || 'N/A'}</li>
            <li><strong>To:</strong> ${emailData.originalEmail?.to || 'N/A'}</li>
            <li><strong>Subject:</strong> ${emailData.originalEmail?.subject || 'N/A'}</li>
            <li><strong>Category:</strong> ${emailData.categorization?.category || 'N/A'}</li>
            <li><strong>Confidence:</strong> ${emailData.categorization?.confidence || 'N/A'}</li>
            <li><strong>Conversation ID:</strong> ${conversationId}</li>
            <li><strong>Content:</strong> ${emailData.originalEmail?.text || emailData.originalEmail?.html || 'N/A'}</li>
        </ul>
    </div>
</div>
`;

        // Send email response
        let sendEmail = true;
        let publishResult = null;

        if (sendEmail) {
            try {
                let toEmail = emailData.originalEmail?.from;
                let fromEmail = `conv_${conversationId}${process.env.SENDGRID_OUTBOUND_EMAIL_DOMAIN_NAME}`;
                
                // Create subject with conversation ID
                let emailSubject = `Re: [conv_${conversationId}] ${emailData.originalEmail?.subject || 'Conversation'}`;

                let categories = ["conversation", "response"];
                
                let customArgs = {
                    "messageId": emailData.messageId || 'unknown',
                    "conversationId": conversationId,
                    "category": emailData.categorization?.category || 'conversation',
                    "confidence": emailData.categorization?.confidence || 0
                };

                const outboundEmail = {
                    "to": toEmail,
                    "from": fromEmail,
                    "subject": emailSubject,
                    "text": formattedEmailData,
                    "html": htmlFormattedEmailData,
                    "categories": categories,
                    "customArgs": customArgs
                };

                // Publish the outbound email to SNS topic
                const publishCommand = new PublishCommand({
                    TopicArn: process.env.SNS_OUTBOUND_EMAIL_TOPIC_ARN,
                    Message: JSON.stringify(outboundEmail),
                    Subject: "Conversation Response Email"
                });

                publishResult = await snsClient.send(publishCommand);
                console.log("Successfully published outbound email to SNS:", publishResult.MessageId);
                
            } catch (snsError) {
                console.error("Error publishing to SNS:", snsError);
                // Continue processing even if SNS publish fails
                publishResult = { MessageId: 'failed' };
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: sendEmail ? 
                    "Conversation email processed successfully and published to SNS" : 
                    "Conversation email processed successfully (no email sent)",
                category: "conversation",
                conversationId: conversationId,
                snsMessageId: publishResult?.MessageId || null
            })
        };
        
    } catch (error) {
        console.error("Error processing conversation email:", error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: "Failed to process conversation email",
                category: "conversation",
                error: error.message
            })
        };
    }
};

/**
 * Loads conversation history from S3
 * @param {string} conversationId - The conversation ID
 * @returns {Array} Array of conversation messages
 */
async function loadConversationHistory(conversationId) {
    const params = {
        Bucket: process.env.SENDGRID_INBOUND_PARSE_BUCKET,
        Key: `conversations/${conversationId}.json`
    };
    
    try {
        console.log(`Loading conversation history from S3: conversations/${conversationId}.json`);
        const command = new GetObjectCommand(params);
        const response = await s3Client.send(command);
        
        // Convert the stream to string and parse JSON
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        const conversationData = Buffer.concat(chunks).toString('utf-8');
        const conversationObject = JSON.parse(conversationData);
        
        console.log(`Successfully loaded conversation history for: ${conversationId}`);
        return conversationObject.messages || [];
    } catch (err) {
        if (err.name === 'NoSuchKey') {
            console.log(`No existing conversation history found for: ${conversationId}`);
            return [];
        }
        console.error(`Error loading conversation history for ${conversationId}:`, err.stack);
        throw err;
    }
}

/**
 * Saves conversation history to S3
 * @param {string} conversationId - The conversation ID
 * @param {Array} conversationHistory - Array of conversation messages
 */
async function saveConversationHistory(conversationId, conversationHistory) {
    const conversationData = {
        conversationId: conversationId,
        messages: conversationHistory,
        lastUpdated: new Date().toISOString()
    };
    
    const params = {
        Bucket: process.env.SENDGRID_INBOUND_PARSE_BUCKET,
        Key: `conversations/${conversationId}.json`,
        Body: JSON.stringify(conversationData, null, 2),
        ContentType: 'application/json'
    };
    
    try {
        console.log(`Saving conversation history to S3: conversations/${conversationId}.json`);
        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        
        console.log(`Successfully saved conversation history for: ${conversationId}`);
    } catch (err) {
        console.error(`Error saving conversation history for ${conversationId}:`, err.stack);
        throw err;
    }
}
