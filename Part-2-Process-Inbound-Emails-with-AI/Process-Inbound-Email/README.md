# Process Inbound Emails with AI

A starter kit for building an AWS serverless solution for processing inbound emails using AI-powered categorization, summarization, and intelligent routing. This system leverages AWS Bedrock for natural language processing and EventBridge for event-driven architecture.

**Important**: This is a starter kit/blueprint that provides the foundation and architecture for AI-powered email processing. Companies will need to customize the AI prompts, implement specific business logic, and add production-ready features before deploying to production.

## 📋 Navigation
- **← [Part 2 Main](../README.md)** - Part 2 overview and deployment guide
- **← [Main Project Overview](../../../README.md)** - Complete project overview
- **← [Shared-Layers](../Shared-Layers/README.md)** - Shared layers (deploy first)
- **← [Outbound-Emails](../Outbound-Emails/README.md)** - Outbound email system

## Overview

This starter kit provides the foundation for building an AI-powered email processing pipeline that:
- Receives email metadata from SNS topics (from Part-1)
- Retrieves full email content from S3 storage
- Uses AWS Bedrock AI for email categorization and summarization
- Routes emails to specialized handlers based on content and attachments
- Publishes events to EventBridge for downstream processing
- Integrates with outbound email system for automated responses
- **Saves AI-generated responses to S3 for audit and analysis**

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
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Sales     │  │  Support    │  │   Account   │  │  Inquiry    │     │
│  │  Handler    │  │  Handler    │  │  Handler    │  │  Handler    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              Process Attachments Handler                        │    │
│  │                    (if has attachments)                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Processing Flow

### Standard Email Processing (No Attachments)
1. **SNS Event** → FirstPassFunction
2. **AI Processing** → Categorization & Summarization
3. **EventBridge Event** → "Email Categorized"
4. **Category Handler** → Processes email, generates AI response, saves to S3, and sends response

### Email Processing with Attachments
1. **SNS Event** → FirstPassFunction
2. **AI Processing** → Categorization & Summarization
3. **EventBridge Event** → "Email Categorized" (hasAttachment=true) → ProcessAttachmentsHandler
4. **Attachment Processing** → Download, analyze, generate summaries
5. **S3 Update** → Save attachment summaries to email.json
6. **EventBridge Event** → "Attachments Processed"
7. **Category Handler** → Processes email with complete attachment details, generates AI response, saves to S3, and sends response

**Key Benefits** (with customization):
- **Single Response**: One email response per inbound email
- **Complete Information**: Full attachment details included in response
- **AI-Powered Analysis**: Intelligent attachment content understanding
- **Audit Trail**: All AI responses saved to S3 for analysis and debugging

**Customization Required**: The AI prompts and response generation are basic examples. You'll need to customize these for your specific industry, use cases, and business requirements.

### Components

- **FirstPassFunction**: Main processing function that categorizes and summarizes emails
- **EventBridge Event Bus**: Central event routing system
- **Category Handlers**: Specialized processors for different email types
- **ProcessAttachmentsHandler**: Handles emails with attachments
- **Shared Layers**: Reusable functionality for S3, Bedrock, and EventBridge operations

## S3 Storage Structure

The system stores email data and AI responses in a structured format within the S3 bucket:

```
S3 Bucket: {SENDGRID_INBOUND_PARSE_BUCKET}
├── {messageId}/
│   ├── email.json              # Original email data from Part-1
│   └── llm-response.json       # AI-generated response (NEW)
└── conversations/
    └── {conversationId}.json   # Conversation history (conversation handler only)
```

### LLM Response Storage

Each category handler automatically saves its AI-generated response to S3 as `llm-response.json` in the same directory as the original email data. This provides:

**File Location**: `{messageId}/llm-response.json`

**Response Data Structure**:
```json
{
  "messageId": "unique-message-id",
  "category": "sales|support|account|inquiry|conversation",
  "confidence": 0.95,
  "response": "AI-generated response text",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "handler": "sales-handler|support-handler|account-handler|inquiry-handler|conversation-handler",
  "conversationId": "conversation-id" // Only for conversation handler
}
```

**Benefits**:
- **Audit Trail**: Complete record of all AI responses
- **Debugging**: Easy access to AI responses for troubleshooting
- **Analysis**: Historical data for improving AI prompts and responses
- **Compliance**: Permanent record of automated responses
- **Integration**: Easy access for downstream systems and reporting

## Prerequisites

- AWS CLI configured with appropriate permissions
- AWS SAM CLI installed
- Node.js runtime environment
- AWS Bedrock access configured
- **Important**: Both [`Shared-Layers`](../Shared-Layers/README.md) and [`Outbound-Emails`](../Outbound-Emails/README.md) stacks must be deployed first

## Deployment Order

**⚠️ CRITICAL**: Deploy stacks in this exact order:
1. ✅ [`Shared-Layers`](../Shared-Layers/README.md) stack (must be deployed first)
2. ✅ [`Outbound-Emails`](../Outbound-Emails/README.md) stack (must be deployed second)
3. ✅ `Process-Inbound-Email` stack (this stack - deploy last)

## Setup Instructions

### 1. Configure AWS Bedrock

