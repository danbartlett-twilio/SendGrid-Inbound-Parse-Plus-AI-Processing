/**
 * inbound-email-to-s3
 * 
 * Lambda function that is triggered by API Gateway. 
 * Checks the request authorization header  (Basic Authenticate)
 * and if passes, dumps the base64 encoded string right into S3.
 * 
 * This lambda checks the basic auth and then saves the
 * payload directly into S3. Saving the new object into S3 triggers
 * a message to the SQS queue to initiated additional downstream
 * processing.
 * 
 */

// Import custom modules
import { validateWebhookRequest, validateEnvironmentVariables, extractBoundary } from './input-validation.mjs';
import { generateS3Key, saveEmailToS3, createSuccessResponse, createErrorResponse } from './s3-operations.mjs';

// Helper function in Lambda Layer to validate header from SendGrid
import { validateSendGridSignature } from '/opt/validate-sendgrid-signature.mjs';

export const lambdaHandler = async (event) => {
    
    // Logging for debugging!
    console.log("Event Object ==> ", JSON.stringify(event, 2, null));  
    console.log("Is Base64 Encoded: ", event.isBase64Encoded);
    console.log("Body length: ", event.body ? event.body.length : 'undefined');
    console.log("Content-Type: ", event.headers['Content-Type']);
    console.log("X-Twilio-Email-Event-Webhook-Signature: ", event.headers['X-Twilio-Email-Event-Webhook-Signature']);
    console.log("X-Twilio-Email-Event-Webhook-Timestamp: ", event.headers['X-Twilio-Email-Event-Webhook-Timestamp']);

    // Validate environment variables
    const envValidationError = validateEnvironmentVariables();
    if (envValidationError) {
        return envValidationError;
    }

    // Validate webhook request
    const validationError = validateWebhookRequest(event);
    if (validationError) {
        return validationError;
    }

    try {
      
      console.log("In the try... ==> ");
      
      // Call function in layer to validate the post request
      // Initialize / set the necessary parameters
      let xSig = event.headers['X-Twilio-Email-Event-Webhook-Signature'];
      let xTs = event.headers['X-Twilio-Email-Event-Webhook-Timestamp'];
      let publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
      
      // Log the payload for debugging
      console.log("Payload (event.body):", event.body);
      console.log("Payload type:", typeof event.body);
      console.log("Payload length:", event.body ? event.body.length : 'null/undefined');
      
      // Decode and log the base64 payload content -- only used for debugging
      /*
      if (event.body) {
          try {
              const decodedPayload = Buffer.from(event.body, 'base64').toString('utf8');
              console.log("Decoded payload string:", decodedPayload);
              console.log("Decoded payload length:", decodedPayload.length);
          } catch (decodeError) {
              console.log("Error decoding base64 payload:", decodeError);
          }
      }
      */

      // Validate the SendGrid signature
      let validInbound = await validateSendGridSignature(event.body, xSig, xTs, publicKey)
      
      // PASS or FAIL (true / false )
      console.log("This is an email sent from SendGrid Inbound Parse => ", validInbound);

      // Extract boundary from Content-Type header (used to parse the email contents in the next lambda)
      let boundary = extractBoundary(event.headers['Content-Type']);
      if (!boundary) {
          return createErrorResponse(
              event.requestContext.requestId, 
              'Failed to extract boundary from Content-Type header', 
              400
          );
      }

      // Generate S3 key for the email (used to store the email contents in S3)
      let s3Key = generateS3Key(validInbound, event.requestContext.requestId, boundary);

      // Save email to S3 (trigger SQS message to handle-sqs-messages lambda via S3 put object event)
      await saveEmailToS3(event.body, s3Key, process.env.RAW_INBOUND_EMAIL_BUCKET);

      // Return success response to SendGrid to stop retries
      console.log("Returning success response to SendGrid to stop retries");
      return createSuccessResponse(event.requestContext.requestId);

    } catch (e) {
      
      console.log(e);
      
      // Return error response to SendGrid
      console.log("Returning error response to SendGrid to stop retries");
      return createErrorResponse(event.requestContext.requestId, 'Error processing email', 500, e);

    }        

};