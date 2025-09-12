# Process Inbound Emails with AI

A comprehensive AWS serverless solution for AI-powered email processing, categorization, and intelligent response generation. This system extends the Part-1 email reception capabilities with advanced AI processing, automated categorization, and intelligent routing to specialized handlers.

## 🚀 What This Project Does

This solution creates an intelligent email processing pipeline that:

- **Processes emails with AI** using AWS Bedrock for categorization and summarization
- **Routes emails intelligently** to specialized handlers based on content and context
- **Generates automated responses** through integration with outbound email systems
- **Handles attachments** with specialized processing, AI analysis, and intelligent summarization
- **Provides extensible architecture** for custom business logic and integrations
- **Scales automatically** with serverless components and event-driven architecture

## 🎯 Why This Project is Helpful

### **AI-Powered Email Intelligence**
- **Smart Categorization**: Automatically classifies emails into sales, support, account, inquiry, and conversation categories
- **Content Summarization**: Generates concise summaries for quick understanding
- **Confidence Scoring**: Provides AI confidence levels for decision transparency
- **Context Awareness**: Considers email metadata, attachments, and content structure
- **Attachment Intelligence**: All handlers include attachment context in AI prompts for more informed responses

### **Intelligent Automation**
- **Event-Driven Architecture**: Uses EventBridge for flexible, scalable event routing
- **Specialized Handlers**: Category-specific processing for tailored business logic
- **Automated Responses**: AI-generated responses based on email content and category
- **Attachment Processing**: Specialized handling for emails with attachments

### **Enterprise-Ready Features**
- **Scalable Architecture**: Serverless design handles varying email volumes
- **Cost Effective**: Pay only for actual AI processing and email handling
- **Reliable**: Built-in error handling, retry logic, and monitoring
- **Secure**: IAM least privilege, encrypted data, and secure AI model access

