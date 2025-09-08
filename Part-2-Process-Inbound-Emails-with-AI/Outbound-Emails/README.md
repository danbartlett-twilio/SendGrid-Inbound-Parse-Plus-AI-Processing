# Outbound Emails

A serverless microservice for sending outbound emails via SendGrid's Email API. This service receives email events from SNS topics and processes them to send formatted emails through SendGrid's delivery infrastructure.

## Overview

This application creates a complete outbound email processing system that:
- Receives email events via SNS topic subscriptions
- Configures email message objects with proper formatting
- Sends emails through SendGrid's Email API
- Handles delivery confirmations and error responses
- Provides IAM policies for external applications to publish email events

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   External      │    │   SNS Topic     │    │   Lambda        │    │   SendGrid      │
│ Applications    │───▶│ (Email Events)  │───▶│ (Send Outbound  │───▶│   Email API     │
│                 │    │                 │    │  Email)         │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Components

- **SNS Topic**: Receives email events from internal and external applications
- **IAM Policy**: Allows external applications to publish to the email event topic
- **SendOutboundEmailFunction**: Processes email events and sends via SendGrid API
- **SendGrid Integration**: Direct API integration for email delivery

## Prerequisites

- AWS CLI configured with appropriate permissions
- AWS SAM CLI installed
- Node.js runtime environment
- SendGrid account with API key configured
- **Important**: The `Shared-Layers` stack must be deployed first

## Deployment Order

**⚠️ CRITICAL**: Deploy stacks in this order:
1. ✅ `Shared-Layers` stack (must be deployed first)
2. ✅ `Outbound-Emails` stack (this stack)
3. ⏳ `Process-Inbound-Email` stack (deploy after this stack)

## Setup Instructions

### 1. Configure SendGrid

1. **Create SendGrid API Key**:
   - Log into your SendGrid account
   - Navigate to **Settings** → **API Keys**
   - Create a new API key with "Mail Send" permissions
   - Copy the API key for configuration

2. **Configure Domain Authentication**:
   - Set up domain authentication in SendGrid
   - Note your verified domain name

### 2. Update Configuration

Edit the `../../global.properties` file with your SendGrid configuration:

```properties
# SendGrid API Key ID (from AWS Secrets Manager or Parameter Store)
SendGridOutboundEmailApiKeyId="your-sendgrid-api-key-id"

# SendGrid verified domain name
SendGridOutboundEmailDomainName="yourdomain.com"

# AWS region for deployment
AWSRegion="us-east-1"
```

### 3. Build the Application

```bash
sam build
```

**Note:** Run this command from the `Outbound-Emails` directory every time before deploying.

### 4. Configure AWS Profile

Ensure your AWS profile is configured in the `../../aws-profile.profile` file, or modify the deploy commands to use your preferred authentication method.

### 5. Deploy the Stack

#### First Time Deployment (Guided)

```bash
sam deploy --guided \
  --stack-name SENDGRID-OUTBOUND-EMAILS \
  --template template.yaml \
  --profile $(cat ../../aws-profile.profile) \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides $(cat ../../global.properties | tr '\n' ' ')
```

#### Subsequent Deployments

```bash
sam deploy \
  --stack-name SENDGRID-OUTBOUND-EMAILS \
  --template template.yaml \
  --profile $(cat ../../aws-profile.profile) \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides $(cat ../../global.properties | tr '\n' ' ')
```

## Lambda Functions

### SendOutboundEmailFunction

**Purpose**: Processes SNS email events and sends emails via SendGrid API.

**Features**:
- Receives email events from SNS topic
- Configures message objects with proper formatting
- Handles SendGrid API integration
- Manages delivery confirmations and errors
- Uses S3 operations layer for data handling

**Environment Variables**:
- `SENDGRID_API_KEY_ID`: SendGrid API key identifier
- `SENDGRID_OUTBOUND_EMAIL_DOMAIN_NAME`: Verified domain name

**Timeout**: 30 seconds
**Memory**: 256 MB
**Architecture**: ARM64

## SNS Topic Configuration

### SendGridOutboundEmailEventTopic

**Purpose**: Central topic for email events to be processed.

**Features**:
- Receives email events from multiple sources
- Triggers Lambda function for processing
- Supports high-volume email processing
- Provides reliable message delivery

### IAM Policy

**TwilioSendGridEmailEventTopicPolicy**: Managed policy that allows external applications to publish email events to the SNS topic.

**Permissions**:
- `sns:Publish` on the email event topic

