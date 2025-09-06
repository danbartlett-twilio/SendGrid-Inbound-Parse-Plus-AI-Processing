# SendGrid Inbound Parse with Signature Verification

A complete AWS serverless solution for securely receiving, processing, and handling inbound emails through SendGrid's Inbound Parse webhook system. This project provides enterprise-grade email processing capabilities with signature verification, attachment handling, and extensible business logic.

## 🚀 What This Project Does

This solution creates a robust email processing pipeline that:

- **Securely receives emails** via SendGrid Inbound Parse webhook with signature verification
- **Processes email content** including parsing, attachment extraction, and metadata extraction
- **Stores email data** in S3 with organized structure for easy retrieval
- **Provides extensible architecture** for implementing custom business logic
- **Handles large volumes** with scalable serverless components

## 🎯 Why This Project is Helpful

### **Enterprise-Ready Email Processing**
- **Security First**: Built-in signature verification ensures emails are authentic
- **Scalable Architecture**: Serverless design handles varying email volumes automatically
- **Cost Effective**: Pay only for what you use with AWS Lambda and S3
- **Reliable**: Built-in error handling, retry logic, and dead letter queues

### **Developer-Friendly**
- **Modular Design**: Separate concerns for easy maintenance and testing
- **Extensible**: Clean interfaces for adding custom business logic
- **Well Documented**: Comprehensive documentation and examples
- **Production Ready**: Includes monitoring, logging, and troubleshooting guides

### **Common Use Cases**
- **Customer Support**: Automatically categorize and route support emails
- **Lead Processing**: Extract and process lead information from contact forms
- **Document Processing**: Handle email attachments and extract data
- **Notification Systems**: Process inbound notifications and trigger workflows
- **Email Analytics**: Analyze email patterns and content for insights

## 🏗️ Architecture Overview

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   SendGrid  │───▶│ API Gateway  │───▶│   Lambda    │───▶│     S3      │
│Inbound Parse│    │              │    │(inbound-    │    │   Storage   │
│   Webhook   │    │              │    │email-to-s3) │    │             │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
                                                                    │
                                                                    ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   SNS Topic │◀───│     SQS      │◀───│   Lambda    │◀───│     S3      │
│             │    │    Queue     │    │(handle-sqs- │    │   Storage   │
│             │    │              │    │ messages)   │    │             │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
       │
       ▼
┌─────────────┐
│   Lambda    │
│(Generic     │
│ Event       │
│ Handler)    │
└─────────────┘
```

## 📁 Project Structure

```
SendGrid-Inbound-Parse-with-Signature-Verification/
├── Inbound-Email-Store/              # Main email processing stack
│   ├── lambdas/
│   │   ├── inbound-email-to-s3/      # Webhook receiver & validator
│   │   └── handle-sqs-messages/      # Email processor & parser
│   ├── layers/                       # Shared Lambda layers
│   ├── template.yaml                 # SAM template
│   └── README.md                     # Detailed setup instructions
├── Generic-Inbound-Event-Handler/    # Custom business logic stack
│   ├── lambdas/
│   │   └── generic-handler/          # Your custom logic goes here
│   ├── template.yaml                 # SAM template
│   └── README.md                     # Customization guide
├── ../../global.properties           # Configuration parameters
├── ../../aws-profile.profile         # AWS profile configuration
└── README.md                         # This file
```

## 🚀 Quick Start

### Prerequisites

- AWS CLI configured with appropriate permissions
- AWS SAM CLI installed
- Node.js runtime environment
- SendGrid account with Inbound Parse configured

### 1. Clone and Configure

```bash
git clone <repository-url>
cd SendGrid-Inbound-Parse-with-Signature-Verification

# Copy and configure your settings
cp ../../global.properties.example ../../global.properties
cp ../../aws-profile.profile.example ../../aws-profile.profile

