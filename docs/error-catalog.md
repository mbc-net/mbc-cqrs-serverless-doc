---
sidebar_position: 2
description: {{Comprehensive error catalog with causes, solutions, and recovery strategies for MBC CQRS Serverless.}}
---

# {{Error Catalog}}

{{This catalog provides comprehensive documentation of errors encountered in MBC CQRS Serverless, including their causes, solutions, and recovery strategies.}}

## {{Command Service Errors}}

### BadRequestException: "The input is not a valid, item not found or version not match"

**{{Location}}**: `packages/core/src/commands/command.service.ts`

**{{Cause}}**: {{Optimistic locking failure. The version number in the request does not match the current version in the database.}}

**{{Solution}}**:
```typescript
// Option 1: Fetch latest version before update
const latest = await dataService.getItem({ pk, sk });
await commandService.publishPartialUpdateSync({
  pk,
  sk,
  version: latest.version,
  name: 'Updated Name',
}, options);

// Option 2: Use version: -1 for auto-fetch (async mode only)
await commandService.publishPartialUpdateAsync({
  pk,
  sk,
  version: -1,
  name: 'Updated Name',
}, options);

// Option 3: Implement retry logic
async function updateWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const latest = await dataService.getItem({ pk: data.pk, sk: data.sk });
      return await commandService.publishPartialUpdateSync({
        ...data,
        version: latest.version,
      }, options);
    } catch (error) {
      if (error.message.includes('version not match') && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 100 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}
```

---

### BadRequestException: "The input key is not a valid, item not found"

**{{Location}}**: `packages/core/src/commands/command.service.ts`

**{{Cause}}**: {{Attempting to update an item that does not exist in the database.}}

**{{Solution}}**:
```typescript
// Check if item exists first
const existing = await dataService.getItem({ pk, sk });
if (!existing) {
  // Create new item
  await commandService.publishAsync(newItem, options);
} else {
  // Update existing item
  await commandService.publishPartialUpdateAsync({
    pk,
    sk,
    version: existing.version,
    ...updates,
  }, options);
}
```

---

### BadRequestException: "Invalid input version"

**{{Location}}**: `packages/core/src/commands/command.service.ts`

**{{Cause}}**: {{Using a version in publishSync that does not match the latest saved version.}}

**{{Solution}}**: {{Fetch the latest item and use its version, or use version: -1 with async methods.}}

---

## {{Tenant Errors}}

### BadRequestException: "Tenant not found"

**{{Location}}**: `packages/tenant/src/services/tenant.service.ts`

**{{Cause}}**: {{The specified tenant does not exist or has been deleted.}}

**{{Solution}}**:
```typescript
// Verify tenant exists
try {
  const tenant = await tenantService.getTenant(tenantCode);
} catch (error) {
  if (error.message === 'Tenant not found') {
    // List available tenants
    const tenants = await tenantService.listTenants();
    console.log('Available tenants:', tenants.items.map(t => t.code));
  }
}
```

---

### BadRequestException: "Tenant code already existed"

**{{Location}}**: `packages/tenant/src/services/tenant.service.ts`

**{{Cause}}**: {{Attempting to create a tenant with an existing code.}}

**{{Solution}}**:
```typescript
// Check if tenant exists before creating
const existing = await tenantService.getTenant(tenantCode).catch(() => null);
if (existing) {
  console.log('Tenant already exists, using existing tenant');
} else {
  await tenantService.createTenant({ code: tenantCode, name: tenantName });
}
```

---

## {{Sequence Errors}}

### BadRequestException: "Sequence not found"

**{{Location}}**: `packages/sequence/src/services/sequence.service.ts`

**{{Cause}}**: {{The requested sequence key does not exist.}}

**{{Solution}}**:
```typescript
// Generate sequence - auto-initializes on first use
try {
  const result = await sequencesService.generateSequenceItem(
    {
      tenantCode,
      typeCode: 'ORDER',
    },
    { invokeContext },
  );
} catch (error) {
  // If error persists, check DynamoDB table permissions
}
```

---

## {{Task Errors}}

### BadRequestException: "Task not found"

**{{Location}}**: `packages/task/src/services/task.service.ts`

**{{Cause}}**: {{The specified task does not exist or has been completed/deleted.}}

**{{Solution}}**:
```typescript
// Verify task status before operations
const task = await taskService.getTask({ pk, sk });
if (!task) {
  throw new NotFoundException('Task not found');
}
if (task.status === 'completed') {
  throw new BadRequestException('Task already completed');
}
```

---

## {{Validation Errors}}

### BadRequestException: "Validation failed"

**{{Location}}**: `packages/core/src/pipe/class.validation.pipe.ts`

**{{Cause}}**: {{The request DTO failed class-validator validation.}}

