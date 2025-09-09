/**
 * Bedrock Operations for Account Email Handler
 * 
 * This module contains functions to interact with AWS Bedrock for generating
 * account-related responses based on email content and categorization data.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({ region: process.env.REGION });

/**
 * Generates an account response using Bedrock AI
 * @param {Object} emailJson - The original email data from S3
 * @param {Object} emailData - The processed email data with categorization
 * @returns {Promise<string>} - The AI-generated account response
 */
export const generateAccountResponse = async (emailJson, emailData) => {
    try {
        // Extract relevant information from the email
        const originalSubject = emailJson.subject || 'No subject';
        const originalFrom = emailJson.from || 'Unknown sender';
        const originalText = emailJson.text || emailJson.html || 'No content available';
        const originalHtml = emailJson.html || '';
        
        // Extract categorization information
        const category = emailData.categorization?.category || 'account';
        const confidence = emailData.categorization?.confidence || 0;
        const summary = emailData.summary || {};
        
        // Create a comprehensive prompt for the AI
        const prompt = `You are a professional account management specialist. Please generate a helpful, secure, and professional response to the following account-related inquiry.

CUSTOMER INQUIRY DETAILS:
- From: ${originalFrom}
- Subject: ${originalSubject}
- Category: ${category} (confidence: ${confidence})
- Summary: ${JSON.stringify(summary)}
- Original Message: ${originalText}

Please provide an account response that:
1. Acknowledges the customer's account inquiry with professionalism
2. Shows understanding of their account-related needs
3. Provides helpful and accurate information based on their inquiry
4. Maintains a professional and secure tone appropriate for account matters
5. Is clear and easy to understand
6. If they're asking about billing, provide billing information and next steps
7. If they're asking about account changes, explain the process and requirements
8. If they're asking about account access, provide security-conscious guidance
9. If they're asking about account status, provide current status information
10. Always emphasize security and verification when appropriate
11. Offer to connect them with the appropriate account specialist if needed
12. Include a clear call-to-action for next steps

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
        const aiResponse = responseBody.content?.[0]?.text || "Thank you for contacting us regarding your account. We have received your inquiry and are reviewing your request. For security purposes, we may need to verify your identity before providing specific account information. Please expect to hear from our account management team shortly.";
        
        console.log("Successfully generated account response from Bedrock");
        return aiResponse.trim();
        
    } catch (error) {
        console.error("Error generating account response from Bedrock:", error);
        
        // Fallback response in case of error
        return `Thank you for contacting us regarding your account. We have received your inquiry and are reviewing your request.

Your message has been categorized as an ${emailData.categorization?.category || 'account'} inquiry, and our account management team will review it shortly. 

For security purposes, we may need to verify your identity before providing specific account information. If you have any urgent account-related concerns, please don't hesitate to contact us directly.

We appreciate your patience and look forward to assisting you with your account needs.`;
    }
};
