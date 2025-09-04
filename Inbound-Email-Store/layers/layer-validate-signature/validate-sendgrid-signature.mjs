/**
 * validate-sendgrid-signatire
 * 
 * helper function to validate twilio sendgrid signature
 * to be sure that request is coming from twilio sendgrid.
 * Calculation reliant on secret "webhook public key".
 * 
 * This code roughly pulled from this document:
 * https://www.twilio.com/docs/serverless/functions-assets/quickstart/validate-webhook-requests-from-sendgrid
 * 
 */
import { EventWebhook } from '@sendgrid/eventwebhook';

async function validateSendGridSignature (payload, signature, timestamp, publicKey) {
  
  console.log("validateSendGridSignature: signature: ", signature);
  console.log("validateSendGridSignature: timestamp: ", timestamp);
  console.log("payload type: ", typeof payload);
  console.log("payload length: ", payload.length);

  try {
    
  // Initialize a new SendGrid EventWebhook to expose helpful request validation methods
  const eventWebhook = new EventWebhook();
  
  // Convert the public key string into an ECPublicKey
  const ecPublicKey = eventWebhook.convertPublicKeyToECDSA(publicKey);

  // Ensure payload is in the correct format for validation
  let validationPayload = payload;
  
  // If payload is base64 string, convert to buffer for validation
  if (typeof payload === 'string' && payload.length > 0) {
    try {
      // Try to decode as base64 first
      validationPayload = Buffer.from(payload, 'base64');
      console.log("Converted base64 string to buffer for validation");
    } catch (e) {
      // If not base64, use as-is
      validationPayload = payload;
      console.log("Using payload as-is for validation");
    }
  }

  // Use the sendgrid library to return true or false
  return eventWebhook.verifySignature(
    ecPublicKey,
    validationPayload, // could be a string or a buffer
    signature,
    timestamp
  );

  } catch (error) {
    console.log("validateSendGridSignature: error: ", error);
    return false;      
  }


};

export { validateSendGridSignature }
