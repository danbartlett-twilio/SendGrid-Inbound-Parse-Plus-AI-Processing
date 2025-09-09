# Process Inbound Emails with AI

A comprehensive AWS serverless solution for processing inbound emails using AI-powered categorization, summarization, and intelligent routing. This system leverages AWS Bedrock for natural language processing and EventBridge for event-driven architecture.

## Overview

This application creates a complete AI-powered email processing pipeline that:
- Receives email metadata from SNS topics (from Part-1)
- Retrieves full email content from S3 storage
- Uses AWS Bedrock AI for email categorization and summarization
- Routes emails to specialized handlers based on content and attachments
- Publishes events to EventBridge for downstream processing
- Integrates with outbound email system for automated responses

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   SNS       │───▶│ First Pass  │───▶│   S3        │───▶│  Bedrock    │
│  (Part-1)   │    │  Function   │    │  Storage    │    │     AI      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                    │
                                                                    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ EventBridge │◀───│ EventBridge │◀───│ First Pass  │◀───│  Bedrock    │
│   Rules     │    │   Events    │    │  Function   │    │     AI      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Category Handlers                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Sales     │  │  Support    │  │   Account   │  │  Inquiry    │   │
│  │  Handler    │  │  Handler    │  │  Handler    │  │  Handler    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              Process Attachments Handler                       │   │
│  │                    (if has attachments)                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Processing Flow

### Standard Email Processing (No Attachments)
1. **SNS Event** → FirstPassFunction
2. **AI Processing** → Categorization & Summarization
3. **EventBridge Event** → "Email Categorized"
4. **Category Handler** → Processes email and sends response

### Email Processing with Attachments
1. **SNS Event** → FirstPassFunction
2. **AI Processing** → Categorization & Summarization
3. **EventBridge Event** → "Email Categorized" (hasAttachment=true) → ProcessAttachmentsHandler
4. **Attachment Processing** → Download, analyze, generate summaries
5. **S3 Update** → Save attachment summaries to email.json
6. **EventBridge Event** → "Attachments Processed"
7. **Category Handler** → Processes email with complete attachment details

**Key Benefits**:
- **Single Response**: One email response per inbound email
- **Complete Information**: Full attachment details included in response
- **AI-Powered Analysis**: Intelligent attachment content understanding

### Components

- **FirstPassFunction**: Main processing function that categorizes and summarizes emails
- **EventBridge Event Bus**: Central event routing system
- **Category Handlers**: Specialized processors for different email types
- **ProcessAttachmentsHandler**: Handles emails with attachments
- **Shared Layers**: Reusable functionality for S3, Bedrock, and EventBridge operations

## Prerequisites

- AWS CLI configured with appropriate permissions
- AWS SAM CLI installed
- Node.js runtime environment
- AWS Bedrock access configured
- **Important**: Both `Shared-Layers` and `Outbound-Emails` stacks must be deployed first

## Deployment Order

**⚠️ CRITICAL**: Deploy stacks in this exact order:
1. ✅ `Shared-Layers` stack (must be deployed first)
2. ✅ `Outbound-Emails` stack (must be deployed second)
3. ✅ `Process-Inbound-Email` stack (this stack - deploy last)

## Setup Instructions

### 1. Configure AWS Bedrock

1. **Enable Bedrock Access**:
   - Navigate to AWS Bedrock console
   - Request access to Claude models (anthropic.claude-3-haiku-20240307-v1:0)
   - Wait for access approval (may take several hours)

2. **Configure Model Access**:
   - Ensure your AWS account has access to the required Bedrock models
   - Note the model ID for configuration

### 2. Update Configuration

Edit the `../../global.properties` file with your Bedrock configuration:

```properties
# AWS Bedrock model ID for categorization and summarization
BedrockModelIdForCategoryAndSummary="anthropic.claude-3-haiku-20240307-v1:0"

# AWS region for deployment
AWSRegion="us-east-1"

# Environment for resource naming
Environment="dev"
```

### 3. Build the Application

```bash
sam build
```

**Note:** Run this command from the `Process-Inbound-Email` directory every time before deploying.

### 4. Configure AWS Profile

Ensure your AWS profile is configured in the `../../aws-profile.profile` file, or modify the deploy commands to use your preferred authentication method.

### 5. Deploy the Stack

#### First Time Deployment (Guided)

```bash
sam deploy --guided \
  --stack-name PROCESS-INBOUND-EMAIL \
  --template template.yaml \
  --profile $(cat ../../aws-profile.profile) \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides $(cat ../../global.properties | tr '\n' ' ')
```

#### Subsequent Deployments

```bash
sam deploy \
  --stack-name PROCESS-INBOUND-EMAIL \
  --template template.yaml \
  --profile $(cat ../../aws-profile.profile) \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides $(cat ../../global.properties | tr '\n' ' ')
```

## Lambda Functions

### FirstPassFunction

**Purpose**: Main processing function that categorizes and summarizes emails using AI.