**{{Common Validation Errors}}**:
```typescript
// Example DTO with validation
export class CreateOrderDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNotEmpty({ message: 'Code is required' })
  @Matches(/^[A-Z0-9-]+$/, { message: 'Code must be uppercase alphanumeric' })
  code: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}

// Common validation errors and fixes:
// - "name must be a string" -> Ensure name is string type
// - "code should not be empty" -> Provide code value
// - "amount must not be less than 0" -> Use positive number
```

**{{Solution}}**:
```typescript
// Validate before sending
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

const dto = plainToInstance(CreateOrderDto, requestBody);
const errors = await validate(dto);
if (errors.length > 0) {
  console.log('Validation errors:', errors.map(e => e.constraints));
}
```

---

## {{DynamoDB Errors}}

### ProvisionedThroughputExceededException

**{{Location}}**: AWS DynamoDB

**{{Cause}}**: {{Read or write capacity has been exceeded on on-demand or provisioned tables.}}

**{{Solution}}**:
```typescript
// Implement exponential backoff retry
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  baseDelay = 100
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.name === 'ProvisionedThroughputExceededException') {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 100;
        console.log(`Throughput exceeded, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

**{{Prevention}}**:
- {{Use on-demand capacity mode for unpredictable workloads}}
- {{Implement request batching to reduce write operations}}
- {{Use DAX for read-heavy workloads}}

---

### ConditionalCheckFailedException

**{{Location}}**: AWS DynamoDB

**{{Cause}}**: {{Optimistic locking condition failed (version mismatch) or unique constraint violation.}}

**{{Solution}}**:
```typescript
// Handle conditional check failure
try {
  await commandService.publishSync(item, options);
} catch (error) {
  if (error.name === 'ConditionalCheckFailedException') {
    // Refresh and retry
    const latest = await dataService.getItem({ pk, sk });
    await commandService.publishSync({
      ...item,
      version: latest.version,
    }, options);
  }
}
```

---

### ResourceNotFoundException

**{{Location}}**: AWS DynamoDB

**{{Cause}}**: {{The specified table or index does not exist.}}

**{{Solution}}**:
```bash
# Verify table exists
aws dynamodb describe-table --table-name your-table-name

# Check environment variable
echo $DYNAMODB_TABLE_NAME
```

---

### ValidationException: "One or more parameter values were invalid"

**{{Location}}**: AWS DynamoDB

**{{Cause}}**: {{Invalid key structure, empty string for non-key attribute, or reserved word conflict.}}

**{{Solution}}**:
```typescript
// Avoid empty strings
const item = {
  pk: 'ORDER#tenant001',
  sk: 'ORDER#ORD001',
  name: value || null,  // Use null instead of empty string
};

// Use expression attribute names for reserved words
const params = {
  ExpressionAttributeNames: {
    '#name': 'name',
    '#status': 'status',
  },
};
```

---

## {{Cognito Authentication Errors}}

### NotAuthorizedException

**{{Location}}**: AWS Cognito

**{{Cause}}**: {{Invalid credentials or token expired.}}

**{{Solution}}**:
```typescript
// Frontend: Refresh token
try {
  await Auth.currentSession();  // Auto-refreshes if needed
} catch (error) {
  if (error.name === 'NotAuthorizedException') {
    // Redirect to login
    await Auth.signOut();
    window.location.href = '/login';
  }
}
```

---

### UserNotFoundException

**{{Location}}**: AWS Cognito

**{{Cause}}**: {{User does not exist in the user pool.}}

**{{Solution}}**:
```typescript
// Check user exists before operations
try {
  const user = await adminGetUser({ Username: email });
} catch (error) {
  if (error.name === 'UserNotFoundException') {
    // Create new user or show registration form
  }
}
```

---

### UserNotConfirmedException

**{{Location}}**: AWS Cognito

**{{Cause}}**: {{User has not confirmed their email/phone.}}

**{{Solution}}**:
```typescript
try {
  await Auth.signIn(email, password);
} catch (error) {
  if (error.name === 'UserNotConfirmedException') {
    // Resend confirmation code
    await Auth.resendSignUp(email);
    // Redirect to confirmation page
  }
}
```

---

## {{Step Functions Errors}}

### TaskTimedOut

**{{Location}}**: AWS Step Functions

**{{Cause}}**: {{Lambda function did not respond within the configured timeout.}}

**{{Solution}}**:
```typescript
// Increase Lambda timeout in serverless.yml
functions:
  processTask:
    handler: handler.process
    timeout: 900  # 15 minutes max

// Or break into smaller chunks
async function processInChunks(items, chunkSize = 100) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await processChunk(chunk);
  }
}
```

---

### TaskFailed

**{{Location}}**: AWS Step Functions

**{{Cause}}**: {{Lambda function threw an unhandled error.}}

