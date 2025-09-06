/**
 *  generic-handler
 * 
 * This is a simple Lambda function that is invoked by SNS messages.
 * Build off of this lambda function to meet your business requirements.
 */

export const lambdaHandler = async (event) => {
    
    let messageBody = JSON.parse(event.Records[0].Sns.Message);

    console.info("EVENT\n" + JSON.stringify(event, null, 2));    
    console.info("Message\n" + JSON.stringify(messageBody, null, 2));
    /** 
     * Event Message will lok something like...
        {
            "messageId": "99c2dd84-17e5-49f2-b53b-c5fd0ed186c8",
            "messageTimeStamp": 1756963710407,
            "to": "someone@your-inbound-domain.com",
            "from": "\"Dan Bartlett\" <dan@some-email.com>",
            "subject": "test 1",
            "attachments": 0,
            "contentTypes": [
                "text/plain",
                "text/html"
            ]
        }

     */

    /**
     * What next?
     * 
     * => Categorize the email with AI (support, sales, question, account, inquiry, etc.)
     * => Decide if further processing is needed or warranted  -- should we proccess with AI?
     * => Summarize the email and any attachments with AI
     * => Send a response to the sender 
     * => Route the email to the appropriate team or person
     * => Send a response to the sender
     * => Update your CDP or CRM
     * => Whatever else your business requires!
     * 
     */

};