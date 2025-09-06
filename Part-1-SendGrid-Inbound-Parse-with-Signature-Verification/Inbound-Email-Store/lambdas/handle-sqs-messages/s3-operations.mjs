/**
 * S3 operations module
 * Contains functions for saving data to S3
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.REGION });

/**
 * Every email is saved to S3. This function saves a json
 * object email.json
 */
export async function saveToS3(emailObject) {
    // Object to save to S3
    let params = {
        Bucket: process.env.SENDGRID_INBOUND_PARSE_BUCKET,
        Key: `${emailObject.messageId}/email.json`,
        Body: JSON.stringify(emailObject),
        ContentType: 'application/json'        
    };    
    
    // Send to S3
    try {            
        await s3Client.send(new PutObjectCommand(params));                
        console.log(`Successfully saved email object to S3: ${emailObject.messageId}/email.json`);
    } catch (err) {
        console.log("Error saving email object to S3!", err.stack);
        throw err; // Re-throw to allow caller to handle
    }         
    
    return true;
}
