/**
 * Input validation module for API Gateway requests
 * Contains functions for validating incoming webhook requests
 */

/**
 * Validates the incoming API Gateway event for SendGrid webhook
 * @param {Object} event - API Gateway event object
 * @returns {Object|null} - Returns error response object if validation fails, null if valid
 */
export function validateWebhookRequest(event) {
    // Validate request body
    if (!event.body) {
        console.error("Missing request body");
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'Missing request body',
                requestId: event.requestContext.requestId,
                timestamp: new Date().toISOString()
            })
        };
    }

    // Validate required SendGrid headers
    if (!event.headers['X-Twilio-Email-Event-Webhook-Signature']) {
        console.error("Missing X-Twilio-Email-Event-Webhook-Signature header");
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'Missing required signature header',
                requestId: event.requestContext.requestId,
                timestamp: new Date().toISOString()
            })
        };
    }

    if (!event.headers['X-Twilio-Email-Event-Webhook-Timestamp']) {
        console.error("Missing X-Twilio-Email-Event-Webhook-Timestamp header");
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'Missing required timestamp header',
                requestId: event.requestContext.requestId,
                timestamp: new Date().toISOString()
            })
        };
    }

    // Validate Content-Type
    if (!event.headers['Content-Type'] || !event.headers['Content-Type'].includes('multipart/form-data')) {
        console.error("Invalid or missing Content-Type header");
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'Invalid Content-Type. Expected multipart/form-data',
                requestId: event.requestContext.requestId,
                timestamp: new Date().toISOString()
            })
        };
    }

    // Check request size limit (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (event.body.length > maxSize) {
        console.error(`Request body too large: ${event.body.length} bytes (max: ${maxSize})`);
        return {
            statusCode: 413,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'Request body too large',
                requestId: event.requestContext.requestId,
                timestamp: new Date().toISOString()
            })
        };
    }

    // All validations passed
    return null;
}

/**
 * Validates environment variables required for the function
 * @returns {Object|null} - Returns error response object if validation fails, null if valid
 */
export function validateEnvironmentVariables() {
    if (!process.env.SENDGRID_WEBHOOK_PUBLIC_KEY) {
        console.error("SENDGRID_WEBHOOK_PUBLIC_KEY environment variable is not set");
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'Server configuration error - missing webhook public key',
                timestamp: new Date().toISOString()
            })
        };
    }

    if (!process.env.RAW_INBOUND_EMAIL_BUCKET) {
        console.error("RAW_INBOUND_EMAIL_BUCKET environment variable is not set");
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'Server configuration error - missing S3 bucket name',
                timestamp: new Date().toISOString()
            })
        };
    }

    return null;
}

/**
 * Extracts and validates the boundary from Content-Type header
 * @param {string} contentType - Content-Type header value
 * @returns {string|null} - Returns boundary string or null if invalid
 */
export function extractBoundary(contentType) {
    if (!contentType || !contentType.includes('boundary=')) {
        console.error("Invalid Content-Type header - missing boundary");
        return null;
    }

    const boundary = contentType.replace(/^.*boundary\=/, "");
    if (!boundary) {
        console.error("Failed to extract boundary from Content-Type header");
        return null;
    }

    return boundary;
}
