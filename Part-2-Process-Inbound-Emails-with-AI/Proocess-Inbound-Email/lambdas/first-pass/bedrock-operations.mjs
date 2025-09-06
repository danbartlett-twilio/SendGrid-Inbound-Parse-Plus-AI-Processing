/**
 * Bedrock operations module
 * Contains functions for categorizing and summarizing emails using AWS Bedrock
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({ region: process.env.REGION });

/**
 * Categorizes an email using AWS Bedrock Claude
 * @param {Object} emailData - The email data object
 * @returns {Object} Categorization result with category and confidence
 */
export async function categorizeEmail(emailData) {
    const prompt = `You are an email categorization assistant. Please categorize the following email into one of these categories: sales, support, account, inquiry.

Email Details:
- From: ${emailData.from || 'Unknown'}
- To: ${emailData.to || 'Unknown'}
- Subject: ${emailData.subject || 'No Subject'}
- Body: ${emailData.text || emailData.html || 'No content'}

Please respond with a JSON object in this exact format:
{
    "category": "one of: sales, support, account, inquiry",
    "confidence": "a number between 0 and 1",
    "reasoning": "brief explanation of why this category was chosen"
}`;

    const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    };

    try {
        console.log("Invoking Bedrock for email categorization");
        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-haiku-20240307-v1:0",
            body: JSON.stringify(requestBody),
            contentType: "application/json"
        });

        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        // Extract the content from the response
        const content = responseBody.content[0].text;
        const result = JSON.parse(content);
        
        console.log("Email categorization result:", result);
        return result;
    } catch (err) {
        console.error("Error categorizing email with Bedrock:", err.stack);
        throw err;
    }
}

/**
 * Summarizes an email using AWS Bedrock Claude
 * @param {Object} emailData - The email data object
 * @returns {Object} Summary result with summary text
 */
export async function summarizeEmail(emailData) {
    const prompt = `You are an email summarization assistant. Please provide a concise summary of the following email:

Email Details:
- From: ${emailData.from || 'Unknown'}
- To: ${emailData.to || 'Unknown'}
- Subject: ${emailData.subject || 'No Subject'}
- Body: ${emailData.text || emailData.html || 'No content'}

Please provide a clear, concise summary that captures the main points and intent of the email. Keep it under 200 words.`;

    const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    };

    try {
        console.log("Invoking Bedrock for email summarization");
        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-haiku-20240307-v1:0",
            body: JSON.stringify(requestBody),
            contentType: "application/json"
        });

        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        // Extract the content from the response
        const summary = responseBody.content[0].text;
        
        console.log("Email summarization completed");
        return {
            summary: summary.trim(),
            wordCount: summary.trim().split(/\s+/).length
        };
    } catch (err) {
        console.error("Error summarizing email with Bedrock:", err.stack);
        throw err;
    }
}
