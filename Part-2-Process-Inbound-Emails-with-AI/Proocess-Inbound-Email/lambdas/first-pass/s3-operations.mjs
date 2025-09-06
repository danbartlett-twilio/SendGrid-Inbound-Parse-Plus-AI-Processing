/**
 * S3 operations module
 * Contains functions for retrieving email data from S3
 */

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.REGION });

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
