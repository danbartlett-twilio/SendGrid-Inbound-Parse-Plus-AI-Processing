/**
 * Sales Email Handler
 * 
 * This Lambda function handles emails categorized as sales-related.
 * Publishes outbound email to SNS topic for processing.
 */

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { getEmailFromS3 } from "/opt/s3-operations.mjs";
import { generateSalesResponse } from "./bedrock-operations.mjs";

const snsClient = new SNSClient({ region: process.env.REGION });

export const lambdaHandler = async (event) => {
    console.log("Sales Email Handler - Event received:", JSON.stringify(event, null, 2));
    
    // Extract email details from the event
    const emailData = event.detail;
    
    console.log("Processing sales email:", {
        messageId: emailData.messageId,
        from: emailData.originalEmail?.from,
        to: emailData.originalEmail?.to,
        subject: emailData.originalEmail?.subject,
        category: emailData.categorization?.category,
        confidence: emailData.categorization?.confidence
    });
    
    try {
        // Fetch the original email.json from S3
        const emailJson = await getEmailFromS3(emailData.messageId);
        
        console.log("Successfully fetched email.json from S3");
        
        // Generate AI sales response using Bedrock
        const salesResponse = await generateSalesResponse(emailJson, emailData);
        console.log("Successfully generated sales response from Bedrock");
        
        // Format summary object for display
        const formatSummary = (summary) => {
            if (!summary) return 'N/A';
            if (typeof summary === 'string') return summary;
            if (typeof summary === 'object') {
                return Object.entries(summary)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');
            }
            return String(summary);
        };

        // Format attachment details for display
        const formatAttachmentDetails = (attachments) => {
            if (!attachments || attachments.length === 0) {
                return 'No attachments';
            }
            
            return attachments.map((attachment, index) => {
                const details = [];
                details.push(`Attachment ${index + 1}:`);
                
                // Always show summary first if it exists
                if (attachment.summary) {
                    details.push(`  - Summary: ${attachment.summary}`);
                }
                
                // List all other properties of the attachment object
                Object.entries(attachment).forEach(([key, value]) => {
                    if (key !== 'summary' && value !== null && value !== undefined) {
                        details.push(`  - ${key}: ${value}`);
                    }
                });
                
                return details.join('\n');
            }).join('\n\n');
        };

        // Format email data for display with Bedrock response at top and sales inquiry details at bottom
        const formattedEmailData = `
${salesResponse}

${'='.repeat(60)}
SALES INQUIRY DETAILS:
${'='.repeat(60)}

- Message ID: ${emailData.messageId || 'N/A'}
- From: ${emailData.originalEmail?.from || 'N/A'}
- To: ${emailData.originalEmail?.to || 'N/A'}
- Subject: ${emailData.originalEmail?.subject || 'N/A'}
- Category: ${emailData.categorization?.category || 'N/A'}
- Confidence: ${emailData.categorization?.confidence || 'N/A'}
- Summary: ${formatSummary(emailData.summary)}
- Content: ${emailData.originalEmail?.text || emailData.originalEmail?.html || 'N/A'}

${'='.repeat(60)}
ATTACHMENT DETAILS:
${'='.repeat(60)}

${formatAttachmentDetails(emailJson.emailAttachments)}
`;

        const htmlFormattedEmailData = `
<div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Sales Response</h2>
        <div style="white-space: pre-wrap;">${salesResponse}</div>
    </div>
    
    <hr style="border: 2px solid #e9ecef; margin: 30px 0;">
    
    <div style="background-color: #f1f3f4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #495057; margin-top: 0;">Sales Inquiry Details</h3>
        <ul style="list-style-type: none; padding: 0;">
            <li><strong>Message ID:</strong> ${emailData.messageId || 'N/A'}</li>
            <li><strong>From:</strong> ${emailData.originalEmail?.from || 'N/A'}</li>
            <li><strong>To:</strong> ${emailData.originalEmail?.to || 'N/A'}</li>
            <li><strong>Subject:</strong> ${emailData.originalEmail?.subject || 'N/A'}</li>
            <li><strong>Category:</strong> ${emailData.categorization?.category || 'N/A'}</li>
            <li><strong>Confidence:</strong> ${emailData.categorization?.confidence || 'N/A'}</li>
            <li><strong>Summary:</strong> ${formatSummary(emailData.summary)}</li>
            <li><strong>Content:</strong> ${emailData.originalEmail?.text || emailData.originalEmail?.html || 'N/A'}</li>
        </ul>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h3 style="color: #495057; margin-top: 0;">Attachment Details</h3>
        <div style="white-space: pre-wrap; font-family: monospace; background-color: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #dee2e6;">${formatAttachmentDetails(emailJson.emailAttachments)}</div>
    </div>
</div>
`;

        // Optionally set the sendEmail flag to true to send an email
        // You may want to take some other action or trigger some other process
        // or communicate via another channel.
        let sendEmail = true;
        let publishResult = null;

        if (sendEmail) {
            try {
                let toEmail = emailData.originalEmail?.from;
                // Optionally set the to email address programmatically
                // Currently it is just reply to the sender.

                let fromEmail = emailData.originalEmail?.to;
                // Optionally set the from email address programmatically
                // to include a custom reply-to address like sales@yourdomain.com
                // or include data in the from email address like a lead number
                // such as sales_844443985@yourdomain.com where replies would 
                // include a key to context.

                // Generate a dynamic lead number based on message ID
                const leadNumber = emailData.messageId ? 
                    emailData.messageId.substring(0, 8) : 
                    Date.now().toString().substring(5);

                let emailSubject = `Re: ${emailData.originalEmail?.subject || 'Sales Inquiry'} [Lead: ${leadNumber}]`;
                // Optionally set the email subject programmatically
                // Currently it is just a generic response to the sender.
                // But it can include data in the subject like a lead number
                // such as "Your Sales Lead ,<844443985>"
                // Also use "RE: " prefix to indicate a reply to the sender and
                // establish threading that is applicable to many Mail Clients.

                let categories = ["sales", "response"];
                // Optionally set the categories programmatically. Categories
                // are high level tags that can be use for reporting.

                let customArgs = {
                    "messageId": emailData.messageId || 'unknown',
                    "salesLeadNumber": leadNumber,
                    "category": emailData.categorization?.category || 'sales',
                    "confidence": emailData.categorization?.confidence || 0
                };
                // Optionally set the custom arguments programmatically. Custom arguments
                // are key-value pairs that can be used for tracking and are passed into
                // EventWebhooks generated by email events

                const outboundEmail = {
                    "to": toEmail,
                    "from": fromEmail,
                    "subject": emailSubject,
                    "text": formattedEmailData,
                    "html": htmlFormattedEmailData,
                    "categories": categories,
                    "customArgs": customArgs
                };

                // Publish the outbound email to SNS topic
                const publishCommand = new PublishCommand({
                    TopicArn: process.env.SNS_OUTBOUND_EMAIL_TOPIC_ARN,
                    Message: JSON.stringify(outboundEmail),
                    Subject: "Sales Response Email"
                });

                publishResult = await snsClient.send(publishCommand);
                console.log("Successfully published outbound email to SNS:", publishResult.MessageId);
                
            } catch (snsError) {
                console.error("Error publishing to SNS:", snsError);
                // Continue processing even if SNS publish fails
                publishResult = { MessageId: 'failed' };
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: sendEmail ? 
                    "Sales email processed successfully and published to SNS" : 
                    "Sales email processed successfully (no email sent)",
                category: "sales",
                snsMessageId: publishResult?.MessageId || null
            })
        };
        
    } catch (error) {
        console.error("Error processing sales email:", error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: "Failed to process sales email",
                category: "sales",
                error: error.message
            })
        };
    }
};
