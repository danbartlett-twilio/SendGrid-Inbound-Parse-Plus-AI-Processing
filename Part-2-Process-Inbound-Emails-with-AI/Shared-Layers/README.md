# Shared Layers

A collection of reusable AWS Lambda layers that provide common functionality for email processing operations across the Part-2 microservices. These layers contain shared code for S3 operations and EventBridge event publishing.

## Overview

This stack creates two Lambda layers that encapsulate common operations used by multiple Lambda functions in the email processing pipeline:

- **S3 Operations Layer**: Common S3 read/write operations for email data
- **EventBridge Operations Layer**: Event publishing and routing operations

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐
│   S3 Operations     │    │ EventBridge         │
│      Layer          │    │ Operations Layer    │
│                     │    │                     │
│ • Read email data   │    │ • Publish events    │
│ • Write results     │    │ • Route messages    │
│ • Handle errors     │    │ • Manage routing    │
└─────────────────────┘    └─────────────────────┘
           │                           │
           └───────────────────────────┘
                       │
              ┌─────────────────┐
              │ Lambda Functions│
              │ (Consumers)     │
              └─────────────────┘
```

## Prerequisites

- AWS CLI configured with appropriate permissions
- AWS SAM CLI installed
- Node.js runtime environment
- **Important**: This stack must be deployed FIRST before any other Part-2 stacks

## Deployment Order

**⚠️ CRITICAL**: This stack must be deployed before:
1. `Outbound-Emails` stack
2. `Process-Inbound-Email` stack

The other stacks depend on the layer ARNs exported by this stack.

## Setup Instructions

### 1. Install Dependencies

Install required Node.js libraries for each layer:

```bash
# Install S3 operations dependencies
npm --prefix ./layer-s3-operations install

# Install EventBridge operations dependencies
npm --prefix ./layer-eventbridge-operations install
```

### 2. Build the Application

```bash
sam build
```

**Note:** Run this command from the `Shared-Layers` directory every time before deploying.

### 3. Configure AWS Profile

Ensure your AWS profile is configured in the `../../aws-profile.profile` file, or modify the deploy commands to use your preferred authentication method.

### 4. Deploy the Stack

#### First Time Deployment (Guided)

```bash
sam deploy --guided \
  --stack-name PROCESS-INBOUND-EMAIL-SHARED-LAYERS \
  --template template.yaml \
  --profile $(cat ../../aws-profile.profile) \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides $(cat ../../global.properties | tr '\n' ' ')
```

#### Subsequent Deployments

```bash
sam deploy \
  --stack-name PROCESS-INBOUND-EMAIL-SHARED-LAYERS \
  --template template.yaml \
  --profile $(cat ../../aws-profile.profile) \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides $(cat ../../global.properties | tr '\n' ' ')
```

## Layer Details

### S3 Operations Layer

**Purpose**: Provides common S3 operations for reading and writing email data.

**Key Functions**:
- `getEmailData(messageId)`: Retrieve parsed email data from S3
- `saveProcessingResults(messageId, results)`: Save processing results to S3
- `handleS3Errors(error)`: Standardized error handling for S3 operations

**Dependencies**:
- `@aws-sdk/client-s3`: AWS SDK for S3 operations

### EventBridge Operations Layer

**Purpose**: Provides event publishing and routing capabilities.

**Key Functions**:
- `publishEmailEvent(eventData)`: Publish email processing events
- `createEventDetail(emailData, results)`: Create standardized event structure
- `handleEventBridgeErrors(error)`: Standardized error handling

**Dependencies**:
- `@aws-sdk/client-eventbridge`: AWS SDK for EventBridge operations

## File Structure

```
Shared-Layers/
├── layer-s3-operations/              # S3 operations layer
│   ├── s3-operations.mjs             # S3 utility functions
│   └── package.json                  # Dependencies
├── layer-eventbridge-operations/     # EventBridge operations layer
│   ├── eventbridge-operations.mjs    # EventBridge utility functions
│   └── package.json                  # Dependencies
├── template.yaml                     # SAM template
└── README.md                         # This file
```

### Layer Naming Convention

Layers are named with environment suffixes:
- `s3-operations-layer-{Environment}`
- `eventbridge-operations-layer-{Environment}`

## Usage in Other Stacks

### Importing Layers

Other stacks import these layers using CloudFormation exports:

```yaml
Layers:
  - !ImportValue SendGridProcessInboundEmails-S3OperationsLayerArn
  - !ImportValue SendGridProcessInboundEmails-EventBridgeOperationsLayerArn
```

### Using Layer Functions

In your Lambda functions, import and use the layer functions:

```javascript
// S3 Operations
import { getEmailData, saveProcessingResults } from '/opt/s3-operations.mjs';

// EventBridge Operations
import { publishEmailEvent } from '/opt/eventbridge-operations.mjs';
```

## Outputs

The stack exports the following values for use by other stacks:

- **S3OperationsLayerArn**: ARN of the S3 operations layer  
- **EventBridgeOperationsLayerArn**: ARN of the EventBridge operations layer

## Monitoring

Monitor the layers through:
- **CloudWatch Logs**: Function execution logs that use these layers
- **CloudWatch Metrics**: Performance metrics from consuming functions
- **Layer Usage**: Monitor layer consumption across functions

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Verify AWS credentials and permissions
   - Ensure all layer dependencies are installed
   - Check that environment parameter is valid (dev, staging, prod)

2. **Layer Import Errors in Other Stacks**
   - Verify this stack deployed successfully
   - Check that layer ARNs are properly exported
   - Ensure other stacks are importing the correct ARN names

3. **Function Runtime Errors**
   - Verify layer functions are imported correctly
   - Check that layer dependencies are compatible
   - Review CloudWatch logs for specific error messages

### Log Locations

- **Layer Functions**: CloudWatch Logs from functions that consume these layers
- **Deployment**: CloudFormation stack events

## Cost Optimization

- **Layer Reuse**: Multiple functions share the same layer code, reducing deployment size
- **Efficient Dependencies**: Only essential dependencies are included in each layer
- **ARM64 Architecture**: Uses ARM64 for better price/performance ratio

## Security Features

- **IAM Least Privilege**: Layers only contain code, no IAM permissions
- **Secure Dependencies**: Only trusted AWS SDK packages are included
- **Environment Isolation**: Layer names include environment for isolation

## Support

For issues or questions:
1. Check CloudWatch logs for error details
2. Review this documentation
3. Verify layer dependencies are properly installed
4. Create an issue in the project repository

## Next Steps

After successful deployment:
1. Deploy the `Outbound-Emails` stack (depends on S3 layer)
2. Deploy the `Process-Inbound-Email` stack (depends on both layers)
3. Test layer functionality through consuming Lambda functions
4. Monitor layer usage and performance
