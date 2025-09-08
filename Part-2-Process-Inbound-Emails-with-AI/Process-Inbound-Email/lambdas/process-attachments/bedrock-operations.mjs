/**
 * Bedrock operations module for attachment processing
 * Contains functions for analyzing attachments using AWS Bedrock
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { readFileSync } from 'fs';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.REGION });

/**
 * Analyzes an attachment using AWS Bedrock Claude with vision capabilities
 * @param {Object} attachment - The attachment object with file path and metadata
 * @returns {string} Single sentence description of the attachment
 */
export async function analyzeAttachment(attachment) {
    try {
        const { filePath, filename, contentType, size } = attachment;
        
        console.log(`Analyzing attachment: ${filename} (${contentType}, ${size} bytes)`);
        
        // Read the file content
        const fileContent = readFileSync(filePath);
        
        // Determine the appropriate model and processing based on content type
        let modelId, requestBody;
        
        if (contentType.startsWith('image/')) {
            // Use Claude 3.5 Sonnet for image analysis
            modelId = process.env.BEDROCK_MODEL_ID_FOR_ATTACHMENT_ANALYSIS;
            if (!modelId) {
                throw new Error("BEDROCK_MODEL_ID_FOR_ATTACHMENT_ANALYSIS environment variable is not set");
            }
            
            const base64Image = fileContent.toString('base64');
            
            requestBody = {
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 100,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Please provide a single sentence description of what you see in this image. Be concise and descriptive."
                            },
                            {
                                type: "image",
                                source: {
                                    type: "base64",
                                    media_type: contentType,
                                    data: base64Image
                                }
                            }
                        ]
                    }
                ]
            };
            
        } else if (contentType === 'application/pdf') {
            // For PDFs, we'll use text extraction approach
            // Note: This is a simplified approach - in production you might want to use a PDF parsing library
            modelId = process.env.BEDROCK_MODEL_ID_FOR_ATTACHMENT_ANALYSIS;
            if (!modelId) {
                throw new Error("BEDROCK_MODEL_ID_FOR_ATTACHMENT_ANALYSIS environment variable is not set");
            }
            
            // For now, we'll analyze the filename and provide a generic description
            // In a full implementation, you'd extract text from the first few pages
            requestBody = {
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 100,
                messages: [
                    {
                        role: "user",
                        content: `Based on the filename "${filename}" and the fact that this is a PDF document (${size} bytes), provide a single sentence description of what this document likely contains. Be concise and descriptive.`
                    }
                ]
            };
            
        } else if (contentType.startsWith('text/')) {
            // For text files, read the content and analyze
            modelId = process.env.BEDROCK_MODEL_ID_FOR_ATTACHMENT_ANALYSIS;
            if (!modelId) {
                throw new Error("BEDROCK_MODEL_ID_FOR_ATTACHMENT_ANALYSIS environment variable is not set");
            }
            
            const textContent = fileContent.toString('utf-8');
            const preview = textContent.substring(0, 1000); // First 1000 characters
            
            requestBody = {
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 100,
                messages: [
                    {
                        role: "user",
                        content: `Based on the filename "${filename}" and this text preview: "${preview}", provide a single sentence description of what this text file contains. Be concise and descriptive.`
                    }
                ]
            };
            
        } else {
            // For other file types, provide a generic description
            return `This is a ${contentType} file named "${filename}" (${size} bytes).`;
        }
        
        console.log(`Invoking Bedrock for attachment analysis using model: ${modelId}`);
        const command = new InvokeModelCommand({
            modelId: modelId,
            body: JSON.stringify(requestBody),
            contentType: "application/json"
        });

        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        // Extract the content from the response
        const content = responseBody.content[0].text;
        const description = content.trim();
        
        console.log(`Attachment analysis result for ${filename}:`, description);
        return description;
        
    } catch (err) {
        console.error(`Error analyzing attachment ${attachment.filename}:`, err.stack);
        // Return a fallback description
        return `This is a ${attachment.contentType} file named "${attachment.filename}" (${attachment.size} bytes).`;
    }
}
