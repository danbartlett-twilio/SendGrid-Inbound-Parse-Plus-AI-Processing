/**
 * send-email-via-sendgrid.mjs
 * 
 * Function to send emails via SendGrid API and handle responses.
 */

// SendGrid Client
import mail from '@sendgrid/mail';

/**
 * Sends an email via SendGrid API and processes the response
 * @param {Object} messageObj - Configured message object to send
 * @param {string} requestId - Unique request ID for tracking
 * @returns {Object} Result object with success status and response data
 */
export async function sendEmailViaSendGrid(messageObj, requestId) {
    try {
        // Set the SendGrid API Key
        mail.setApiKey(process.env.SENDGRID_API_KEY_ID);

        // Add a timestamp to custom arguments right before 
        // making the api call to assist tracking latency
        if (!messageObj.hasOwnProperty('customArgs')) {
            messageObj.customArgs = {};
        }               
        messageObj.customArgs.apiCallTimestamp = Math.floor(Date.now()/1000);

        // Call SendGrid
        let response = await mail.send(messageObj);

        console.log("response ==> ", response);

        // Process response from SendGrid
        if (response) {
            /**
             * Key variable from response object
             */
            let statusCode = "none";
            let xMessageId = null;

            // S3 Object name to be saved
            let responseKey = null;
            
            // First Set Status Code                
            if (response[0] !== undefined && response[0].statusCode !== undefined) {
                statusCode = response[0].statusCode.toString();    
            } else if (statusCode === 'none' && response.code !== undefined) {        
                statusCode = response.code.toString();
            }
        
            // Change the key suffix to 'response' and add statusCode
            responseKey = `responses/${statusCode}/${requestId}.json`; 
        
            /**
             * 
             * All successful API Calls to this endpoint return a x-message-id
             * parameter in the response headers. This x-message-id is included
             * as the first part of the sg_message_id which is included in every
             * email (it is the first set of chars before the first ".").
             * 
             * The sg_message_id is included in every webhook event which enables
             * your system to tie every message event to its original request.
             * 
             * Note that if you are sending more than one email in a request,
             * all emails will have the same 'x-message-id'.
             * 
             */
            
            if (response[0]?.statusCode !== undefined && response[0]?.statusCode === 202) {                    
                /**
                 * Sucessful API Call
                 * 
                 * Pull out  the x-message-id in the response object as that
                 * will be tied to the Message-ID in the actual emails and the 
                 * sg_message_id included in all of the webhook events.
                 */
                            
                if (response[0]?.headers['x-message-id'] !== undefined) {
                    // x-message-id can now be saved internally
                    xMessageId = response[0]?.headers['x-message-id'];                        
                    console.log("x-message-id => ", xMessageId);
        
                    // Include the x-message-id as part of the s3 object name in
                    // the response object saved to S3.
                    responseKey = `responses/${statusCode}/${requestId}__${xMessageId}.json`;             
                }
            } 
        
            console.log("responseKey => ", responseKey);
            
            /* 
                You can save the response to S3 if you would like to save the reponse. 
                You would need to create a new S3 bucket for the responses and
                import the layer-s3-operations.mjs file from the Shared-Layers stack.
                await saveToS3(responseKey, process.env.BucketName, response);
            */
            
            /*
                You can conditionally handle if the status code is not 202.
                For example, send to an SNS topic...
        
                if (response[0]?.statusCode !== 202) {                    
                    console.log("Send SNS statusCode !== 202");
                    response.event = event;
                    await sendSNSMessage(response);
                } 
            */
        
            /*
                You could add additional processing here if you would like to send the response to an SNS topic.
                Create an SNS topic and import the layer-s3-operations.mjs file from the Shared-Layers stack.
                await sendSNSMessage(process.env.SNStopic, {sourceLambda:"SendOutboundEmailFunction",requestId:messageObj?.customArgs?.requestId,xMessageId:xMessageId,message:response});
            */

            return { success: true, response, xMessageId, statusCode };
        }

        return { success: false, error: "No response from SendGrid" };

    } catch (err) {
        console.log("Error calling SendGrid API => ", err);
        return { success: false, error: err };
    }
}
