/**
 * Bedrock Operations for Inquiry Email Handler
 * 
 * This module contains functions to interact with AWS Bedrock for generating
 * general inquiry responses based on email content and categorization data.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({ region: process.env.REGION });

/**
 * Generates a general inquiry response using Bedrock AI
 * @param {Object} emailJson - The original email data from S3
 * @param {Object} emailData - The processed email data with categorization
 * @returns {Promise<string>} - The AI-generated inquiry response
 */
export const generateInquiryResponse = async (emailJson, emailData) => {
    try {
        // Extract relevant information from the email
        const originalSubject = emailJson.subject || 'No subject';
        const originalFrom = emailJson.from || 'Unknown sender';
        const originalText = emailJson.text || emailJson.html || 'No content available';
        const originalHtml = emailJson.html || '';
        
        // Extract categorization information
        const category = emailData.categorization?.category || 'inquiry';
        const confidence = emailData.categorization?.confidence || 0;
        const summary = emailData.summary || {};
        
        // Create a comprehensive prompt for the AI
        const prompt = `You are a helpful customer service representative. Please generate a friendly, informative, and professional response to the following general inquiry.

CUSTOMER INQUIRY DETAILS:
- From: ${originalFrom}
- Subject: ${originalSubject}
- Category: ${category} (confidence: ${confidence})
- Summary: ${JSON.stringify(summary)}
- Original Message: ${originalText}

Please provide a general inquiry response that:
1. Acknowledges the customer's inquiry with warmth and appreciation
2. Shows understanding of their question or request
3. Provides helpful and relevant information based on their inquiry
4. Maintains a professional yet friendly and approachable tone
5. Is clear and easy to understand
6. If they're asking for general information, provide comprehensive details
7. If they're asking about processes, explain the steps clearly
8. If they're asking about policies, provide relevant policy information
9. If they're asking about services, describe what's available
10. Always offer additional assistance and provide contact information for further help
11. Include a clear call-to-action for next steps if appropriate

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
        const aiResponse = responseBody.content?.[0]?.text || "Thank you for reaching out to us! We appreciate your inquiry and are here to help. We have received your message and will provide you with the information you need. If you have any additional questions, please don't hesitate to contact us.";
        
        console.log("Successfully generated inquiry response from Bedrock");
        return aiResponse.trim();
        
    } catch (error) {
        console.error("Error generating inquiry response from Bedrock:", error);
        
        // Fallback response in case of error
        return `Thank you for contacting us! We have received your inquiry and appreciate you reaching out.

Your message has been categorized as a ${emailData.categorization?.category || 'general'} inquiry, and our team will review it to provide you with the most helpful response.

We are committed to providing excellent customer service and will get back to you with the information you need. If you have any urgent questions, please don't hesitate to contact us directly.

We look forward to assisting you!`;
    }
};
