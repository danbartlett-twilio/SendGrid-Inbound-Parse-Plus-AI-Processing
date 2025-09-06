# Handle SQS Messages Lambda Function

This Lambda function processes SQS messages containing email data, parses emails using mailparser.js, saves attachments to S3, and publishes processed data to SNS.

## File Structure

### Main Files
- **`app.mjs`** - Main Lambda handler and orchestration logic
- **`email-processor.mjs`** - Email parsing and processing functions
- **`s3-operations.mjs`** - S3 storage operations
- **`sns-operations.mjs`** - SNS publishing operations

### Dependencies
- **`package.json`** - Node.js dependencies including mailparser.js
- **`node_modules/`** - Installed packages

## Architecture

### 1. Main Handler (`app.mjs`)
- **Purpose**: Main Lambda entry point and orchestration
- **Responsibilities**:
  - Process SQS event records
  - Extract email data from S3
  - Coordinate between modules
  - Handle security validation

### 2. Email Processor (`email-processor.mjs`)
- **Purpose**: Core email parsing and processing logic
- **Functions**:
  - `processEmail()` - Main email processing function
  - `manualEmailParse()` - Fallback parsing for edge cases
- **Features**:
  - Uses mailparser.js for robust MIME parsing
  - Handles attachments (files, inline images)
  - Supports multiple encodings (base64, quoted-printable)
  - Extracts metadata (subject, from, to, date, etc.)

### 3. S3 Operations (`s3-operations.mjs`)
- **Purpose**: S3 storage operations
- **Functions**:
  - `saveToS3()` - Save email data to S3 as JSON
- **Features**:
  - Structured storage with messageId-based keys
  - JSON formatting for easy retrieval

### 4. SNS Operations (`sns-operations.mjs`)
- **Purpose**: SNS message publishing
- **Functions**:
  - `publishToSNS()` - Publish processed email metadata to SNS
- **Features**:
  - Lightweight metadata for downstream processing
  - Includes messageId for S3 data retrieval

## Email Processing Flow

1. **SQS Trigger** → Lambda receives SQS message
2. **S3 Retrieval** → Extract email data from S3 object
3. **Email Parsing** → Use mailparser.js to parse MIME content
4. **Attachment Processing** → Save attachments to S3
5. **Data Storage** → Save parsed email data to S3
6. **SNS Publishing** → Publish metadata to SNS topic

## Dependencies

### Core Dependencies
- **mailparser** - Robust email parsing library
- **@aws-sdk/client-s3** - AWS S3 client
- **@aws-sdk/client-sns** - AWS SNS client
- **@aws-sdk/lib-storage** - S3 upload utilities
- **parse-multipart-data** - Multipart form data parsing

## Environment Variables

- `REGION` - AWS region for services
- `SENDGRID_INBOUND_PARSE_BUCKET` - S3 bucket for email storage
- `SNStopic` - SNS topic ARN for publishing

## Benefits of Modular Structure

1. **Maintainability** - Each module has a single responsibility
2. **Testability** - Functions can be tested independently
3. **Reusability** - Modules can be imported by other Lambda functions
4. **Readability** - Clear separation of concerns
5. **Debugging** - Easier to isolate and fix issues

## Error Handling

- **Primary parsing**: mailparser.js with automatic encoding detection
- **Fallback parsing**: Manual MIME parsing for edge cases
- **Graceful degradation**: Falls back to plain text if all parsing fails
- **Error propagation**: Errors are logged and can be handled by caller

## Performance Features

- **Asynchronous processing** - Parallel processing of email parts
- **Streaming uploads** - Efficient S3 uploads for large attachments
- **Memory efficient** - Processes data in chunks where possible
