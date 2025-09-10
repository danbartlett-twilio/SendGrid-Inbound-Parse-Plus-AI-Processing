/**
 * Bedrock operations module for conversation email processing
 * Contains functions for generating conversational responses using AWS Bedrock
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({ region: process.env.REGION });

/**
 * Generates a conversational response using AWS Bedrock Claude
 * @param {Object} emailData - The email data object
 * @param {Object} processingData - The processing data from first-pass
 * @param {Array} conversationHistory - Array of previous conversation messages
 * @returns {string} The conversational response
 */
export async function generateConversationResponse(emailData, processingData, conversationHistory = []) {
    // Build conversation context
    let conversationContext = "";
    if (conversationHistory.length > 0) {
        conversationContext = "\n\nPrevious conversation:\n";
        conversationHistory.forEach((msg, index) => {
            conversationContext += `${index + 1}. ${msg.role}: ${msg.content}\n`;
        });
    }

    // Build attachment information if available
    let attachmentInfo = "";
    if (emailData.emailAttachments && emailData.emailAttachments.length > 0) {
        attachmentInfo = "\n\nAttachments included in this email:\n";
        emailData.emailAttachments.forEach((attachment, index) => {
            attachmentInfo += `${index + 1}. ${attachment.filename || 'Unknown file'}`;
            if (attachment.summary) {
                attachmentInfo += ` - ${attachment.summary}`;
            }
            attachmentInfo += "\n";
        });
    }

    const prompt = `You are a friendly, helpful AI assistant having a casual conversation with someone via email. 

Current email details:
- From: ${emailData.from || 'Unknown'}
- Subject: ${emailData.subject || 'No Subject'}
- Content: ${emailData.emailContent['text/plain'] || emailData.emailContent['text/html'] || 'No content'}${attachmentInfo}

${conversationContext}

Instructions:
- Respond in a natural, conversational tone
- Be friendly and engaging
- Keep responses concise but meaningful (under 100 words)
- If this is a new conversation, introduce yourself briefly
- If continuing a conversation, reference previous context appropriately
- Ask follow-up questions when appropriate to keep the conversation flowing
- Be helpful but maintain a casual, chatty tone
- If attachments are included, acknowledge them naturally in your response when relevant
- Reference attachment content when it adds value to the conversation

Please provide a natural conversational response:`;

    const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 500,
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    };

    try {
        const modelId = process.env.BEDROCK_MODEL_ID_FOR_CATEGORY_AND_SUMMARY;
        if (!modelId) {
            throw new Error("BEDROCK_MODEL_ID_FOR_CATEGORY_AND_SUMMARY environment variable is not set");
        }
        
        console.log(`Invoking Bedrock for conversation response using model: ${modelId}`);
        const command = new InvokeModelCommand({
            modelId: modelId,
            body: JSON.stringify(requestBody),
            contentType: "application/json"
        });

        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        // Extract the content from the response
        const content = responseBody.content[0].text;
        
        console.log("Conversation response generated successfully");
        return content.trim();
    } catch (err) {
        console.error("Error generating conversation response with Bedrock:", err.stack);
        throw err;
    }
}