**Features**:
- Receives SNS events from Part-1 email processing
- Retrieves full email content from S3
- Uses Bedrock AI for categorization and summarization
- Publishes events to EventBridge for routing
- Handles both text and HTML email content

**AI Processing**:
- **Categories**: `sales`, `support`, `account`, `inquiry`
- **Summarization**: Concise content summaries
- **Confidence Scoring**: AI confidence levels for categorization
- **Reasoning**: AI explanations for categorization decisions

**Environment Variables**:
- `REGION`: AWS region
- `SENDGRID_INBOUND_PARSE_BUCKET`: S3 bucket name from Part-1
- `EMAIL_PROCESSING_EVENT_BUS`: EventBridge event bus name
- `BEDROCK_MODEL_ID_FOR_CATEGORY_AND_SUMMARY`: Bedrock model ID

### Category Handlers

#### SalesEmailHandler
**Purpose**: Processes sales-related emails
**Features**: Lead qualification, CRM integration, follow-up scheduling
**Response Format**: AI-generated sales response + email details + attachment details

#### SupportEmailHandler  
**Purpose**: Processes support and technical assistance emails
**Features**: Ticket creation, escalation routing, knowledge base integration
**Response Format**: AI-generated support response + email details + attachment details

#### AccountEmailHandler
**Purpose**: Processes account-related emails
**Features**: Account updates, billing inquiries, subscription management
**Response Format**: AI-generated account response + email details + attachment details

#### InquiryEmailHandler
**Purpose**: Processes general inquiries and information requests
**Features**: Information routing, FAQ responses, general assistance
**Response Format**: AI-generated inquiry response + email details + attachment details

**Enhanced Email Response Format**:
All category handlers now include comprehensive attachment details in their response emails:
- **Text Version**: Structured attachment details with all properties
- **HTML Version**: Formatted attachment details with proper styling
- **Summary Priority**: AI-generated attachment summaries displayed prominently
- **Complete Metadata**: All attachment properties (filename, type, size, etc.)

### ProcessAttachmentsHandler

**Purpose**: Processes emails with attachments
**Features**:
- Attachment analysis and categorization using AWS Bedrock AI
- File type validation and security scanning
- Content extraction from documents
- AI-generated summaries for each attachment
- Integration with document processing services

**Processing Flow**:
1. Downloads attachments from S3 to temporary storage
2. Analyzes each attachment using Bedrock AI
3. Generates content summaries for each attachment
4. Updates email.json in S3 with attachment summaries
5. Publishes "Attachments Processed" event to EventBridge
6. Triggers category handlers with complete attachment information

**Attachment Summary Format**:
Each attachment object includes:
- `filename`: Original filename
- `type`: MIME content type
- `size`: File size in bytes
- `key`: S3 storage key
- `contentId`: Content ID for inline attachments
- `summary`: AI-generated content summary

## EventBridge Integration

### Event Bus

**EmailProcessingEventBus**: Central event bus for email processing events.

### Event Rules

The system uses EventBridge rules to route events based on:

1. **Category-based routing (emails without attachments)**:
   - `category = "sales"` + `hasAttachment = false` → SalesEmailHandler
   - `category = "support"` + `hasAttachment = false` → SupportEmailHandler
   - `category = "account"` + `hasAttachment = false` → AccountEmailHandler
   - `category = "inquiry"` + `hasAttachment = false` → InquiryEmailHandler

2. **Attachment-based routing**:
   - `hasAttachment = true` → ProcessAttachmentsHandler

3. **Category-based routing (after attachment processing)**:
   - `source = "email.attachments"` + `category = "sales"` → SalesEmailHandler
   - `source = "email.attachments"` + `category = "support"` → SupportEmailHandler
   - `source = "email.attachments"` + `category = "account"` → AccountEmailHandler
   - `source = "email.attachments"` + `category = "inquiry"` → InquiryEmailHandler

**Note**: Each email triggers exactly one category handler:
- **No attachments**: Direct routing to category handler
- **With attachments**: Process-attachments → category handler (with attachment summaries)

### Event Format

```json
{
  "messageId": "unique-message-id",
  "originalEmail": {
    "from": "sender@example.com",
    "to": "recipient@example.com",
    "subject": "Email Subject",
    "timestamp": 1640995200000,
    "attachments": 2
  },
  "categorization": {
    "category": "support",
    "confidence": 0.95,
    "reasoning": "User is asking for technical help with login issues"
  },
  "summary": {
    "summary": "Customer experiencing login difficulties and needs password reset assistance",
    "wordCount": 12
  },
  "hasAttachment": false,
  "processedAt": "2024-01-01T00:00:00.000Z"
}
```

## File Structure

