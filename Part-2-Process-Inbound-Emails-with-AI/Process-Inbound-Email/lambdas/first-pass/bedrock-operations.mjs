/**
 * Bedrock operations module for first-pass email processing
 * Contains functions for categorizing and summarizing emails using AWS Bedrock
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({ region: process.env.REGION });

/**
 * Categorizes and summarizes an email using AWS Bedrock Claude in a single call
 * @param {Object} emailData - The email data object
 * @returns {Object} Combined result with categorization and summary
 */
export async function categorizeAndSummarizeEmail(emailData) {
    const prompt = `You are an email processing assistant. Please analyze the following email and provide both categorization and summarization.

Email Details:
- From: ${emailData.from || 'Unknown'}
- To: ${emailData.to || 'Unknown'}
- Subject: ${emailData.subject || 'No Subject'}
- Body: ${emailData.emailContent['text/plain'] || emailData.emailContent['text/html'] || 'No content'}

IMPORTANT CATEGORIZATION RULES:
- If you are uncertain about the category or if the email doesn't clearly fit into sales, support, or account categories, DEFAULT TO "inquiry"
- Only use "sales" for clear sales-related inquiries (pricing, product demos, purchase intent)
- Only use "support" for technical issues, bug reports, or customer service problems
- Only use "account" for billing, account changes, login issues, or account-specific matters
- Use "inquiry" for general questions, information requests, or when the intent is unclear

Please respond with a JSON object in this exact format:
{
    "categorization": {
        "category": "one of: sales, support, account, inquiry",
        "confidence": "a number between 0 and 1",
        "reasoning": "brief explanation of why this category was chosen (under 50 words)"
    },
    "summary": {
        "summary": "clear, concise summary that captures the main points and intent of the email (under 50 words)",
        "wordCount": "number of words in the summary"
    }
}`;

    const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1500,
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
        
        console.log(`Invoking Bedrock for email categorization and summarization using model: ${modelId}`);
        const command = new InvokeModelCommand({
            modelId: modelId,
            body: JSON.stringify(requestBody),
            contentType: "application/json"
        });

        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        // Extract the content from the response
        const content = responseBody.content[0].text;
        const result = JSON.parse(content);
        
        console.log("Email categorization and summarization result:", result);
        return result;
    } catch (err) {
        console.error("Error processing email with Bedrock:", err.stack);
        throw err;
    }
}
