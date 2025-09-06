/**
 * Email processing module
 * Contains functions for parsing and processing email content
 */

import { S3Client } from "@aws-sdk/client-s3";
import { Readable } from 'stream';
import { Upload } from "@aws-sdk/lib-storage";
import { simpleParser } from 'mailparser';
import multipart from 'parse-multipart-data';

const s3Client = new S3Client({ region: process.env.REGION });

/**
 * processEmail gets messageId (from SNS), timestamp, emailContents, boundary
 * (used to parse emailsContents). Accepts a single record from the SQS queue.
 */
export async function processEmail(messageId, messageTimeStamp, emailContents, boundary) {    
    
    console.log("processEmail called with:");    
    console.log("  messageId:", messageId);
    console.log("  messageTimeStamp:", messageTimeStamp);
    console.log("  emailContents length:", emailContents ? emailContents.length : 'null');
    console.log("  boundary:", boundary);
    
    // messageId used to store the email contents and any attacments to S3
    // Pull out a certain files to include in the snsMessage
    let emailObject = {
        messageId:messageId,
        messageTimeStamp:parseInt(messageTimeStamp),        
        snsObject: {
            messageId:messageId,
            messageTimeStamp:parseInt(messageTimeStamp)
        }
    };

    let emailToParse = Buffer.from(emailContents, 'base64');  
    console.log("Created emailToParse buffer, length:", emailToParse.length);
        
    // Parse the contents of form data into an array using multipart node library
    console.log("About to parse multipart data with boundary:", boundary);
    console.log("emailContents type:", typeof emailContents);
    console.log("emailContents length:", emailContents.length);
    
    // emailContents is already the decoded multipart data (a string), not base64 encoded
    // So we can use it directly for boundary detection and parsing
    console.log("First 200 chars of emailContents:", emailContents.substring(0, 200));        

    // Parse the multipart data using the string directly
    const emailParts = await multipart.parse(emailToParse, boundary);
    console.log("Parsed emailParts, count:", emailParts.length);

    // Log each part for debugging
    emailParts.forEach((part, index) => {
        console.log(`Part ${index}:`, {
            name: part.name,
            filename: part.filename,
            type: part.type,
            dataLength: part.data ? part.data.length : 'undefined'
        });
    });

    // Use map to asynchronously loop through every element of parts array
    let processParts = emailParts.map(async (part) => {
        if(part && part.name !== undefined && part.data !== undefined) {
            // NOT ATTACHMENT, PARSE THE DATA OUT AND PUT INTO OBJECT save to S3
            let name = part.name.toLowerCase();

            // Pull out string from buffer
            let dataString = Buffer.from(part.data).toString();
            
            // Look for raw, full MIME message
            if (name === "email") {
                // Handle the "email" part specifically - parse its MIME content
                console.log("Processing email part with MIME content");
                console.log("Email part data length:", dataString.length);
                
                try {
                    // Use mailparser.js for robust email parsing
                    console.log("Parsing email with mailparser.js...");
                    const parsed = await simpleParser(dataString);
                    
                    console.log("Successfully parsed email with mailparser.js");
                    console.log("Email subject:", parsed.subject);
                    console.log("From:", parsed.from?.text);
                    console.log("To:", parsed.to?.text);
                    console.log("Date:", parsed.date);
                    console.log("Text content length:", parsed.text?.length || 0);
                    console.log("HTML content length:", parsed.html?.length || 0);
                    console.log("Attachments count:", parsed.attachments?.length || 0);
                    
                    // Extract basic email info
                    const emailContentObject = {
                        subject: parsed.subject,
                        from: parsed.from?.text,
                        to: parsed.to?.text,
                        date: parsed.date,
                        messageId: parsed.messageId,
                        inReplyTo: parsed.inReplyTo,
                        references: parsed.references
                    };
                    
                    // Add text content if available
                    if (parsed.text) {
                        emailContentObject["text/plain"] = parsed.text;
                    }
                    
                    // Add HTML content if available
                    if (parsed.html) {
                        emailContentObject["text/html"] = parsed.html;
                    }
                    
                    // Process attachments if any
                    const emailAttachments = [];
                    if (parsed.attachments && parsed.attachments.length > 0) {
                        console.log(`Processing ${parsed.attachments.length} attachments...`);
                        
                        for (const attachment of parsed.attachments) {
                            console.log("Processing attachment:", {
                                filename: attachment.filename,
                                contentType: attachment.contentType,
                                size: attachment.size,
                                contentId: attachment.contentId
                            });
                            
                            if (attachment.filename) {
                                // Save attachment to S3
                                let bucket = process.env.SENDGRID_INBOUND_PARSE_BUCKET;
                                let key = `${messageId}/email-attachments/${attachment.filename}`;
                                
                                try {
                                    let attachmentStream = Readable.from(attachment.content);
                                    
                                    let parallelUploads3 = new Upload({
                                        client: s3Client,
                                        params: { 
                                            Bucket: bucket, 
                                            Key: key, 
                                            Body: attachmentStream,
                                            ContentType: attachment.contentType || 'application/octet-stream'
                                        }          
                                    });
                                    
                                    parallelUploads3.on("httpUploadProgress", (progress) => {
                                        console.log("Upload progress:", progress);
                                    });
                                    
                                    await parallelUploads3.done();
                                    console.log("Successfully saved email attachment:", attachment.filename);
                                    
                                    // Add to attachments list
                                    emailAttachments.push({
                                        filename: attachment.filename,
                                        type: attachment.contentType || 'application/octet-stream',
                                        key: key,
                                        size: attachment.size,
                                        contentId: attachment.contentId
                                    });
                                    
                                } catch (e) {
                                    console.log("Error saving email attachment:", attachment.filename, e);
                                }
                            } else if (attachment.contentId) {
                                // Handle inline attachments (embedded images, etc.)
                                console.log("Found inline attachment with contentId:", attachment.contentId);
                                emailAttachments.push({
                                    contentId: attachment.contentId,
                                    type: attachment.contentType || 'application/octet-stream',
                                    size: attachment.size
                                });
                            }
                        }
                    }
                    
                    // Store the parsed email content and attachments
                    emailObject["emailContent"] = emailContentObject;
                    emailObject["emailAttachments"] = emailAttachments;
                    
                    console.log("Final emailContentObject keys:", Object.keys(emailContentObject));
                    console.log("Final emailAttachments count:", emailAttachments.length);
                    
                    // Add attachments count to SNS object
                    emailObject.snsObject["attachments"] = emailAttachments.length;
                    
                    // Add content types to SNS object for downstream processing
                    const contentTypes = [];
                    if (parsed.text) contentTypes.push("text/plain");
                    if (parsed.html) contentTypes.push("text/html");
                    emailObject.snsObject["contentTypes"] = contentTypes;
                    
                    // Add key email metadata to SNS object
                    if (parsed.subject) emailObject.snsObject["subject"] = parsed.subject;
                    if (parsed.from?.text) emailObject.snsObject["from"] = parsed.from.text;
                    if (parsed.to?.text) emailObject.snsObject["to"] = parsed.to.text;
                    
                } catch (parseError) {
                    console.log("Error parsing email with mailparser.js:", parseError);
                    console.log("Falling back to manual parsing...");
                    
                    // Fallback to manual parsing for edge cases
                    try {
                        const fallbackResult = await manualEmailParse(dataString);
                        emailObject["emailContent"] = fallbackResult.emailContent;
                        emailObject["emailAttachments"] = fallbackResult.attachments;
                        emailObject.snsObject["contentTypes"] = fallbackResult.contentTypes;
                        emailObject.snsObject["attachments"] = fallbackResult.attachments.length;
                    } catch (fallbackError) {
                        console.log("Fallback parsing also failed:", fallbackError);
                        // Last resort: treat as plain text
                        emailObject["emailContent"] = { "text/plain": dataString };
                        emailObject.snsObject["contentTypes"] = ["text/plain"];
                    }
                }
                
            } else { // no email -- save data name
                console.log("Saving data for name:", name);
                // Pull out specific key values to include in SNS message
                // Keeps the size of the SNS message low (include what you need)                    
                if (["to", "from", "subject", "attachments"].includes(name)) {
                    emailObject.snsObject[name] = dataString;
                }
                
                // Put every element into the parent object to be saved to S3
                emailObject[name] = dataString;
            }
        }        
    }); // processParts map
    
    // Wait for everything to process...
    await Promise.all(processParts);

    return emailObject;
}

