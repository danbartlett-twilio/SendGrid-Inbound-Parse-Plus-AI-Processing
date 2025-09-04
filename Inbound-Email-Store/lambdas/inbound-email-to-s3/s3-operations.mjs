/**
 * S3 operations module for saving email data
 * Contains functions for saving email content to S3
 */

import { Readable } from 'stream' 
import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.REGION });

/**
 * Generates a unique S3 key for the email object
 * @param {boolean} isValidEmail - Whether the email passed security validation
 * @param {string} requestId - API Gateway request ID
 * @param {string} boundary - Multipart boundary from Content-Type header
 * @returns {string} - S3 object key
 */
export function generateS3Key(isValidEmail, requestId, boundary) {
    const now = new Date(); 
    const y = now.getFullYear().toString();
    const m = (now.getMonth() < 9 ? '0' : '') + (now.getMonth() + 1).toString();
    const d = (now.getDate() < 10 ? '0' : '') + now.getDate().toString();

    // Create a date prefix so that objects in S3 bucket are organized by date
    // Note: date is based on UTC time
    const datePrefix = `${y}-${m}-${d}/`;

    // Key format sorts by date, then uses request id, and then includes
    // the boundary used to parse the email contents in the next lambda
    // Sort security header pass / fail emails into different folders
    const key = `${(isValidEmail) ? "pass" : "fail"}/${datePrefix}${requestId.replace("=", "")}-boundary-${boundary}-email.b64`;

    return key;
}

/**
 * Saves email content to S3 bucket
 * @param {string} emailContent - The email content to save (base64 encoded)
 * @param {string} s3Key - The S3 object key
 * @param {string} bucketName - The S3 bucket name
 * @returns {Promise<Object>} - Upload result object
 */
export async function saveEmailToS3(emailContent, s3Key, bucketName) {
    try {
        console.log(`Saving email to S3: ${bucketName}/${s3Key}`);
        
        // Pull the contents of the request body into a buffer
        const buffer = Buffer.from(emailContent);

        // Convert the buffer into a stream so that it can be saved to S3
        const stream = Readable.from(buffer);          

        const parallelUploadS3 = new Upload({
            client: s3Client,
            params: { 
                Bucket: bucketName, 
                Key: s3Key, 
                Body: stream 
            }          
        });
      
        parallelUploadS3.on("httpUploadProgress", (progress) => {
            console.log("Upload progress:", progress);
        });
      
        const result = await parallelUploadS3.done();
        console.log(`Successfully saved email to S3: ${s3Key}`);
        
        return result;
    } catch (error) {
        console.error(`Error saving email to S3: ${error.message}`);
        throw error;
    }
}

/**
 * Creates a standardized success response for API Gateway
 * @param {string} requestId - API Gateway request ID
 * @param {string} message - Success message
 * @returns {Object} - API Gateway response object
 */
export function createSuccessResponse(requestId, message = 'Email processed successfully') {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            message: message,
            requestId: requestId,
            timestamp: new Date().toISOString()
        })
    };
}

/**
 * Creates a standardized error response for API Gateway
 * @param {string} requestId - API Gateway request ID
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Error} error - Error object (optional)
 * @returns {Object} - API Gateway response object
 */
export function createErrorResponse(requestId, message = 'Error processing email', statusCode = 500, error = null) {
    const responseBody = {
        message: message,
        requestId: requestId,
        timestamp: new Date().toISOString()
    };

    if (error) {
        responseBody.error = error.message;
    }

    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(responseBody)
    };
}
