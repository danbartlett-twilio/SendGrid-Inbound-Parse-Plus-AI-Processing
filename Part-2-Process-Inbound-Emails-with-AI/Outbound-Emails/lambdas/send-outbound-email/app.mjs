/**
 *  send-outbound-email
 * 
 * Consolidated Lambda function that processes email events and sends emails via SendGrid.
 * This function is triggered by messages sent to the TwilioSendGridEmailEventTopic SNS topic.
 * 
 * The function combines the functionality of the previous process-email-event and send-email lambdas:
 * 1. Receives email event from SNS topic
 * 2. Configures the message object with additional parameters
 * 3. Calls the SendGrid API to send the email
 * 4. Saves response to S3 and optionally sends to SNS for additional processing
 * 
 * This function is designed to handle email events with a SINGLE email or an
 * event with multiple emails using personalizations.
 * 
 * Refer to the SendGrid docs on options to customize your API calls:
 * https://github.com/sendgrid/sendgrid-nodejs/tree/main/docs/use-cases
 *   
 * This function can be altered to meet your requirements.
 * 
 */

// Local functions
import { configureMessageObject } from './configure-message-object.mjs';
import { sendEmailViaSendGrid } from './send-email-via-sendgrid.mjs';

// Used to create unique IDs
import { nanoid } from 'nanoid';

export const lambdaHandler = async ( event ) => {
    
    console.log("event is => ", event);            

    /**
     * Events are passed in from the TwilioSendGridEmailEventTopic SNS topic.
     * Parse the message from the SNS event.
     */
    
    let originalMessageObj;    
    if (event.Records[0].EventSource !== undefined && event.Records[0].EventSource === 'aws:sns') {
        
        // Event is from SNS
        originalMessageObj = JSON.parse(event.Records[0].Sns.Message);

    } else {
        // Unexpected event source
        console.error("Unexpected event source:", event.Records[0].EventSource);

        return;
    }

    if (originalMessageObj) {
        // Generate a unique ID for EACH request!
        // This ID can be tracked via email webhook events
        let requestId = 'SGR' + nanoid();
        console.log("unique id from nanoid is => ", requestId);

        // Configure JSON Object before calling SendGrid API
        let messageObj = await configureMessageObject(requestId, originalMessageObj);

        // Send email via SendGrid
        let result = await sendEmailViaSendGrid(messageObj, requestId);

        if (!result.success) {

            // Error occurred during SendGrid API call
            console.error("SendGrid API call failed:", result.error);

        } else {
            console.log("Email sent successfully:", result.xMessageId);
        }
    
    } else {
        // Problem getting JSON object from triggering event
        
        console.error("SendGrid API call failed:", result.error);
        
    }
};
