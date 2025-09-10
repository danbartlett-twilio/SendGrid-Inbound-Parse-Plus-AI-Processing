/**
 * Bedrock Operations for Support Email Handler
 * 
 * This module contains functions to interact with AWS Bedrock for generating
 * support responses based on email content and categorization data.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({ region: process.env.REGION });

/**
 * Generates a support response using Bedrock AI
 * @param {Object} emailJson - The original email data from S3
 * @param {Object} emailData - The processed email data with categorization
 * @returns {Promise<string>} - The AI-generated support response
 */
export const generateSupportResponse = async (emailJson, emailData) => {
    try {
        // Extract relevant information from the email
        const originalSubject = emailJson.subject || 'No subject';
        const originalFrom = emailJson.from || 'Unknown sender';
        const originalText = emailJson.text || emailJson.html || 'No content available';
        const originalHtml = emailJson.html || '';
        
        // Extract categorization information
        const category = emailData.categorization?.category || 'support';
        const confidence = emailData.categorization?.confidence || 0;
        const summary = emailData.summary || {};
        
        // Build attachment information if available
        let attachmentInfo = "";
        if (emailJson.emailAttachments && emailJson.emailAttachments.length > 0) {
            attachmentInfo = "\n\nATTACHMENTS INCLUDED:\n";
            emailJson.emailAttachments.forEach((attachment, index) => {
                attachmentInfo += `${index + 1}. ${attachment.filename || 'Unknown file'} (${attachment.type || 'Unknown type'})`;
                if (attachment.summary) {
                    attachmentInfo += `\n   Summary: ${attachment.summary}`;
                }
                if (attachment.size) {
                    attachmentInfo += `\n   Size: ${attachment.size} bytes`;
                }
                attachmentInfo += "\n";
            });
        }
        
        // Create a comprehensive prompt for the AI
        const prompt = `You are a professional customer support agent. Please generate a helpful, empathetic, and professional response to the following customer inquiry.

CUSTOMER INQUIRY DETAILS:
- From: ${originalFrom}
- Subject: ${originalSubject}
- Category: ${category} (confidence: ${confidence})
- Summary: ${JSON.stringify(summary)}
- Original Message: ${originalText}${attachmentInfo}

Please provide a support response that:
1. Acknowledges the customer's inquiry
2. Shows empathy and understanding
3. Provides helpful guidance or next steps
4. Maintains a professional and friendly tone
5. Is concise but comprehensive
6. If it's a technical issue, suggests troubleshooting steps
7. If it's a general inquiry, provides relevant information
8. If attachments are included, acknowledge them and reference their content when relevant to the support issue
9. Always offers to help further if needed

Generate only the response content, without any additional formatting or explanations.`;

        const modelId = process.env.BEDROCK_MODEL_ID_FOR_CATEGORY_AND_SUMMARY;
        
        const requestBody = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1000,
            temperature: 0.7,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        };

        const command = new InvokeModelCommand({
            modelId: modelId,
            body: JSON.stringify(requestBody),
            contentType: "application/json"
        });

        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        // Extract the AI response
        const aiResponse = responseBody.content?.[0]?.text || "I apologize, but I'm having trouble generating a response at the moment. Please contact our support team directly for assistance.";
        
        console.log("Successfully generated support response from Bedrock");
        return aiResponse.trim();
        
    } catch (error) {
        console.error("Error generating support response from Bedrock:", error);
        
        // Fallback response in case of error
        return `Thank you for contacting our support team. We have received your inquiry and are working to provide you with the best possible assistance. 

Your message has been categorized as a ${emailData.categorization?.category || 'support'} inquiry, and our team will review it shortly. 

If you have any urgent concerns, please don't hesitate to contact us directly. We appreciate your patience and look forward to helping you resolve your inquiry.`;
    }
};
