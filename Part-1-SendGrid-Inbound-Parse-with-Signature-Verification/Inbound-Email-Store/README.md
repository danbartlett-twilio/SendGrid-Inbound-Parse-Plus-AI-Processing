# Inbound Email Store

A comprehensive AWS serverless solution for processing inbound emails from SendGrid's Inbound Parse webhook. This system provides secure email reception, parsing, storage, and processing capabilities with signature verification.

## Overview

This application creates a complete email processing pipeline that:
- Receives emails via SendGrid Inbound Parse webhook
- Validates email signatures for security
- Parses email content and attachments
- Stores processed data in S3
- Publishes metadata to SNS for downstream processing

## Architecture

```
SendGrid → API Gateway → Lambda (inbound-email-to-s3) → S3
                                    ↓
                              SQS Queue → Lambda (handle-sqs-messages) → S3 + SNS
```

### Components

- **API Gateway**: Receives webhook calls from SendGrid
- **inbound-email-to-s3**: Validates signatures and stores raw emails
- **SQS Queue**: Buffers email processing requests
- **handle-sqs-messages**: Parses emails and extracts attachments
- **S3 Buckets**: Store raw emails, parsed data, and attachments
- **SNS Topic**: Publishes email metadata for downstream processing

## Prerequisites

- AWS CLI configured with appropriate permissions
- AWS SAM CLI installed
- Node.js runtime environment
- SendGrid account with Inbound Parse configured
- Unique S3 bucket name for email storage

## Setup Instructions

### 1. Install Dependencies

Install required Node.js libraries for the Lambda layers:

```bash
npm --prefix ./layers/layer-parse-multipart-data/nodejs install
npm --prefix ./layers/layer-validate-signature install
```

### 2. Create S3 Bucket

Create a new S3 bucket to store inbound emails:

```bash
# Using AWS CLI
aws s3 mb s3://your-unique-bucket-name

# Or create via AWS Console
```

**Important:** S3 bucket names must be globally unique. Choose a descriptive name like `your-company-inbound-emails-2024`.

### 3. Configure SendGrid Webhook Public Key

1. Log into your SendGrid account
2. Navigate to **Settings** → **Mail Settings** → **Inbound Parse**
3. Copy the webhook public key (starts with `MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...`)
4. Add it to your `../../global.properties` file:

```properties
SendGridWebhookPublicKey="YOUR_SENDGRID_WEBHOOK_PUBLIC_KEY_HERE"
```

### 4. Update Configuration

Edit the `../../global.properties` file with your specific values:

```properties
S3BucketName="your-unique-bucket-name"
SendGridWebhookPublicKey="YOUR_SENDGRID_WEBHOOK_PUBLIC_KEY_HERE"
# Add other required parameters
```

## Deployment

### 1. Build the Application

```bash
sam build
```

**Note:** Run this command from the `Inbound-Email-Store` directory every time before deploying.

### 2. Configure AWS Profile

Ensure your AWS profile is configured in the `../../aws-profile.profile` file, or modify the deploy commands to use your preferred authentication method.

### 3. Deploy the Stack

#### First Time Deployment (Guided)

```bash
sam deploy --guided \
  --stack-name INBOUND-EMAIL-STORE \
  --template template.yaml \
  --profile $(cat ../../aws-profile.profile) \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides $(cat ../../global.properties | tr '\n' ' ')
```

#### Subsequent Deployments

```bash
sam deploy \
  --stack-name INBOUND-EMAIL-STORE \
  --template template.yaml \
  --profile $(cat ../../aws-profile.profile) \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides $(cat ../../global.properties | tr '\n' ' ')
```

## Post-Deployment Configuration

### 1. Configure SendGrid Inbound Parse Webhook