You can use whatever model you like. We chose `anthropic.claude-3-haiku-20240307-v1:0` because it can handle attachments. You could certainly choose one model to analyze the text of the inbound emails and another to analyze attachments. Model choice should reflect your business requirements and factor in functionality, performance, and cost. 

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
BedrockModelIdForCategoryAndSummary="anthropic.claude-3-haiku-20240307-v1:0"
BedrockModelIdForAttachmentAnalysis=anthropic.claude-3-5-sonnet-20240620-v1:0
```

### 3. Build the Application

```bash
sam build
```

**Note:** Run this command from the `Process-Inbound-Email` directory every time before deploying.

### 4. Deploy the Stack

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

All category handlers follow the same processing pattern:
1. **Retrieve** email data from S3
2. **Generate** AI response using Bedrock
3. **Save** AI response to S3 as `llm-response.json`
4. **Format** response for email delivery
5. **Publish** to SNS for outbound email processing

#### SalesEmailHandler
**Purpose**: Processes sales-related emails
**Features**: Basic lead qualification, placeholder CRM integration, follow-up scheduling
**Response Format**: AI-generated sales response + email details + attachment details
**S3 Storage**: Saves response to `{messageId}/llm-response.json`
**Customization Required**: Implement your specific CRM integration, lead scoring, and sales workflows

#### SupportEmailHandler  
**Purpose**: Processes support and technical assistance emails
**Features**: Basic ticket creation, placeholder escalation routing, knowledge base integration
**Response Format**: AI-generated support response + email details + attachment details
**S3 Storage**: Saves response to `{messageId}/llm-response.json`
**Customization Required**: Implement your specific ticketing system integration and support workflows

#### AccountEmailHandler
**Purpose**: Processes account-related emails
**Features**: Basic account updates, placeholder billing inquiries, subscription management
**Response Format**: AI-generated account response + email details + attachment details
**S3 Storage**: Saves response to `{messageId}/llm-response.json`
**Customization Required**: Implement your specific account management and billing system integrations

#### InquiryEmailHandler
**Purpose**: Processes general inquiries and information requests
**Features**: Basic information routing, placeholder FAQ responses, general assistance
**Response Format**: AI-generated inquiry response + email details + attachment details
**S3 Storage**: Saves response to `{messageId}/llm-response.json`
**Customization Required**: Implement your specific knowledge base and FAQ system integrations

#### ConversationEmailHandler
**Purpose**: Processes conversation-related emails with context tracking
**Features**: Basic conversation history, context-aware responses, thread management
**Response Format**: AI-generated conversation response + email details
**S3 Storage**: Saves response to `{messageId}/llm-response.json` + conversation history to `conversations/{conversationId}.json`
**Customization Required**: Implement your specific conversation management and context tracking logic

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

**Customization Required**: The AI prompts are basic examples. You'll need to optimize these for your specific industry, use cases, and business requirements.

### Prompt Engineering

The system uses example prompts for:
- **Single-call Processing**: Categorization and summarization in one API call
- **Structured Output**: JSON-formatted responses for easy parsing
- **Context Awareness**: Considers email metadata and content structure

**Customization Required**: These are basic example prompts. You'll need to develop and optimize prompts for your specific business requirements and use cases.

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
   - Verify [`Shared-Layers`](../Shared-Layers/README.md) and [`Outbound-Emails`](../Outbound-Emails/README.md) stacks are deployed first
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
   - Check IAM permissions for S3 access (both read and write)
   - Ensure bucket exists and is accessible
   - Verify category handlers have S3WritePolicy for saving llm-response.json files

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

**Development Required**: Adding new categories requires significant customization:

1. **Update FirstPassFunction**: Add new category to AI prompt (requires prompt engineering expertise)
2. **Create New Handler**: Implement category-specific logic with your business requirements
3. **Add EventBridge Rule**: Route events to new handler
4. **Update Documentation**: Document new category behavior

### Extending AI Processing

**Customization Required**: These extensions require development work:

1. **Modify Prompts**: Update Bedrock prompts for new requirements (requires AI expertise)
2. **Add New Models**: Integrate additional Bedrock models
3. **Custom Logic**: Implement specialized AI processing logic
4. **Response Generation**: Add AI-powered response generation
5. **Business Logic**: Implement your specific business rules and workflows

## Support

For issues or questions:
1. Check CloudWatch logs for error details
2. Review Bedrock access and model availability
3. Verify EventBridge rules and routing
4. Check S3 bucket access and permissions

## Next Steps

After successful deployment:
1. Test email processing with sample emails
2. Verify LLM responses are being saved to S3 as `llm-response.json` files
3. **Implement category-specific business logic** in handlers (required for production)
4. **Set up comprehensive monitoring and alerting** for AI processing (required for production)
5. **Customize AI prompts** for your specific use cases (required for production)
6. **Implement automated response generation** with your business logic
7. **Add custom categories and processing logic** as needed
8. **Integrate with external systems** (CRM, ticketing, etc.) - required for production
9. **Set up analysis and reporting** on saved AI responses
10. **Add security hardening** and compliance features
11. **Implement proper error handling** and recovery mechanisms

**Important**: This starter kit provides the foundation, but significant additional development is required before production deployment.