### **Common Use Cases**
- **Customer Support**: Automatically categorize and route support emails to appropriate teams
- **Sales Lead Processing**: Identify and prioritize sales opportunities from inbound emails
- **Account Management**: Handle account-related inquiries and updates automatically
- **General Inquiries**: Route and respond to general information requests
- **Conversation Management**: Maintain context-aware email threads and conversational responses
- **Document Processing**: Analyze and process email attachments with AI-generated summaries

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Part-1 Integration                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                          │
│  │   SNS       │───▶│   S3        │    │  Email      │                          │
│  │  (Events)   │    │  (Storage)  │    │  Metadata   │                          │
│  └─────────────┘    └─────────────┘    └─────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AI Processing Layer                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                          │
│  │ First Pass  │───▶│  Bedrock    │───▶│ EventBridge │                          │
│  │  Function   │    │     AI      │    │   Events    │                          │
│  └─────────────┘    └─────────────┘    └─────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Specialized Handlers                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Sales     │  │  Support    │  │   Account   │  │  Inquiry    │             │
│  │  Handler    │  │  Handler    │  │  Handler    │  │  Handler    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    Conversation Handler                                 │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │              Process Attachments Handler                                │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Outbound Integration                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                          │
│  │ EventBridge │───▶│   SNS       │───▶│  SendGrid   │                          │
│  │   Events    │    │  (Outbound) │    │   Email     │                          │
│  └─────────────┘    └─────────────┘    └─────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
Part-2-Process-Inbound-Emails-with-AI/
├── Shared-Layers/                    # Shared Lambda layers (DEPLOY FIRST)
│   ├── layer-s3-operations/          # S3 operations utilities
│   ├── layer-bedrock-operations/     # Bedrock AI operations
│   ├── layer-eventbridge-operations/ # EventBridge operations
│   ├── template.yaml                 # SAM template
│   └── README.md                     # Layer setup instructions
├── Outbound-Emails/                  # Outbound email system (DEPLOY SECOND)
│   ├── lambdas/
│   │   └── send-outbound-email/      # SendGrid integration
│   ├── template.yaml                 # SAM template
│   └── README.md                     # Outbound email setup
├── Process-Inbound-Email/            # AI processing system (DEPLOY THIRD)
│   ├── lambdas/
│   │   ├── first-pass/               # Main AI processing
│   │   ├── sales-handler/            # Sales email processor
│   │   ├── support-handler/          # Support email processor
│   │   ├── account-handler/          # Account email processor
│   │   ├── inquiry-handler/          # Inquiry email processor
│   │   ├── conversation-handler/     # Conversation email processor
│   │   └── process-attachments/      # Attachment processor
│   ├── template.yaml                 # SAM template
│   └── README.md                     # AI processing setup
├── ../../global.properties           # Configuration parameters
├── ../../aws-profile.profile         # AWS profile configuration
└── README.md                         # This file
```

## 🚀 Quick Start

### Prerequisites

- AWS CLI configured with appropriate permissions
- AWS SAM CLI installed
- Node.js runtime environment
- AWS Bedrock access configured
- **Part-1 stacks deployed** (Inbound-Email-Store and Generic-Inbound-Event-Handler)

### Deploy in Order

**⚠️ CRITICAL**: Deploy stacks in this exact order:

#### [Step 1: Deploy Shared Layers](./Shared-Layers/README.md) (REQUIRED FIRST)

#### [Step 2: Deploy Outbound Emails](./Outbound-Emails/README.md) (REQUIRED SECOND)

#### [Step 3: Deploy Process Inbound Email](./Process-Inbound-Email/README.md) (DEPLOY LAST)

### After Deploying, Test the System

1. Send a test email to your configured inbound parse address
2. Monitor CloudWatch logs for processing
3. Check EventBridge events for routing
4. Verify outbound email responses (if configured)

## 📚 Detailed Documentation

### **Shared-Layers**
The foundation layer providing common functionality. See [`Shared-Layers/README.md`](./Shared-Layers/README.md) for:
- Layer setup and deployment instructions
- Shared utility functions and operations
- Integration patterns for other stacks

### **Outbound-Emails**
The email sending system. See [`Outbound-Emails/README.md`](./Outbound-Emails/README.md) for:
- SendGrid integration and configuration
- Email event processing and formatting
- External application integration

### **Process-Inbound-Email**
The AI processing system. See [`Process-Inbound-Email/README.md`](./Process-Inbound-Email/README.md) for:
- AI categorization and summarization
- EventBridge routing and handlers
- Customization and extension patterns

## ⚠️ Limitations

### **Payload Size Constraints**
- **API Gateway Limit**: 10 MB maximum payload size for REST endpoints
- **SendGrid Capability**: Supports up to 30 MB email payloads
- **Impact**: Emails with large attachments exceeding 10 MB will be rejected by API Gateway

### **When This Architecture Works Well**
- **Small to Medium Attachments**: Perfect for typical business emails with standard attachments
- **Text-Heavy Emails**: Excellent for emails without large file attachments
- **Standard Use Cases**: Ideal for most customer support, sales, and general inquiry scenarios

### **Alternative Solutions for Large Attachments**
If you need to handle larger email attachments, consider these architectural alternatives:

- **Application Load Balancer (ALB)**: Replace API Gateway with ALB for higher payload limits
- **Direct S3 Streaming**: Stream payloads directly to S3 buckets with onCreate trigger to kick off next lambda
- **Hybrid Approach**: Use API Gateway for standard emails and ALB for large attachment handling

### **Monitoring Recommendations**
- **Enable API Gateway Logging**: Track requests rejected due to size limits
- **Set Up Alerts**: Monitor for 413 Payload Too Large errors
- **Size Analytics**: Track email size patterns to inform architectural decisions


## 🛡️ Security Features

- **AI Model Security**: Secure access to AWS Bedrock models
- **IAM Least Privilege**: Minimal required permissions for all components
- **Encrypted Data**: All data encrypted at rest and in transit
- **EventBridge Security**: Secure event routing and processing
- **Input Validation**: Email content validation and sanitization

## 📊 Monitoring & Observability

- **CloudWatch Logs**: Detailed execution logs for all components
- **CloudWatch Metrics**: Performance and error rate monitoring
- **EventBridge Metrics**: Event routing and processing statistics
- **Bedrock Metrics**: AI processing performance and costs
- **X-Ray Tracing**: Request flow analysis (optional)

## 💰 Cost Optimization

- **Serverless Architecture**: Pay only for actual usage
- **Efficient AI Usage**: Optimized prompts reduce Bedrock costs
- **EventBridge Filtering**: Reduce downstream processing costs
- **Lambda Concurrency Limits**: Control costs during traffic spikes

## 🔄 Extending the System

### Adding New Categories

1. **Update AI Prompts**: Modify Bedrock prompts in FirstPassFunction
2. **Create New Handler**: Implement category-specific logic
3. **Add EventBridge Rule**: Route events to new handler
4. **Update Documentation**: Document new category behavior

### Custom Business Logic

1. **Modify Handlers**: Implement specific business logic in category handlers
2. **Add External Integrations**: Connect to CRM, ticketing, or notification systems
3. **Custom AI Processing**: Add specialized AI models or processing logic
4. **Response Generation**: Implement AI-powered response generation

### Common Extensions

- **CRM Integration**: Connect sales emails to CRM systems
- **Ticketing Systems**: Route support emails to ticketing platforms
- **Knowledge Base**: Integrate with knowledge base for automated responses
- **Analytics**: Add email analytics and reporting capabilities

## 🆘 Support & Troubleshooting

### Getting Help

1. **Check Logs**: Review CloudWatch logs for error details
2. **Review Documentation**: Consult the detailed README files in each directory
3. **Verify Deployment Order**: Ensure stacks are deployed in correct sequence
4. **Common Issues**: See troubleshooting sections in component READMEs
5. **Create Issues**: Report bugs or request features in the repository

### Common First Steps

1. Verify AWS credentials and permissions
2. Check that all required parameters are configured
3. Ensure Bedrock access is enabled and models are available
4. Verify Part-1 stacks are deployed and accessible
5. Review CloudWatch logs for specific error messages

### Deployment Order Issues

If you encounter dependency errors:
1. **Verify Shared-Layers**: Ensure it deployed successfully and exported layer ARNs
2. **Check Outbound-Emails**: Verify it can import Shared-Layers dependencies
3. **Confirm Process-Inbound-Email**: Ensure it can import both previous stacks' exports


## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with AWS Serverless Application Model (SAM)
- Uses AWS Bedrock for AI processing capabilities
- Leverages EventBridge for event-driven architecture
- Integrates with SendGrid for email delivery
- Inspired by modern serverless and AI architecture patterns

---

**Ready to get started?** Begin with the [Shared-Layers setup guide](./Shared-Layers/README.md) to deploy the foundation layer, then follow the deployment order to complete your AI-powered email processing system.
