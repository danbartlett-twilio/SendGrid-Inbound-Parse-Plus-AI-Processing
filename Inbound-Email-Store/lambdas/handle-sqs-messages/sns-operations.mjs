/**
 * SNS operations module
 * Contains functions for publishing messages to SNS
 */

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({ region: process.env.REGION });

/**
 * Publish a smaller set of parameters to SNS for
 * additional processing. The messageId can be used 
 * to access email.json file with ALL details plus
 * an file attachments.
 */
export async function publishToSNS(snsObject) {
    // Object to send to SNS
    let params = {
        Message: JSON.stringify(snsObject),            
        TopicArn: process.env.SNStopic
    };
    
    // Send to SNS
    try {            
        await snsClient.send(new PublishCommand(params));                
        console.log(`Successfully published message to SNS topic: ${snsObject.messageId}`);
    } catch (err) {
        console.log("Error publishing processed email to Topic!", err.stack);
        throw err; // Re-throw to allow caller to handle
    }         
    
    return true;
}
