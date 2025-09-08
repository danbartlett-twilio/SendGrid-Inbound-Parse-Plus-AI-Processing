/**
 * Process Attachments Lambda
 * 
 * This Lambda function handles emails that have attachments.
 * It downloads attachments, analyzes them with Bedrock, updates email.json,
 * and publishes completion events to EventBridge.
 */

// Import functions from layers
import { getEmailFromS3, downloadAttachment, updateEmailJson } from '/opt/s3-operations.mjs';
import { publishAttachmentProcessedEvent } from '/opt/eventbridge-operations.mjs';
import { analyzeAttachment } from './bedrock-operations.mjs';

export const lambdaHandler = async (event) => {
    console.log("Process Attachments Handler - Event received:", JSON.stringify(event, null, 2));
    
    try {
        // Extract email details from the event
        const emailData = event.detail;
        const messageId = emailData.messageId;
        
        console.log("Processing email with attachments:", {
            messageId: messageId,
            from: emailData.originalEmail?.from,
            to: emailData.originalEmail?.to,
            subject: emailData.originalEmail?.subject,
            category: emailData.categorization?.category,
            confidence: emailData.categorization?.confidence,
            attachmentCount: emailData.originalEmail?.attachments || 0
        });
        
        // Retrieve the full email data from S3
        const fullEmailData = await getEmailFromS3(messageId);
        console.log("Retrieved full email data from S3");
        
        // Check if there are attachments to process
        const emailAttachments = fullEmailData.emailAttachments || [];
        if (emailAttachments.length === 0) {
            console.log("No attachments found in email data");
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: "No attachments to process",
                    attachmentCount: 0
                })
            };
        }
        
        console.log(`Processing ${emailAttachments.length} attachments`);
        
        // Process each attachment
        const processedAttachments = [];
        for (let i = 0; i < emailAttachments.length; i++) {
            const attachment = emailAttachments[i];
            
            try {
                console.log(`Processing attachment ${i + 1}/${emailAttachments.length}: ${attachment.filename}`);
                
                // Skip inline attachments (contentId only) as they don't have files to download
                if (!attachment.key || !attachment.filename) {
                    console.log(`Skipping inline attachment: ${attachment.contentId}`);
                    processedAttachments.push({
                        ...attachment,
                        summary: "Inline attachment (embedded content)"
                    });
                    continue;
                }
                
                // Download attachment to temporary location
                const localFilePath = await downloadAttachment(messageId, attachment);
                
                // Analyze attachment with Bedrock
                const attachmentForAnalysis = {
                    filePath: localFilePath,
                    filename: attachment.filename,
                    contentType: attachment.type,
                    size: attachment.size
                };
                
                const summary = await analyzeAttachment(attachmentForAnalysis);
                
                // Add summary to attachment object
                const processedAttachment = {
                    ...attachment,
                    summary: summary
                };
                
                processedAttachments.push(processedAttachment);
                console.log(`Successfully processed attachment: ${attachment.filename}`);
                
            } catch (attachmentError) {
                console.error(`Error processing attachment ${attachment.filename}:`, attachmentError);
                
                // Add error summary to attachment object
                const processedAttachment = {
                    ...attachment,
                    summary: `Error processing attachment: ${attachmentError.message}`
                };
                
                processedAttachments.push(processedAttachment);
            }
        }
        
        // Update the email data with processed attachments
        const updatedEmailData = {
            ...fullEmailData,
            emailAttachments: processedAttachments
        };
        
        // Save updated email.json back to S3
        await updateEmailJson(messageId, updatedEmailData);
        console.log("Updated email.json with attachment summaries");
        
        // Prepare processing result for EventBridge
        const processingResult = {
            messageId: messageId,
            originalEmail: emailData.originalEmail,
            categorization: emailData.categorization,
            summary: emailData.summary,
            hasAttachment: true,
            processedAttachments: processedAttachments,
            attachmentCount: processedAttachments.length,
            processedAt: new Date().toISOString()
        };
        
        // Publish completion event to EventBridge
        await publishAttachmentProcessedEvent(processingResult);
        console.log("Published attachment processed event to EventBridge");
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: "Attachments processed successfully",
                attachmentCount: processedAttachments.length,
                processedAttachments: processedAttachments.map(att => ({
                    filename: att.filename,
                    type: att.type,
                    summary: att.summary
                }))
            })
        };
        
    } catch (error) {
        console.error("Error processing attachments:", error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: "Error processing attachments",
                error: error.message
            })
        };
    }
};
