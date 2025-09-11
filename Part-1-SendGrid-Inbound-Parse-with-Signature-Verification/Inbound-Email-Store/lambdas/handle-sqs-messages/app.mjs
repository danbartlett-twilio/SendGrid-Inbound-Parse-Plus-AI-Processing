/**
 * handle-sqs-messages
 * 
 * Lambda function that is triggered by SQS. Opens message, pulls out
 * payload depending on where the message originated (SQS or Lambda-S3-to-SQS),
 * processes email, save attachments if any, publishes message to SNS topic
 * for downstream processing.
 * 
 */

// Import AWS SDK clients
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
const s3Client = new S3Client({ region: process.env.REGION });

// Import custom modules
import { processEmail } from './email-processor.mjs';
import { saveToS3 } from './s3-operations.mjs';
import { publishToSNS } from './sns-operations.mjs';

export const lambdaHandler = async (event) => {
    
    console.log("In lambda handler > Event ==> ", JSON.stringify(event, 2, null));        

    // Loop through all messages in batch received from SQS
    // Number of messages pulled from each poll to SQS is
    // configurable. Map through the array.
    // Use Promise.allSettled to handle individual message failures gracefully
    
    const results = await Promise.allSettled(event.Records.map(async (record) => {

        try {
            // Input validation
            if (!record.messageId) {
                throw new Error("Missing messageId in SQS record");
            }
            
            if (!record.body) {
                throw new Error("Missing body in SQS record");
            }

            // Initialize / set the necessary parameters
            let messageId = record.messageId; // This is the id from the SQS         
            let messageTimeStamp = (record.attributes['ApproximateFirstReceiveTimestamp']) ? (record.attributes['ApproximateFirstReceiveTimestamp']) : null;

            let emailContents = null; // Placeholder for email contents
            let boundary = null; // Placeholder for boundary used to parse emailContents

            let validEmail = false;

            let sqsMessageBody = JSON.parse(record?.body);

            if (sqsMessageBody.Event !== undefined && sqsMessageBody.Event === "s3:TestEvent") {
                // Catching test event triggered when SQS queue initially 
                // connects to this lambda.
                console.log("Test event caught.");
                return { status: 'skipped', reason: 'test_event' };
            }

            // Get the bucket and key for object storing this set of events
            let bucket = sqsMessageBody?.Records[0]?.s3.bucket.name;
            let key = decodeURIComponent(sqsMessageBody?.Records[0]?.s3.object.key);

            console.log(`In lambda handler, and about to get the object from S3 => ${bucket} and ${key}`);

            /**
             * ***********************************************
             * CHECK TO BE SURE EMAIL IS FROM SENDGRID
             * If it failed the security check, it woudl have
             * "fail" in the S3 object key. Take appropriate
             * appropriate action and do not process further.
             * ***********************************************
             */
            if (key.startsWith("fail")) {
                
                /**
                 * The invalid signature email will have "fail" in the S3 object key which
                 * is generated in the inbound-email-to-s3 lambda. You could choose to
                 * stop processing further in that lambda and NOT save the raw email
                 * to the S3 bucket.
                 * 
                 * Additional processing could be to generate events and alters that
                 * the system is receiving emails with invalid signatures.
                 * Regardless of how you choose to handle it, you should not
                 * process the email further.
                 */
                console.log("This email did not pass the security check. Exiting...");  
                // Add logic to handle a failed header security check
                return { status: 'skipped', reason: 'security_check_failed' };

            } else {

                // THIS IS A VALID EMAIL FROM SENDGRID. PROCEED...

                validEmail = true;

                // Pull out the boundary from the S3 object key. In the 
                // inbound-email-to-s3 lambda, this is pulled from the request
                // header and added to the object key so it can be extracted
                // in this step.
                boundary = key.replace(/^.*boundary-/,"").replace(/-email.b64/,"");

                console.log("Extracted boundary from S3 key:", boundary);
                console.log("Original S3 key:", key);
                

                // Get the b64 encoded email from S3
                let command = new GetObjectCommand({Bucket: bucket,Key: key});
                
                try {
            
                    // Get the Object from S3
                    let data = await s3Client.send(command);        
                    
                    // The object is string saved with Base64 encoding                            
                    emailContents = await data.Body.transformToString();

                    console.log(`In lambda handler, and emailContents => ${emailContents}`);

                    //console.log ("From Lambda > S3 and emailContents are (base64 encoding) => ", emailContents);
        
                } catch (error) {
            
                    console.log("Error getting object from S3! => ", error);
                    throw new Error(`Failed to retrieve email from S3: ${error.message}`);
            
                }
            }            
        
            // A valid email with content retreived from S3 has been found. Process it.
            if (validEmail && emailContents !== null) {
                try {

                    let emailObject = await processEmail(messageId, messageTimeStamp, emailContents, boundary);

                    //console.log("emailObject post process => ", emailObject);
                    
                    // Save entire Object to S3 (any file attachments saved separately in processEmail function)
                    await saveToS3(emailObject);

                    // Send emailObject.snsObject to SNS for additional processing
                    await publishToSNS(emailObject.snsObject);

                } catch (error) {
                    console.error(`Error processing message ${record.messageId}:`, error);
                    throw error; // Re-throw to be caught by Promise.allSettled
                }

            }
            
        } catch (error) {

            console.error(`Error processing message ${record.messageId}:`, error);
            throw error; // Re-throw to be caught by Promise.allSettled

        }

    }));
    
    // Log results and handle any failures
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            // Check if it was skipped or actually processed
            if (result.value && result.value.status === 'skipped') {
                skippedCount++;
                console.log(`Skipped message ${event.Records[index].messageId}: ${result.value.reason}`);
            } else {
                successCount++;
            }
        } else {
            failureCount++;
            console.error(`Failed to process message ${event.Records[index].messageId}:`, result.reason);
        }
    });
    
    console.log(`Batch processing complete: ${successCount} successful, ${failureCount} failed, ${skippedCount} skipped`);
    
    // If all messages failed (not skipped), throw an error to trigger SQS retry
    if (failureCount > 0 && (successCount + skippedCount) === 0) {
        throw new Error(`All ${failureCount} messages in batch failed to process`);
    }

};