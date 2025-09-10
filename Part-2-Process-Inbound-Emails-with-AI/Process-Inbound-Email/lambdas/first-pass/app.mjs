/**
 * first-pass-email-processor
 * 
 * This Lambda function is invoked by SNS messages from the inbound email processing pipeline.
 * It retrieves email data from S3, categorizes the email using AWS Bedrock, and provides a summary.
 */

// Import AWS SDK clients and custom modules from layers
import { getEmailFromS3 } from '/opt/s3-operations.mjs';
import { publishEmailCategorizedEvent } from '/opt/eventbridge-operations.mjs';
import { categorizeAndSummarizeEmail } from './bedrock-operations.mjs';

export const lambdaHandler = async (event) => {
    console.info("EVENT\n" + JSON.stringify(event, null, 2));
    
    
    try {
        // Extract message from SNS event
        const snsMessage = event.Records[0].Sns.Message;
        const messageBody = JSON.parse(snsMessage);
        
        console.info("SNS Message Body\n" + JSON.stringify(messageBody, null, 2));
        
        // Validate required fields
        if (!messageBody.messageId) {
            throw new Error("Missing messageId in SNS message");
        }
        
        const messageId = messageBody.messageId;
        console.log(`Processing email with messageId: ${messageId}`);
        
        // Retrieve email data from S3
        const emailData = await getEmailFromS3(messageId);
        console.log("Retrieved email data from S3");
        
        // Check for conversation ID in subject or TO email address
        const conversationId = extractConversationId(emailData);
        let categorizationResult;
        let summaryResult;
        
        if (conversationId) {
            // If conversation ID is found, categorize as conversation
            categorizationResult = {
                category: "conversation",
                confidence: 1.0,
                reasoning: "Conversation ID detected in subject or TO email address"
            };
            summaryResult = {
                summary: "Continuation of existing conversation",
                wordCount: 4
            };
            console.log(`Conversation ID detected: ${conversationId}`);
        } else {
            // Process email with Bedrock (categorization and summarization in single call)
            const aiResult = await categorizeAndSummarizeEmail(emailData);
            categorizationResult = aiResult.categorization;
            summaryResult = aiResult.summary;
        }
        
        // Check for attachments
        const attachmentCount = emailData.emailAttachments.length;
        const hasAttachment = attachmentCount > 0;
        
        console.log(`Email has ${attachmentCount} attachments: ${hasAttachment}`);
        
        // Prepare the processing result
        const processingResult = {
            messageId: messageId,
            originalEmail: {
                from: emailData.from,
                to: emailData.to,
                subject: emailData.subject,
                timestamp: emailData.messageTimeStamp,
                attachments: attachmentCount
            },
            categorization: categorizationResult,
            summary: summaryResult,
            hasAttachment: hasAttachment,
            conversationId: conversationId || null,
            processedAt: new Date().toISOString()
        };
        
        console.log("Email processing completed successfully:", JSON.stringify(processingResult, null, 2));
        
        // Publish event to EventBridge for category-specific processing
        await publishEmailCategorizedEvent(processingResult);
        console.log("Event published to EventBridge for category:", categorizationResult.category);
        
        // Return the result
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: "Email processed successfully and event published",
                data: processingResult
            })
        };
        
    } catch (error) {
        console.error("Error processing email:", error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: "Error processing email",
                error: error.message
            })
        };
    }
};

/**
 * Extracts conversation ID from email subject or TO address
 * @param {Object} emailData - The email data object
 * @returns {string|null} The conversation ID if found, null otherwise
 */
function extractConversationId(emailData) {
    // Check subject line for conversation ID pattern
    if (emailData.subject) {
        // Look for pattern like "Re: [conv_abc123] Original Subject"
        const subjectMatch = emailData.subject.match(/\[conv_([a-zA-Z0-9_-]+)\]/);
        if (subjectMatch) {
            return subjectMatch[1];
        }
    }
    
    // Check TO email address for conversation ID pattern
    if (emailData.to) {
        // Look for pattern like "conv_abc123@domain.com"
        const toMatch = emailData.to.match(/conv_([a-zA-Z0-9_-]+)@/);
        if (toMatch) {
            return toMatch[1];
        }
    }
    
    return null;
}