# Edit ../../global.properties with your values
# Edit ../../aws-profile.profile with your AWS profile
```

### 2. Deploy the Main Stack

```bash
cd Inbound-Email-Store
sam build
sam deploy --guided
```

### 3. Deploy the Event Handler

```bash
cd ../Generic-Inbound-Event-Handler
sam build
sam deploy --guided
```

### 4. Configure SendGrid

1. Get the API Gateway endpoint from your stack outputs
2. Configure SendGrid Inbound Parse webhook with the endpoint
3. Test email delivery

## 📚 Detailed Documentation

### **Inbound-Email-Store**
The core email processing system. See [`Inbound-Email-Store/README.md`](./Inbound-Email-Store/README.md) for:
- Complete setup and deployment instructions
- Architecture details and component descriptions
- Configuration options and security features
- Troubleshooting and monitoring guidance

### **Generic-Inbound-Event-Handler**
The extensible business logic component. See [`Generic-Inbound-Event-Handler/README.md`](./Generic-Inbound-Event-Handler/README.md) for:
- Customization examples and code templates
- Integration patterns and best practices
- Deployment and configuration details

## 🔧 Configuration

### Required Parameters

Edit `../../global.properties` with your specific values:

```properties
# S3 bucket for email storage (must be globally unique)
S3BucketName="your-company-inbound-emailsfacf"

# SendGrid webhook public key for signature verification
SendGridWebhookPublicKey="MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE..."

# AWS region for deployment
AWSRegion="us-east-1"
```

### AWS Profile

Configure your AWS profile in `../../aws-profile.profile`:

```bash
your-aws-profile-name
```

## 🛡️ Security Features

- **Signature Verification**: Validates all incoming emails are from SendGrid
- **Input Sanitization**: Prevents injection attacks and malicious content
- **IAM Least Privilege**: Minimal required permissions for all components
- **Encrypted Storage**: All data encrypted at rest in S3
- **Network Security**: Optional VPC integration for additional isolation

## 📊 Monitoring & Observability

- **CloudWatch Logs**: Detailed execution logs for all components
- **CloudWatch Metrics**: Performance and error rate monitoring
- **S3 Access Logs**: Storage access pattern analysis
- **SNS Metrics**: Message processing statistics
- **X-Ray Tracing**: Request flow analysis (optional)

## 💰 Cost Optimization

- **Serverless Architecture**: Pay only for actual usage
- **S3 Lifecycle Policies**: Automatic archival of old emails
- **Lambda Concurrency Limits**: Control costs during traffic spikes
- **SNS Message Filtering**: Reduce downstream processing costs

## 🔄 Extending the System

### Adding Custom Business Logic

1. Modify the `Generic-Inbound-Event-Handler` lambda
2. Add new AWS services as needed (Bedrock, DynamoDB, RDS, etc.)
3. Implement your specific email processing requirements

### Common Extensions

- **Database Integration**: Store email data in DynamoDB or RDS
- **AI/ML Processing**: Add email classification or sentiment analysis
- **External APIs**: Integrate with CRM, ticketing, or notification systems
- **Workflow Automation**: Trigger business processes based on email content

## 🆘 Support & Troubleshooting

### Getting Help

1. **Check Logs**: Review CloudWatch logs for error details
2. **Review Documentation**: Consult the detailed README files in each directory
3. **Common Issues**: See troubleshooting sections in component READMEs
4. **Create Issues**: Report bugs or request features in the repository

### Common First Steps

1. Verify AWS credentials and permissions
2. Check that all required parameters are configured
3. Ensure SendGrid webhook is properly configured
4. Review CloudWatch logs for specific error messages

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with AWS Serverless Application Model (SAM)
- Uses SendGrid Inbound Parse webhook system
- Leverages mailparser.js for robust email parsing
- Inspired by modern serverless architecture patterns

---

**Ready to get started?** Begin with the [Inbound-Email-Store setup guide](./Inbound-Email-Store/README.md) to deploy the core email processing system.
