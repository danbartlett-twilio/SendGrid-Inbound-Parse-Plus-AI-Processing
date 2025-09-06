/**
 * first-pass-email-processor
 * 
 * This Lambda function is invoked by SNS messages from the inbound email processing pipeline.
 * It retrieves email data from S3, categorizes the email using AWS Bedrock, and provides a summary.
 */

// Import AWS SDK clients and custom modules
import { getEmailFromS3 } from './s3-operations.mjs';
import { categorizeEmail, summarizeEmail } from './bedrock-operations.mjs';
import { publishEmailCategorizedEvent } from './eventbridge-operations.mjs';

export const lambdaHandler = async (event) => {
    console.info("EVENT\n" + JSON.stringify(event, null, 2));
    
    try {
        // Extract message from SNS event
        const snsMessage = event.Records[0].Sns.Message;
        const messageBody = JSON.parse(snsMessage);
        
        console.info("SNS Message Body\n" + JSON.stringify(messageBody, null, 2));
        
        // Validate required fields
        if (!messageBody.messageId) {
            throw new Error("Missing messageId in SNS message");
        }
        
        const messageId = messageBody.messageId;
        console.log(`Processing email with messageId: ${messageId}`);
        
        // Retrieve email data from S3
        const emailData = await getEmailFromS3(messageId);
        console.log("Retrieved email data from S3");
        
        // Process email with Bedrock in parallel
        const [categorizationResult, summaryResult] = await Promise.all([
            categorizeEmail(emailData),
            summarizeEmail(emailData)
        ]);
        
        // Prepare the processing result
        const processingResult = {
            messageId: messageId,
            originalEmail: {
                from: emailData.from,
                to: emailData.to,
                subject: emailData.subject,
                timestamp: emailData.messageTimeStamp
            },
            categorization: categorizationResult,
            summary: summaryResult,
            processedAt: new Date().toISOString()
        };
        
        console.log("Email processing completed successfully:", JSON.stringify(processingResult, null, 2));
        
        // Publish event to EventBridge for category-specific processing
        await publishEmailCategorizedEvent(processingResult);
        console.log("Event published to EventBridge for category:", categorizationResult.category);
        
        // Return the result
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: "Email processed successfully and event published",
                data: processingResult
            })
        };
        
    } catch (error) {
        console.error("Error processing email:", error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: "Error processing email",
                error: error.message
            })
        };
    }
};