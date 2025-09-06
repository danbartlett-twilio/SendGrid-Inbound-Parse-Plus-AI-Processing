# Generic Inbound Email Event Handler

A simple AWS Lambda function that receives SNS events after the Inbound Email Store stack finishes processing inbound emails. This stack deploys separately from the main email processing stack and provides a foundation for implementing custom business logic.

## Overview

This component serves as a downstream processor in the email handling pipeline, where you can implement your specific business logic for:
- Email summarization and analysis via AI
- Content categorization and routing
- Custom notification workflows
- Integration with external systems

## Prerequisites

- AWS CLI configured with appropriate permissions
- AWS SAM CLI installed
- Node.js runtime environment
- The `Inbound-Email-Store` stack must be deployed first

## Architecture

```
SNS Topic → Generic Event Handler Lambda → Your Business Logic
```

The handler receives structured email metadata from the SNS topic and provides a clean interface for implementing custom email processing logic.

## Deployment

### 1. Build the Application

```bash
sam build
```

**Note:** Run this command from the `Generic-Inbound-Event-Handler` directory every time before deploying.

### 2. Configure AWS Profile

Ensure your AWS profile is configured in the `../../aws-profile.profile` file, or modify the deploy commands to use your preferred authentication method.

### 3. Deploy the Stack

#### First Time Deployment (Guided)

```bash
sam deploy --guided \
  --stack-name GENERIC-INBOUND-EMAIL-EVENT-HANDLER \
  --template template.yaml \
  --profile $(cat ../../aws-profile.profile) \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides $(cat ../../global.properties | tr '\n' ' ')
```

#### Subsequent Deployments

```bash
sam deploy \
  --stack-name GENERIC-INBOUND-EMAIL-EVENT-HANDLER \
  --template template.yaml \
  --profile $(cat ../../aws-profile.profile) \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides $(cat ../../global.properties | tr '\n' ' ')
```

## Configuration

The deployment uses parameters from the `../../global.properties` file. Ensure this file contains all required configuration values before deployment.

## Usage

Once deployed, this handler will automatically process SNS messages containing email metadata. The handler receives:

- **Message ID**: Unique identifier for the processed email
- **Timestamp**: When the email was received
- **Subject**: Email subject line
- **From/To**: Sender and recipient information
- **Content Types**: Available content formats (text/plain, text/html)
- **Attachment Count**: Number of attachments processed

## Customization

Modify the `lambdas/generic-handler/app.mjs` file to implement your specific business logic:

```javascript
export const lambdaHandler = async (event) => {
    // Process each SNS message
    for (const record of event.Records) {
        const message = JSON.parse(record.Sns.Message);
        
        // Your custom logic here
        console.log('Processing email:', message.messageId);
        
        // Example: Route based on subject
        if (message.subject?.includes('urgent')) {
            // Handle urgent emails
        }
        
        // Example: Process attachments
        if (message.attachments > 0) {
            // Handle emails with attachments
        }
    }
};
```

## File Structure

```
Generic-Inbound-Event-Handler/
├── lambdas/
│   └── generic-handler/               # Main Lambda function
│       ├── app.mjs                    # Lambda handler code
│       └── package.json               # Dependencies
├── template.yaml                      # SAM template
└── samconfig.toml                     # SAM configuration
```

## Monitoring

Monitor the handler's performance through:
- **CloudWatch Logs**: Function execution logs
- **CloudWatch Metrics**: Performance and error metrics
- **X-Ray tracing**: Request tracing (if enabled)

## Troubleshooting

### Common Issues

1. **Deployment Fails**: Ensure the parent `Inbound-Email-Store` stack is deployed first
2. **Permission Errors**: Verify your AWS profile has sufficient IAM permissions
3. **Parameter Errors**: Check that `../../global.properties` contains all required values
4. **SNS Not Receiving Messages**: Verify the SNS topic ARN matches the parent stack

### Log Locations

- **Lambda Function**: CloudWatch Logs → `/aws/lambda/GENERIC-INBOUND-EMAIL-EVENT-HANDLER`

## Support

For issues or questions:
1. Check CloudWatch logs for error details
2. Review this documentation
3. Create an issue in the project repository