## File Structure

```
Outbound-Emails/
├── lambdas/
│   └── send-outbound-email/           # Main Lambda function
│       ├── app.mjs                    # Lambda handler
│       ├── configure-message-object.mjs # Email formatting logic
│       ├── send-email-via-sendgrid.mjs # SendGrid API integration
│       └── package.json               # Dependencies
├── template.yaml                      # SAM template
└── README.md                          # This file
```

## Email Event Format

The SNS topic expects email events in the following format:

```json
{
  "to": "recipient@example.com",
  "from": "sender@yourdomain.com",
  "subject": "Email Subject",
  "text": "Plain text content",
  "html": "<p>HTML content</p>",
  "attachments": [
    {
      "content": "base64-encoded-content",
      "filename": "document.pdf",
      "type": "application/pdf"
    }
  ],
  "customArgs": {
    "messageId": "unique-message-id",
    "category": "notification"
  }
}
```

## Usage Examples

### Publishing Email Events

External applications can publish email events using the provided IAM policy:

```javascript
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const sns = new SNSClient({ region: "us-east-1" });

const emailEvent = {
  to: "customer@example.com",
  from: "support@yourdomain.com",
  subject: "Welcome to our service",
  text: "Thank you for signing up!",
  html: "<h1>Welcome!</h1><p>Thank you for signing up!</p>"
};

await sns.send(new PublishCommand({
  TopicArn: "arn:aws:sns:us-east-1:123456789012:SendGridOutboundEmailEventTopic",
  Message: JSON.stringify(emailEvent)
}));
```

### Integration with Process-Inbound-Email

The Process-Inbound-Email stack can publish email events to trigger outbound responses:

```javascript
// In a category handler (e.g., support-handler)
import { publishEmailEvent } from '/opt/eventbridge-operations.mjs';

const responseEmail = {
  to: originalEmail.from,
  from: "support@yourdomain.com",
  subject: `Re: ${originalEmail.subject}`,
  text: "Thank you for your inquiry. We'll respond within 24 hours.",
  html: "<p>Thank you for your inquiry. We'll respond within 24 hours.</p>"
};

await publishEmailEvent(responseEmail);
```

## Outputs

The stack exports the following values for use by other stacks:

- **TwilioSendGridEmailEventTopic**: SNS topic name for email events
- **TwilioSendGridEmailEventTopicARN**: SNS topic ARN for email events
- **TwilioSendGridEmailEventTopicPolicy**: IAM policy ARN for external access

## Security Features

- **API Key Management**: SendGrid API keys stored securely in AWS
- **IAM Least Privilege**: Minimal required permissions for all components
- **Domain Authentication**: Verified domain ensures email deliverability
- **Input Validation**: Email content validation and sanitization

## Monitoring

Monitor the system through:
- **CloudWatch Logs**: Function execution logs
- **CloudWatch Metrics**: Performance and error metrics
- **SNS Metrics**: Message processing statistics
- **SendGrid Dashboard**: Email delivery statistics

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Verify the `Shared-Layers` stack is deployed first
   - Check that SendGrid API key is properly configured
   - Ensure domain name is verified in SendGrid

2. **Email Delivery Failures**
   - Verify SendGrid API key has correct permissions
   - Check domain authentication status
   - Review CloudWatch logs for specific error messages

3. **SNS Topic Not Receiving Messages**
   - Verify IAM policy is attached to publishing applications
   - Check SNS topic ARN is correct
   - Review SNS access logs

### Log Locations

- **Lambda Function**: CloudWatch Logs → `/aws/lambda/SendOutboundEmailFunction`
- **SNS Topic**: CloudWatch Metrics → SNS
- **SendGrid**: SendGrid Dashboard → Activity

## Cost Optimization

- **Serverless Architecture**: Pay only for actual email processing
- **Efficient Memory**: Optimized memory allocation for email processing
- **SNS Filtering**: Reduce processing costs with message filtering
- **SendGrid Volume Pricing**: Leverage SendGrid's volume discounts

## Support

For issues or questions:
1. Check CloudWatch logs for error details
2. Review SendGrid dashboard for delivery issues
3. Verify SNS topic configuration and permissions
4. Create an issue in the project repository

## Next Steps

After successful deployment:
1. Deploy the `Process-Inbound-Email` stack to complete the pipeline
2. Test email sending functionality
3. Configure external applications to publish email events
4. Set up monitoring and alerting for email delivery
5. Implement email templates and personalization features