/**
 * Fallback manual email parsing function for edge cases
 */
export async function manualEmailParse(emailData) {
    console.log("Using manual email parsing fallback");
    
    const emailContentObject = {};
    const attachments = [];
    const contentTypes = [];
    
    // Find the boundary in the email content
    const boundaryMatch = emailData.match(/boundary=["']([^"']+)["']/);
    
    if (boundaryMatch) {
        const emailBoundary = boundaryMatch[1];
        console.log("Found email boundary:", emailBoundary);
        
        // Split the content by the boundary
        const boundaryDelimiter = `--${emailBoundary}`;
        const emailParts = emailData.split(boundaryDelimiter);
        console.log("Split email content into", emailParts.length, "parts");
        
        for (let i = 0; i < emailParts.length; i++) {
            const emailPart = emailParts[i].trim();
            
            if (!emailPart) continue;
            
            // Parse the part headers and content
            const headerEndIndex = emailPart.indexOf('\r\n\r\n');
            if (headerEndIndex === -1) {
                console.log("No header separator found in part, skipping");
                continue;
            }
            
            const headers = emailPart.substring(0, headerEndIndex);
            const content = emailPart.substring(headerEndIndex + 4);
            
            // Check if this is the first part (index 0) which contains email headers
            if (i === 0) {
                console.log("Processing first part - extracting email headers");
                emailContentObject["header"] = content;
                continue;
            }
            
            // Extract content type and filename from headers
            const contentTypeMatch = headers.match(/Content-Type:\s*([^;\r\n]+)/i);
            const filenameMatch = headers.match(/filename=["']([^"']+)["']/i);
            const contentDispositionMatch = headers.match(/Content-Disposition:\s*([^\r\n]+)/i);
            
            let contentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'text/plain';
            
            // Clean up content type (remove charset and other parameters)
            if (contentType.includes(';')) {
                contentType = contentType.split(';')[0].trim();
            }
            
            const filename = filenameMatch ? filenameMatch[1] : null;
            const isAttachment = contentDispositionMatch && contentDispositionMatch[1].toLowerCase().includes('attachment');
            
            if (filename && isAttachment) {
                // This is an attachment - handle in the main function
                console.log("Found attachment in fallback parsing:", filename);
                attachments.push({
                    filename: filename,
                    type: contentType,
                    content: content
                });
            } else {
                // This is email content
                let cleanContent = content.trim();
                
                // Remove any trailing boundary markers
                if (cleanContent.includes('--')) {
                    cleanContent = cleanContent.split('--')[0].trim();
                }
                
                // Handle different encodings
                const isBase64 = headers.includes('Content-Transfer-Encoding: base64');
                const isQuotedPrintable = headers.includes('Content-Transfer-Encoding: quoted-printable');
                
                if (isBase64) {
                    try {
                        cleanContent = Buffer.from(cleanContent, 'base64').toString('utf8');
                    } catch (e) {
                        console.log("Base64 decoding failed in fallback:", e);
                    }
                } else if (isQuotedPrintable) {
                    cleanContent = cleanContent.replace(/=\r\n/g, '').replace(/=\n/g, '');
                    cleanContent = cleanContent.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
                        return String.fromCharCode(parseInt(hex, 16));
                    });
                }
                
                emailContentObject[contentType] = cleanContent;
                if (!contentTypes.includes(contentType)) {
                    contentTypes.push(contentType);
                }
            }
        }
    } else {
        // No boundary found, treat as plain text
        console.log("No boundary found in email part, treating as plain text");
        emailContentObject["text/plain"] = emailData;
        contentTypes.push("text/plain");
    }
    
    return {
        emailContent: emailContentObject,
        attachments: attachments,
        contentTypes: contentTypes
    };
}