1. After successful deployment, note the API Gateway endpoint from the stack outputs
2. In SendGrid, go to **Settings** → **Mail Settings** → **Inbound Parse**
3. Create a new inbound parse setting:
   - **Hostname**: Your domain (e.g., `mail.yourdomain.com`)
   - **URL**: The API Gateway endpoint from your stack output
   - **Spam Check**: Enable if desired
   - **Send Raw**: Enable to receive full email content

### 2. Deploy Downstream Handler

After deploying this stack, deploy the `Generic-Inbound-Event-Handler` stack to process the SNS messages:

```bash
cd ../Generic-Inbound-Event-Handler
sam build
sam deploy --guided
```

## File Structure

```
Inbound-Email-Store/
├── lambdas/
│   ├── inbound-email-to-s3/          # Webhook receiver and validator
│   └── handle-sqs-messages/          # Email processor and parser
├── layers/
│   ├── layer-parse-multipart-data/   # Multipart parsing utilities
│   └── layer-validate-signature/     # SendGrid signature validation
├── template.yaml                     # SAM template
└── samconfig.toml                    # SAM configuration
```

## Lambda Functions

### inbound-email-to-s3
- **Purpose**: Receives webhook calls from SendGrid
- **Features**: 
  - Signature validation
  - Input sanitization
  - Raw email storage to S3
  - SQS message queuing

### handle-sqs-messages
- **Purpose**: Processes queued email messages
- **Features**:
  - Email parsing with mailparser.js
  - Attachment extraction and storage
  - Metadata extraction
  - SNS message publishing

## Data Storage

### S3 Structure
```
your-bucket/
├── {messageId}/
│   ├── email.json                    # Parsed email data
│   └── email-attachments/            # Extracted attachments
│       ├── attachment1.pdf
│       └── attachment2.jpg
└── raw-emails/                       # Raw email storage
    └── {timestamp}-{messageId}.eml
```

### SNS Message Format
```json
{
  "messageId": "unique-message-id",
  "messageTimeStamp": 1640995200000,
  "subject": "Email Subject",
  "from": "sender@example.com",
  "to": "recipient@example.com",
  "attachments": 2,
  "contentTypes": ["text/plain", "text/html"]
}
```

## Security Features

- **Signature Validation**: Verifies emails are from SendGrid
- **Input Sanitization**: Prevents injection attacks
- **IAM Roles**: Least-privilege access patterns
- **VPC Integration**: Optional network isolation

## Monitoring

Monitor the system through:
- **CloudWatch Logs**: Function execution logs
- **CloudWatch Metrics**: Performance and error metrics
- **S3 Access Logs**: Storage access patterns
- **SNS Metrics**: Message publishing statistics

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Verify AWS credentials and permissions
   - Check that S3 bucket name is unique
   - Ensure all required parameters are in `../../global.properties`

2. **Webhook Not Receiving Emails**
   - Verify SendGrid inbound parse configuration
   - Check API Gateway endpoint URL
   - Review CloudWatch logs for errors

3. **Signature Validation Failures**
   - Verify SendGrid webhook public key is correct
   - Check that the key is properly formatted in `../../global.properties`

4. **Email Processing Errors**
   - Review SQS queue for failed messages
   - Check Lambda function logs
   - Verify S3 bucket permissions

### Log Locations

- **API Gateway**: CloudWatch Logs → API Gateway
- **Lambda Functions**: CloudWatch Logs → `/aws/lambda/{function-name}`
- **SQS**: CloudWatch Metrics → SQS

## Cost Optimization

- **S3 Lifecycle Policies**: Automatically archive old emails
- **Lambda Concurrency**: Configure appropriate limits
- **SNS Filtering**: Reduce downstream processing costs

## Support

For issues or questions:
1. Check CloudWatch logs for error details
2. Review this documentation
3. Create an issue in the project repository

## Next Steps

After successful deployment:
1. Configure your domain's MX records to point to SendGrid
2. Test email delivery to your configured address
3. Implement custom business logic in the Generic Event Handler
4. Set up monitoring and alerting