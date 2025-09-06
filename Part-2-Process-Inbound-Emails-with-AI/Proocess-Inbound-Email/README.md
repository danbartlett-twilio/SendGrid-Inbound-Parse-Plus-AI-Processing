# Process Inbound Emails with AI

This AWS SAM application contains a Lambda function that processes inbound emails using AWS Bedrock for AI-powered categorization and summarization.

## Overview

The `FirstPassFunction` Lambda is triggered by SNS messages from the inbound email processing pipeline. It:

1. **Retrieves email data** from S3 using the messageId from the SNS event
2. **Categorizes the email** using AWS Bedrock Claude into one of four categories:
   - `sales` - Sales-related inquiries
   - `support` - Technical support requests
   - `account` - Account management issues
   - `inquiry` - General inquiries
3. **Summarizes the email** content using AWS Bedrock Claude
4. **Publishes events** to EventBridge for category-specific processing
5. **Returns structured results** with categorization and summary data

## EventBridge Integration

After processing an email, the system publishes an event to the `EmailProcessingEventBus` EventBridge. This event is then routed to the appropriate category-specific Lambda function:

- **Sales emails** → `SalesEmailHandler`
- **Support emails** → `SupportEmailHandler`
- **Account emails** → `AccountEmailHandler`
- **Inquiry emails** → `InquiryEmailHandler`

Each category handler is currently a placeholder that logs the received event and can be extended with specific business logic.

## Architecture

```
SNS Topic → FirstPassFunction → S3 (retrieve email.json) → Bedrock (categorize & summarize) → EventBridge → Category Handlers
```

### Event Flow

1. **SNS Event** triggers `FirstPassFunction`
2. **FirstPassFunction** retrieves email from S3 and processes with Bedrock
3. **EventBridge Event** is published with categorization results
4. **EventBridge Rules** route events to appropriate category handlers
5. **Category Handlers** process emails based on their specific category

## Files

### First Pass Processing
- `lambdas/first-pass/app.mjs` - Main Lambda handler
- `lambdas/first-pass/s3-operations.mjs` - S3 operations for retrieving email data
- `lambdas/first-pass/bedrock-operations.mjs` - Bedrock operations for AI processing
- `lambdas/first-pass/eventbridge-operations.mjs` - EventBridge operations for publishing events
- `lambdas/first-pass/package.json` - Node.js dependencies

### Category Handlers
- `lambdas/sales-handler/` - Sales email handler (placeholder)
- `lambdas/support-handler/` - Support email handler (placeholder)
- `lambdas/account-handler/` - Account email handler (placeholder)
- `lambdas/inquiry-handler/` - Inquiry email handler (placeholder)

### Infrastructure
- `template.yaml` - CloudFormation template

## Dependencies

- `@aws-sdk/client-s3` - For S3 operations
- `@aws-sdk/client-bedrock-runtime` - For Bedrock AI operations
- `@aws-sdk/client-eventbridge` - For EventBridge operations

## Environment Variables

- `REGION` - AWS region
- `SENDGRID_INBOUND_PARSE_BUCKET` - S3 bucket containing email data
- `EMAIL_PROCESSING_EVENT_BUS` - EventBridge event bus name

## IAM Permissions

The Lambda functions require:
- **FirstPassFunction**: S3 read access, Bedrock invoke model permissions, EventBridge put events permissions
- **Category Handlers**: Basic Lambda execution permissions (EventBridge invokes them)

## Response Format

The function returns a structured response:

```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "message": "Email processed successfully",
    "data": {
      "messageId": "uuid",
      "originalEmail": {
        "from": "sender@example.com",
        "to": "recipient@example.com",
        "subject": "Email Subject",
        "timestamp": 1234567890
      },
      "categorization": {
        "category": "support",
        "confidence": 0.95,
        "reasoning": "User is asking for technical help"
      },
      "summary": {
        "summary": "Brief summary of email content",
        "wordCount": 25
      },
      "processedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## Deployment

Deploy using AWS SAM:

```bash
sam build
sam deploy --guided
```

## Configuration

Ensure the following CloudFormation exports exist from Part 1:
- `SGInboundEmailTopicARN` - SNS topic ARN
- `SGInboundParseBucketName` - S3 bucket name