**{{Solution}}**:
```typescript
// Proper error handling with Step Functions
export async function handler(event: StepFunctionEvent) {
  try {
    const result = await processTask(event.input);

    // Send success callback
    await sfn.sendTaskSuccess({
      taskToken: event.taskToken,
      output: JSON.stringify(result),
    }).promise();
  } catch (error) {
    // Send failure callback
    await sfn.sendTaskFailure({
      taskToken: event.taskToken,
      error: error.name,
      cause: error.message,
    }).promise();
  }
}
```

---

## {{S3 Errors}}

### NoSuchKey

**{{Location}}**: AWS S3

**{{Cause}}**: {{The specified object does not exist in the bucket.}}

**{{Solution}}**:
```typescript
// Check if object exists before downloading
try {
  await s3.headObject({ Bucket: bucket, Key: key }).promise();
  const data = await s3.getObject({ Bucket: bucket, Key: key }).promise();
} catch (error) {
  if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
    console.log('File does not exist:', key);
    return null;
  }
  throw error;
}
```

---

### AccessDenied

**{{Location}}**: AWS S3

**{{Cause}}**: {{IAM policy does not allow the requested operation.}}

**{{Solution}}**:
```yaml
# Add required permissions in serverless.yml
provider:
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - s3:GetObject
            - s3:PutObject
            - s3:DeleteObject
          Resource:
            - arn:aws:s3:::${self:custom.bucketName}/*
```

---

## {{SQS Errors}}

### MessageNotInflight

**{{Location}}**: AWS SQS

**{{Cause}}**: {{Attempting to delete or change visibility of a message that is no longer in flight.}}

**{{Solution}}**:
```typescript
// Process messages within visibility timeout
export async function handler(event: SQSEvent) {
  for (const record of event.Records) {
    try {
      await processMessage(record);
      // Message auto-deleted on successful return
    } catch (error) {
      // Throw to keep message in queue for retry
      throw error;
    }
  }
}
```

---

## {{HTTP Status Code Reference}}

| {{Status}} | {{Exception}} | {{Meaning}} | {{Recovery Strategy}} |
|--------|-----------|---------|-------------------|
| 400 | BadRequestException | {{Invalid input or business rule violation}} | {{Fix request data}} |
| 401 | UnauthorizedException | {{Authentication missing or invalid}} | {{Refresh token or re-login}} |
| 403 | ForbiddenException | {{Authenticated but not authorized}} | {{Check user permissions}} |
| 404 | NotFoundException | {{Resource not found}} | {{Verify resource exists}} |
| 409 | ConflictException | {{Version conflict (optimistic locking)}} | {{Refresh and retry}} |
| 422 | UnprocessableEntityException | {{Validation failed}} | {{Fix validation errors}} |
| 429 | TooManyRequestsException | {{Rate limit exceeded}} | {{Implement backoff retry}} |
| 500 | InternalServerErrorException | {{Unexpected server error}} | {{Check logs, report bug}} |
| 502 | BadGatewayException | {{Upstream service error}} | {{Retry with backoff}} |
| 503 | ServiceUnavailableException | {{Service temporarily unavailable}} | {{Retry later}} |
| 504 | GatewayTimeoutException | {{Upstream service timeout}} | {{Increase timeout or optimize}} |

---

## {{Error Handling Best Practices}}

### {{1. Centralized Error Handler}}

```typescript
// Create a global exception filter
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error';

    // Log error with context
    console.error({
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      status,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### {{2. Retry with Exponential Backoff}}

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    retryableErrors?: string[];
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 100,
    maxDelay = 10000,
    retryableErrors = [
      'ProvisionedThroughputExceededException',
      'ThrottlingException',
      'ServiceUnavailable',
    ],
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!retryableErrors.includes(error.name) || attempt === maxRetries) {
        throw error;
      }

      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 100,
        maxDelay
      );

      console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

### {{3. Circuit Breaker Pattern}}

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

---

## {{Debugging Tips}}

1. **{{Enable debug logging}}**:
   ```bash
   DEBUG=* npm run offline
   ```

2. **{{Check CloudWatch logs for Lambda errors}}**:
   ```bash
   aws logs tail /aws/lambda/your-function-name --follow
   ```

3. **{{Use request IDs for tracing}}**:
   ```typescript
   console.log('RequestId:', context.awsRequestId);
   ```

4. **{{Verify environment variables}}**:
   ```typescript
   console.log('Config:', {
     table: process.env.DYNAMODB_TABLE_NAME,
     region: process.env.AWS_REGION,
   });
   ```

5. **{{Test locally with serverless-offline}}**:
   ```bash
   npm run offline -- --stage dev
   ```

## {{See Also}}

- {{[Debugging Guide](./debugging-guide) - Detailed debugging procedures}}
- {{[Common Issues](./common-issues) - Frequently encountered problems}}
- {{[Monitoring and Logging](./monitoring-logging) - Production monitoring setup}}