```
Process-Inbound-Email/
├── lambdas/
│   ├── first-pass/                    # Main AI processing function
│   │   ├── app.mjs                    # Lambda handler
│   │   └── package.json               # Dependencies
│   ├── sales-handler/                 # Sales email processor
│   │   ├── app.mjs                    # Sales logic
│   │   └── package.json               # Dependencies
│   ├── support-handler/               # Support email processor
│   │   ├── app.mjs                    # Support logic
│   │   └── package.json               # Dependencies
│   ├── account-handler/               # Account email processor
│   │   ├── app.mjs                    # Account logic
│   │   └── package.json               # Dependencies
│   ├── inquiry-handler/               # Inquiry email processor
│   │   ├── app.mjs                    # Inquiry logic
│   │   └── package.json               # Dependencies
│   └── process-attachments/           # Attachment processor
│       ├── app.mjs                    # Attachment logic
│       └── package.json               # Dependencies
├── template.yaml                      # SAM template
└── README.md                          # This file
```

## AI Processing Details

### Bedrock Integration

The system uses AWS Bedrock Claude models for:
- **Email Categorization**: Classifies emails into predefined categories
- **Content Summarization**: Generates concise summaries of email content
- **Confidence Scoring**: Provides confidence levels for AI decisions
- **Reasoning**: Explains the AI's categorization logic

### Prompt Engineering

The system uses optimized prompts for:
- **Single-call Processing**: Categorization and summarization in one API call
- **Structured Output**: JSON-formatted responses for easy parsing
- **Context Awareness**: Considers email metadata and content structure

### Performance Optimization

- **Efficient Token Usage**: Optimized prompts for cost-effective processing
- **Batch Processing**: Handles multiple emails efficiently
- **Error Handling**: Robust error handling for AI service failures

## Integration Points

### Part-1 Integration

- **SNS Topic**: Receives email metadata from Part-1 processing
- **S3 Bucket**: Retrieves full email content from Part-1 storage
- **Message Format**: Compatible with Part-1 SNS message structure

### Outbound-Emails Integration

- **EventBridge Events**: Can trigger outbound email responses
- **Response Templates**: Predefined templates for different categories
- **Automated Responses**: Intelligent response generation based on email content

## Monitoring

Monitor the system through:
- **CloudWatch Logs**: Function execution logs for all handlers
- **CloudWatch Metrics**: Performance and error metrics
- **EventBridge Metrics**: Event routing and processing statistics
- **Bedrock Metrics**: AI processing performance and costs
- **X-Ray Tracing**: Request flow analysis (optional)

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Verify `Shared-Layers` and `Outbound-Emails` stacks are deployed first
   - Check Bedrock model access and permissions
   - Ensure all required parameters are in `../../global.properties`

2. **AI Processing Errors**
   - Verify Bedrock model access is enabled
   - Check model ID is correct and available
   - Review CloudWatch logs for specific error messages

3. **EventBridge Routing Issues**
   - Verify EventBridge rules are properly configured
   - Check event format matches expected structure
   - Review EventBridge metrics for routing failures

4. **S3 Access Errors**
   - Verify S3 bucket name from Part-1 is correct
   - Check IAM permissions for S3 access
   - Ensure bucket exists and is accessible

### Log Locations

- **FirstPassFunction**: CloudWatch Logs → `/aws/lambda/FirstPassFunction`
- **Category Handlers**: CloudWatch Logs → `/aws/lambda/{HandlerName}`
- **EventBridge**: CloudWatch Metrics → EventBridge
- **Bedrock**: CloudWatch Metrics → Bedrock

## Cost Optimization

- **Efficient AI Usage**: Optimized prompts reduce Bedrock costs
- **Serverless Architecture**: Pay only for actual processing
- **EventBridge Filtering**: Reduce downstream processing costs
- **Lambda Concurrency**: Configure appropriate limits for cost control

## Security Features

- **IAM Least Privilege**: Minimal required permissions for all components
- **Bedrock Access Control**: Secure AI model access
- **EventBridge Security**: Secure event routing and processing
- **Input Validation**: Email content validation and sanitization

## Customization

### Adding New Categories

1. **Update FirstPassFunction**: Add new category to AI prompt
2. **Create New Handler**: Implement category-specific logic
3. **Add EventBridge Rule**: Route events to new handler
4. **Update Documentation**: Document new category behavior

### Extending AI Processing

1. **Modify Prompts**: Update Bedrock prompts for new requirements
2. **Add New Models**: Integrate additional Bedrock models
3. **Custom Logic**: Implement specialized AI processing logic
4. **Response Generation**: Add AI-powered response generation

## Support

For issues or questions:
1. Check CloudWatch logs for error details
2. Review Bedrock access and model availability
3. Verify EventBridge rules and routing
4. Check S3 bucket access and permissions
5. Create an issue in the project repository

## Next Steps

After successful deployment:
1. Test email processing with sample emails
2. Configure category-specific business logic in handlers
3. Set up monitoring and alerting for AI processing
4. Implement automated response generation
5. Add custom categories and processing logic as needed
6. Integrate with external systems (CRM, ticketing, etc.)