/**
 * EventBridge operations module
 * Contains functions for publishing events to EventBridge
 */

import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";

const eventBridgeClient = new EventBridgeClient({ region: process.env.REGION });

/**
 * Publishes an email categorization event to EventBridge
 * @param {Object} processingResult - The complete processing result from the first-pass lambda
 * @returns {Object} EventBridge response
 */
export async function publishEmailCategorizedEvent(processingResult) {
    const event = {
        Source: "email.processing",
        DetailType: "Email Categorized",
        Detail: JSON.stringify(processingResult),
        EventBusName: process.env.EMAIL_PROCESSING_EVENT_BUS,
        Time: new Date()
    };

    const command = new PutEventsCommand({
        Entries: [event]
    });

    try {
        console.log("Publishing email categorized event to EventBridge:", JSON.stringify(event, null, 2));
        const response = await eventBridgeClient.send(command);
        console.log("EventBridge response:", JSON.stringify(response, null, 2));
        return response;
    } catch (err) {
        console.error("Error publishing event to EventBridge:", err.stack);
        throw err;
    }
}
