/**
 * Bedrock Operations for Sales Email Handler
 * 
 * This module contains functions to interact with AWS Bedrock for generating
 * sales responses based on email content and categorization data.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({ region: process.env.REGION });

/**
 * Generates a sales response using Bedrock AI
 * @param {Object} emailJson - The original email data from S3
 * @param {Object} emailData - The processed email data with categorization
 * @returns {Promise<string>} - The AI-generated sales response
 */
export const generateSalesResponse = async (emailJson, emailData) => {
    try {
        // Extract relevant information from the email
        const originalSubject = emailJson.subject || 'No subject';
        const originalFrom = emailJson.from || 'Unknown sender';
        const originalText = emailJson.text || emailJson.html || 'No content available';
        const originalHtml = emailJson.html || '';
        
        // Extract categorization information
        const category = emailData.categorization?.category || 'sales';
        const confidence = emailData.categorization?.confidence || 0;
        const summary = emailData.summary || {};
        
        // Create a comprehensive prompt for the AI
        const prompt = `You are a professional sales representative. Please generate a helpful, engaging, and professional response to the following sales inquiry.

CUSTOMER INQUIRY DETAILS:
- From: ${originalFrom}
- Subject: ${originalSubject}
- Category: ${category} (confidence: ${confidence})
- Summary: ${JSON.stringify(summary)}
- Original Message: ${originalText}

Please provide a sales response that:
1. Acknowledges the customer's interest and inquiry
2. Shows enthusiasm and appreciation for their interest
3. Provides relevant product/service information based on their inquiry
4. Maintains a professional yet friendly and approachable tone
5. Is engaging and encourages further conversation
6. If they're asking about pricing, provide general guidance and offer to discuss specifics
7. If they're asking about features, highlight key benefits and value propositions
8. If they're asking about implementation, explain the process and timeline
9. Always offer to schedule a call or meeting to discuss their needs in detail
10. Include a clear call-to-action for next steps

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
        const aiResponse = responseBody.content?.[0]?.text || "Thank you for your interest in our products and services. We appreciate you reaching out and would love to discuss how we can help meet your needs. Please let us know a convenient time to schedule a call so we can provide you with more detailed information.";
        
        console.log("Successfully generated sales response from Bedrock");
        return aiResponse.trim();
        
    } catch (error) {
        console.error("Error generating sales response from Bedrock:", error);
        
        // Fallback response in case of error
        return `Thank you for your interest in our products and services! We have received your inquiry and are excited to learn more about your needs.

Your message has been categorized as a ${emailData.categorization?.category || 'sales'} inquiry, and our sales team will review it shortly. 

We would love to schedule a call to discuss your requirements in detail and show you how our solutions can help your business succeed. Please don't hesitate to reach out if you have any immediate questions.

We look forward to speaking with you soon!`;
    }
};
