---
description: Solutions to common issues encountered when using MBC CQRS Serverless.
---

# Common Issues

This page lists common issues and their solutions when working with MBC CQRS Serverless applications.

## Installation & Setup

### npm install fails with peer dependency errors

**Symptom**: npm install fails with peer dependency warnings or errors.

**Solution**:

```bash
# Use --legacy-peer-deps flag
npm install --legacy-peer-deps

# Or update npm to latest version
npm install -g npm@latest
```

### CLI command not found

**Symptom**: `mbc-cqrs` command is not recognized.

**Solution**:

```bash
# Install globally
npm install -g @mbc-cqrs-serverless/cli

# Or use npx
npx @mbc-cqrs-serverless/cli new my-app
```

### Docker services fail to start

**Symptom**: docker-compose up fails or services don't start.

**Solution**:

```bash
# Check Docker is running
docker info

# Clean up and restart
docker-compose -f infra-local/docker-compose.yml down -v
docker-compose -f infra-local/docker-compose.yml up -d

# Check logs for specific service
docker-compose -f infra-local/docker-compose.yml logs dynamodb-local
```

## Database Issues

### DynamoDB connection refused

**Symptom**: Cannot connect to DynamoDB Local.

**Solution**:

1. Verify DynamoDB Local is running:
```bash
docker ps | grep dynamodb
```

2. Check the endpoint URL in your configuration:
```typescript
// Should be http://localhost:8000 for local development
dynamodbEndpoint: 'http://localhost:8000'
```

3. Verify tables exist:
```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

### Prisma migration errors

**Symptom**: Prisma migrate fails with connection errors.

**Solution**:

1. Verify PostgreSQL is running:
```bash
docker ps | grep postgres
```

2. Check DATABASE_URL in .env:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/myapp?schema=public"
```

3. Reset and re-run migrations:
```bash
npx prisma migrate reset
npx prisma migrate dev
```

### DynamoDB throughput exceeded

**Symptom**: ProvisionedThroughputExceededException error.

**Solution**:

- For development: Use on-demand billing mode
- For production: Increase provisioned capacity or enable auto-scaling

```typescript
// CDK configuration for on-demand
const table = new dynamodb.Table(this, 'Table', {
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
});
```

## Lambda Errors

### Lambda timeout

**Symptom**: Task timed out after X seconds.

**Solution**:

1. Increase timeout in CDK:
```typescript
const handler = new lambda.Function(this, 'Handler', {
  timeout: cdk.Duration.seconds(30),
});
```

2. Optimize cold start:
- Reduce bundle size
- Use provisioned concurrency for critical functions
- Move initialization outside handler

### Lambda out of memory

**Symptom**: Runtime.ExitError or memory limit exceeded.

**Solution**:

```typescript
const handler = new lambda.Function(this, 'Handler', {
  memorySize: 1024, // Increase memory
});
```

### Module not found in Lambda

**Symptom**: Cannot find module 'xxx' error.

**Solution**:

1. Check bundling configuration:
```typescript
// Ensure dependencies are bundled
const handler = new lambda_nodejs.NodejsFunction(this, 'Handler', {
  bundling: {
    externalModules: [], // Don't exclude anything
  },
});
```

2. Verify package.json dependencies are correct

## Authentication Errors

### Cognito token invalid

**Symptom**: 401 Unauthorized or token validation fails.

**Solution**:

1. Verify Cognito configuration:
```typescript
// Check USER_POOL_ID and CLIENT_ID match
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

2. Check token expiration:
- Access tokens expire after 1 hour by default
- Implement token refresh logic

3. Verify issuer URL:
```typescript
const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
```

### CORS errors

**Symptom**: Access-Control-Allow-Origin error in browser.

**Solution**:

1. Configure CORS in API Gateway:
```typescript
const api = new apigateway.HttpApi(this, 'Api', {
  corsPreflight: {
    allowOrigins: ['http://localhost:3000', 'https://your-domain.com'],
    allowMethods: [apigateway.CorsHttpMethod.ANY],
    allowHeaders: ['Authorization', 'Content-Type'],
  },
});
```

2. Ensure OPTIONS requests are handled

## Event Processing

### Events not being processed

**Symptom**: DynamoDB streams or SQS messages not triggering handlers.

**Solution**:

1. Check event source mapping:
```bash
aws lambda list-event-source-mappings --function-name your-function
```

2. Verify handler is registered:
```typescript
@EventHandler(YourEvent)
export class YourEventHandler implements IEventHandler<YourEvent> {
  async execute(event: YourEvent): Promise<void> {
    // Handler implementation
  }
}
```

3. Check CloudWatch Logs for errors

### Duplicate event processing

**Symptom**: Same event processed multiple times.

**Solution**:

1. Implement idempotency:
```typescript
// Use a unique identifier to check if already processed
// For commands, use pk + sk + version as the idempotency key
const idempotencyKey = `${command.pk}#${command.sk}@${command.version}`;
if (await this.isProcessed(idempotencyKey)) {
  return; // Skip duplicate
}
```

2. Configure SQS visibility timeout appropriately

## Step Functions

### Step Function execution failed

**Symptom**: State machine execution fails with error.

**Solution**:

1. Check execution history in AWS Console:
   - Go to Step Functions → State machines → Your machine
   - Click on failed execution
   - Review error details in each step

2. Add error handling:
```typescript
// Add retry and catch in state machine definition
{
  "Retry": [
    {
      "ErrorEquals": ["States.TaskFailed"],
      "IntervalSeconds": 2,
      "MaxAttempts": 3,
      "BackoffRate": 2
    }
  ],
  "Catch": [
    {
      "ErrorEquals": ["States.ALL"],
      "Next": "HandleError"
    }
  ]
}
```

### Step Function timeout

**Symptom**: Execution times out.

**Solution**:

- Increase timeout in state machine definition
- Break long-running tasks into smaller steps
- Use wait states with callbacks for async operations

## Deployment Issues

### CDK deployment fails

**Symptom**: cdk deploy fails with CloudFormation error.

**Solution**:

1. Check CloudFormation events:
```bash
aws cloudformation describe-stack-events --stack-name YourStack
```

2. Common causes:
   - IAM permission issues
   - Resource limit exceeded
   - Invalid resource configuration

3. Roll back and fix:
```bash
aws cloudformation delete-stack --stack-name YourStack
# Fix the issue and redeploy
cdk deploy
```

### Resource already exists

**Symptom**: Resource with name X already exists.

**Solution**:

1. Use unique naming:
```typescript
const bucket = new s3.Bucket(this, 'Bucket', {
  bucketName: `${props.appName}-${props.envName}-${cdk.Aws.ACCOUNT_ID}`,
});
```

2. Or let CDK generate names by not specifying bucketName

## Performance Issues

### Slow API response times

**Symptom**: API responses take too long.

**Solution**:

1. Enable Lambda provisioned concurrency
2. Implement caching with API Gateway or DAX
3. Optimize database queries
4. Use connection pooling for RDS

### High Lambda costs

**Symptom**: Unexpectedly high Lambda billing.

**Solution**:

1. Review invocation counts and duration
2. Optimize memory allocation (more memory = faster execution)
3. Implement request batching
4. Use reserved concurrency to limit scaling

## Getting Help

If you can't find a solution here:

1. Check the [Debugging Guide](./debugging-guide) for investigation techniques
2. Search existing issues on GitHub
3. Create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Error messages and logs
   - Environment details (Node version, OS, etc.)
