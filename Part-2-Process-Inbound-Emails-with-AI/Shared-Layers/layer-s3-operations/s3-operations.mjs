/**
 * S3 operations module
 * Contains functions for retrieving email data from S3 and general S3/SNS operations
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const s3Client = new S3Client({ region: process.env.REGION });
const snsClient = new SNSClient({ region: process.env.REGION });

/**
 * Retrieves email.json file from S3 using messageId
 * @param {string} messageId - The message ID to retrieve
 * @returns {Object} The email object from S3
 */
export async function getEmailFromS3(messageId) {
    const params = {
        Bucket: process.env.SENDGRID_INBOUND_PARSE_BUCKET,
        Key: `${messageId}/email.json`
    };
    
    try {
        console.log(`Retrieving email from S3: ${messageId}/email.json`);
        const command = new GetObjectCommand(params);
        const response = await s3Client.send(command);
        
        // Convert the stream to string and parse JSON
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        const emailData = Buffer.concat(chunks).toString('utf-8');
        const emailObject = JSON.parse(emailData);
        
        console.log(`Successfully retrieved email object from S3: ${messageId}`);
        return emailObject;
    } catch (err) {
        console.error(`Error retrieving email object from S3: ${messageId}`, err.stack);
        throw err;
    }
}

/**
 * Downloads an attachment from S3 to a temporary local file
 * @param {string} messageId - The message ID
 * @param {Object} attachment - The attachment object with key and filename
 * @returns {string} Local file path where the attachment was downloaded
 */
export async function downloadAttachment(messageId, attachment) {
    const params = {
        Bucket: process.env.SENDGRID_INBOUND_PARSE_BUCKET,
        Key: attachment.key
    };
    
    try {
        console.log(`Downloading attachment from S3: ${attachment.key}`);
        const command = new GetObjectCommand(params);
        const response = await s3Client.send(command);
        
        // Create temp directory if it doesn't exist
        const tempDir = '/tmp/attachments';
        if (!existsSync(tempDir)) {
            mkdirSync(tempDir, { recursive: true });
        }
        
        // Convert the stream to buffer and save to local file
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);
        
        const localFilePath = join(tempDir, attachment.filename);
        writeFileSync(localFilePath, fileBuffer);
        
        console.log(`Successfully downloaded attachment to: ${localFilePath}`);
        return localFilePath;
    } catch (err) {
        console.error(`Error downloading attachment ${attachment.key}:`, err.stack);
        throw err;
    }
}

/**
 * Updates the email.json file in S3 with attachment summaries
 * @param {string} messageId - The message ID
 * @param {Object} emailData - The updated email data with attachment summaries
 * @returns {Object} S3 response
 */
export async function updateEmailJson(messageId, emailData) {
    const params = {
        Bucket: process.env.SENDGRID_INBOUND_PARSE_BUCKET,
        Key: `${messageId}/email.json`,
        Body: JSON.stringify(emailData, null, 2),
        ContentType: 'application/json'
    };
    
    try {
        console.log(`Updating email.json in S3: ${messageId}/email.json`);
        const command = new PutObjectCommand(params);
        const response = await s3Client.send(command);
        
        console.log(`Successfully updated email.json for messageId: ${messageId}`);
        return response;
    } catch (err) {
        console.error(`Error updating email.json for ${messageId}:`, err.stack);
        throw err;
    }
}

/**
 * Gets an S3 object specified in the event record, returns JSON object
 * @param {Object} record - S3 event record
 * @returns {Object} Parsed JSON object from S3
 */
export async function getJsonObjectFromS3(record) {
    let bucket = record.s3.bucket.name;
    let key = record.s3.object.key;

    let command = new GetObjectCommand({Bucket: bucket, Key: key});
    
    try {
        let data = await s3Client.send(command);                
        let json = await data.Body.transformToString();        
        let parsed = JSON.parse(json);
        return parsed;
    } catch (error) {
        console.log("Error getting JSON from S3! => ", error);
        return null;
    }
}

/**
 * Save a json object to specific S3 key / bucket 
 * @param {string} key - S3 object key
 * @param {string} bucket - S3 bucket name
 * @param {Object} messageObj - Object to save as JSON
 * @returns {boolean} Success status
 */
export async function saveToS3(key, bucket, messageObj) {
    let putObjectParams = {
        Bucket: bucket,
        Key: key,
        Body: JSON.stringify(messageObj),
        ContentType: 'application/json'
    };
    
    let command = new PutObjectCommand(putObjectParams);    
    
    try {
        let response = await s3Client.send(command);
        return true;
    } catch (error) {
        console.log("Error adding json object to S3! => ", error);
        return false;
    }
}

/**
 * Sends an SNS Message given a topic and message payload
 * @param {string} topic - SNS topic ARN
 * @param {Object} message - Message payload to send
 * @returns {void}
 */
export async function sendSNSMessage(topic, message) {
    let snsParams = {
        Message: JSON.stringify(message),
        TopicArn: topic
    };

    console.log("Publishing Message => ", message);
    console.log("to this SNS Topic => ", topic);
    
    await snsClient.send(new PublishCommand(snsParams));
    
    return;
}
