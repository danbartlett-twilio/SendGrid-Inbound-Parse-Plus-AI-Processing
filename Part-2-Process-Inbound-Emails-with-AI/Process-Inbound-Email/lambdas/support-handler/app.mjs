/**
 * Support Email Handler
 * 
 * This Lambda function handles emails categorized as support-related.
 * Publishes outbound email to SNS topic for processing.
 */

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { getEmailFromS3 } from "/opt/s3-operations.mjs";
import { generateSupportResponse } from "./bedrock-operations.mjs";

const snsClient = new SNSClient({ region: process.env.REGION });

export const lambdaHandler = async (event) => {
    console.log("Support Email Handler - Event received:", JSON.stringify(event, null, 2));
    
    // Extract email details from the event
    const emailData = event.detail;
    
    console.log("Processing support email:", {
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
        
        // Generate AI support response using Bedrock
        const supportResponse = await generateSupportResponse(emailJson, emailData);
        console.log("Successfully generated support response from Bedrock");
        
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

        // Format email data for display with Bedrock response at top and inquiry details at bottom
        const formattedEmailData = `
${supportResponse}

${'='.repeat(60)}
SUPPORT INQUIRY DETAILS:
${'='.repeat(60)}

- Message ID: ${emailData.messageId || 'N/A'}
- From: ${emailData.originalEmail?.from || 'N/A'}
- To: ${emailData.originalEmail?.to || 'N/A'}
- Subject: ${emailData.originalEmail?.subject || 'N/A'}
- Category: ${emailData.categorization?.category || 'N/A'}
- Confidence: ${emailData.categorization?.confidence || 'N/A'}
- Summary: ${formatSummary(emailData.summary)}
- Content: ${emailData.originalEmail?.text || emailData.originalEmail?.html || 'N/A'}
`;

        const htmlFormattedEmailData = `
<div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Support Response</h2>
        <div style="white-space: pre-wrap;">${supportResponse}</div>
    </div>
    
    <hr style="border: 2px solid #e9ecef; margin: 30px 0;">
    
    <div style="background-color: #f1f3f4; padding: 20px; border-radius: 8px;">
        <h3 style="color: #495057; margin-top: 0;">Support Inquiry Details</h3>
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
</div>
`;

        const outboundEmail = {
            "to": emailData.originalEmail?.from,
            "from": emailData.originalEmail?.to,
            "subject": "Response to your support inquiry",
            "text": formattedEmailData,
            "html": htmlFormattedEmailData,
            "categories": [
                "some-category",
                "some-other-category"
            ],    
            "customArgs": 
                {
                "twilioFoo": "sendgridBar"    
                }
        };

        // Publish the outbound email to SNS topic
        const publishCommand = new PublishCommand({
            TopicArn: process.env.SNS_OUTBOUND_EMAIL_TOPIC_ARN,
            Message: JSON.stringify(outboundEmail),
            Subject: "Support Response Email"
        });

        const publishResult = await snsClient.send(publishCommand);
        console.log("Successfully published outbound email to SNS:", publishResult.MessageId);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: "Support email processed successfully and published to SNS",
                category: "support",
                snsMessageId: publishResult.MessageId
            })
        };
        
    } catch (error) {
        console.error("Error processing support email:", error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: "Failed to process support email",
                category: "support",
                error: error.message
            })
        };
    }
};
