---
description: {{Solutions to common issues encountered when using MBC CQRS Serverless.}}
---

# {{Common Issues}}

{{This page lists common issues and their solutions when working with MBC CQRS Serverless applications.}}

## {{Installation & Setup}} {#installation-setup}

### {{npm install fails with peer dependency errors}}

**{{Symptom}}**: {{npm install fails with peer dependency warnings or errors.}}

**{{Solution}}**:

```bash
# {{Use --legacy-peer-deps flag}}
npm install --legacy-peer-deps

# {{Or update npm to latest version}}
npm install -g npm@latest
```

### {{npm install fails with node-waf error}}

**{{Symptom}}**: {{npm install fails with `node-waf: command not found` error, typically from the zlib package.}}

```
npm error path node_modules/zlib
npm error command sh -c node-waf clean || true; node-waf configure build
npm error sh: node-waf: command not found
```

**{{Cause}}**: {{Some legacy serverless-offline plugins depend on packages that use the deprecated node-waf build tool.}}

**{{Solution}}**:

```bash
# {{Skip build scripts during installation}}
npm install --legacy-peer-deps --ignore-scripts

# {{Then run postinstall scripts manually}}
npx prisma generate
```

### {{CLI command not found}}

**{{Symptom}}**: {{`mbc-cqrs` command is not recognized.}}

**{{Solution}}**:

```bash
# {{Install globally}}
npm install -g @mbc-cqrs-serverless/cli

# {{Or use npx}}
npx @mbc-cqrs-serverless/cli new my-app
```

### {{Docker services fail to start}}

**{{Symptom}}**: {{docker-compose up fails or services don't start.}}

**{{Solution}}**:

```bash
# {{Check Docker is running}}
docker info

# {{Clean up and restart}}
docker-compose -f infra-local/docker-compose.yml down -v
docker-compose -f infra-local/docker-compose.yml up -d

# {{Check logs for specific service}}
docker-compose -f infra-local/docker-compose.yml logs dynamodb-local
```

## {{Database Issues}} {#database-issues}

### {{DynamoDB connection refused}}

**{{Symptom}}**: {{Cannot connect to DynamoDB Local.}}

**{{Solution}}**:

1. {{Verify DynamoDB Local is running:}}
```bash
docker ps | grep dynamodb
```

2. {{Check the endpoint URL in your configuration:}}
```typescript
// {{Should be http://localhost:8000 for local development}}
dynamodbEndpoint: 'http://localhost:8000'
```

3. {{Verify tables exist:}}
```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

### {{Prisma migration errors}}

**{{Symptom}}**: {{Prisma migrate fails with connection errors.}}

**{{Solution}}**:

1. {{Verify the database container is running (the scaffolded project uses MySQL by default):}}
```bash
docker ps | grep mysql
```

2. {{Check DATABASE_URL in .env matches your database. The scaffolded project default uses MySQL:}}
```bash
DATABASE_URL="mysql://root:RootCqrs@localhost:3306/cqrs?schema=public&connection_limit=1"
```

3. {{Reset and re-run migrations:}}
```bash
npx prisma migrate reset
npx prisma migrate dev
```

### {{Master API returns 500 Internal Server Error}}

**{{Symptom}}**: {{Master API endpoints (`/api/master-setting/list`, `/api/master-data/list`) return 500 Internal Server Error.}}

**{{Cause}}**: {{The Master module requires both DynamoDB tables and an RDS table. If the `masters` table doesn't exist in RDS, the API will fail with a 500 error.}}

**{{Solution}}**:

1. {{Verify the `masters` table exists in RDS:}}
```bash
# {{For MySQL}}
docker exec mysql mysql -u root -proot mydb -e "SHOW TABLES LIKE 'masters';"

# {{For PostgreSQL}}
docker exec postgres psql -U postgres -d mydb -c "\dt masters"
```

2. {{If the table is missing, add it to your Prisma schema:}}
```prisma
model Master {
  pk         String   @db.VarChar(256)
  sk         String   @db.VarChar(512)
  id         String   @id @db.VarChar(256)
  name       String   @db.VarChar(256)
  code       String   @db.VarChar(256)
  version    Int      @default(0)
  tenantCode String   @map("tenant_code") @db.VarChar(64)
  type       String   @db.VarChar(256)
  attributes Json?
  isDeleted  Boolean  @default(false) @map("is_deleted")
  createdAt  DateTime @default(now()) @map("created_at")
  createdBy  String   @default("system") @map("created_by") @db.VarChar(256)
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at")
  updatedBy  String   @default("system") @map("updated_by") @db.VarChar(256)

  @@unique([pk, sk])
  @@index([tenantCode])
  @@map("masters")
}
```

3. {{Run Prisma migration:}}
```bash
npx prisma migrate dev --name add_master_table
```

4. {{Verify the DynamoDB tables also exist:}}
```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000 | grep master
# {{Should show: master-command, master-data, master-history}}
```

### {{Serverless Offline fails with missing import_tmp stream}} {#missing-import-tmp-table}

**{{Symptom}}**: {{`npm run offline:sls` fails because the `LOCAL_DDB_IMPORT_TMP_STREAM` environment variable is not set.}}

**{{Cause}}**: {{The `import_tmp.json` table definition file is missing from `prisma/dynamodbs/`. Without it, `npm run migrate` cannot create the `import_tmp` DynamoDB table, so the stream ARN is never written to `.env`.}}

:::warning {{Known Issue (Fixed in v1.1.1)}}
{{In versions prior to v1.1.1, the `import_tmp.json` template was not included in CLI scaffolded projects. This was fixed in [version 1.1.1](/docs/changelog#v111).}}
:::

**{{Solution}}**:

{{Create `prisma/dynamodbs/import_tmp.json` with the following content:}}

```json
{
  "TableName": "import_tmp",
  "AttributeDefinitions": [
    { "AttributeName": "pk", "AttributeType": "S" },
    { "AttributeName": "sk", "AttributeType": "S" }
  ],
  "KeySchema": [
    { "AttributeName": "pk", "KeyType": "HASH" },
    { "AttributeName": "sk", "KeyType": "RANGE" }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "StreamSpecification": {
    "StreamEnabled": true,
    "StreamViewType": "NEW_IMAGE"
  },
  "TableClass": "STANDARD",
  "DeletionProtectionEnabled": true
}
```

{{Then re-run the migration:}}

```bash
npm run migrate
```

{{The migration script will automatically create the table and add the `LOCAL_DDB_IMPORT_TMP_STREAM` entry to your `.env` file.}}

### {{Version conflict (HTTP 409)}} {#version-conflict}

**{{Symptom}}**: {{API returns HTTP 409 Conflict when updating an item.}}

**{{Cause}}**: {{Two concurrent requests attempted to update the same item with the same version. The framework uses DynamoDB conditional writes (optimistic locking) — when two updates race, the second fails with `ConditionalCheckFailedException`, which the framework converts to HTTP 409.}}

**{{Solution}}**:

1. {{Retry the update after fetching the latest version:}}
```typescript
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { CommandService, DataService, IInvoke } from '@mbc-cqrs-serverless/core';

async function updateWithRetry(
  commandService: CommandService,
  dataService: DataService,
  pk: string,
  sk: string,
  updateData: object,
  invokeContext: IInvoke,
  maxRetries = 3,
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const current = await dataService.getItem({ pk, sk });
      return await commandService.publishAsync(
        { pk, sk, ...updateData, version: current?.version },
        { invokeContext },
      );
    } catch (error) {
      if (
        error instanceof ConditionalCheckFailedException ||
        (error as Error).name === 'ConditionalCheckFailedException'
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded due to version conflicts');
}
```

2. {{Or use `VERSION_LATEST = -1` to skip version checking (last writer wins):}}
```typescript
import { VERSION_LATEST } from '@mbc-cqrs-serverless/core';

await commandService.publishAsync(
  { pk, sk, ...updateData, version: VERSION_LATEST },
  { invokeContext },
);
```

{{See also: [Version Conflict Guide](/docs/version-conflict-guide)}}

### {{DynamoDB throughput exceeded}}

**{{Symptom}}**: {{ProvisionedThroughputExceededException error.}}

**{{Solution}}**:

- {{For development: Use on-demand billing mode}}
- {{For production: Increase provisioned capacity or enable auto-scaling}}

```typescript
// {{CDK configuration for on-demand}}
const table = new dynamodb.Table(this, 'Table', {
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
});
```

## {{Lambda Errors}} {#lambda-errors}

### {{Lambda timeout}}

**{{Symptom}}**: {{Task timed out after X seconds.}}

**{{Solution}}**:

1. {{Increase timeout in CDK:}}
```typescript
const handler = new lambda.Function(this, 'Handler', {
  timeout: cdk.Duration.seconds(30),
});
```

2. {{Optimize cold start:}}
- {{Reduce bundle size}}
- {{Use provisioned concurrency for critical functions}}
- {{Move initialization outside handler}}

### {{Lambda out of memory}}

**{{Symptom}}**: {{Runtime.ExitError or memory limit exceeded.}}

**{{Solution}}**:

```typescript
const handler = new lambda.Function(this, 'Handler', {
  memorySize: 1024, // {{Increase memory}}
});
```

### {{Module not found in Lambda}}

**{{Symptom}}**: {{Cannot find module 'xxx' error.}}

**{{Solution}}**:

1. {{Check bundling configuration:}}
```typescript
// {{Ensure dependencies are bundled}}
const handler = new lambda_nodejs.NodejsFunction(this, 'Handler', {
  bundling: {
    externalModules: [], // {{Don't exclude anything}}
  },
});
```

2. {{Verify package.json dependencies are correct}}

## {{Authentication Errors}} {#authentication-errors}

### {{Cognito token invalid}}

**{{Symptom}}**: {{401 Unauthorized or token validation fails.}}

**{{Solution}}**:

1. {{Verify Cognito configuration:}}
```bash
# {{Check USER_POOL_ID and USER_POOL_CLIENT_ID match}}
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxx
COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

2. {{Check token expiration:}}
- {{Access tokens expire after 1 hour by default}}
- {{Implement token refresh logic}}

3. {{Verify issuer URL:}}
```typescript
const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
```

### {{GroupRoleResolver causes DI scope conflict at startup (AP027)}}

**{{Symptom}}**: {{Application fails to start with a NestJS dependency injection error mentioning a scope conflict or duplicate provider for `GroupRoleResolver`.}}

**{{Cause}}**: {{The resolver class has both `@GroupRoleResolver()` and `@Injectable()` decorators. `@GroupRoleResolver()` already registers the class as a singleton provider — adding `@Injectable()` creates a conflicting second registration (AP027 anti-pattern).}}

**{{Solution}}**: {{Remove `@Injectable()` from the resolver class:}}

```typescript
// {{Incorrect — causes AP027: both decorators conflict}}
@Injectable()
@GroupRoleResolver()
export class AppGroupRoleResolver implements IGroupRoleResolver { ... }

// {{Correct — only @GroupRoleResolver()}}
@GroupRoleResolver()
export class AppGroupRoleResolver implements IGroupRoleResolver { ... }
```

{{The `mbc_check_anti_patterns` MCP tool flags this as AP027. See [Authentication — Group-Based Roles](/docs/authentication#group-based-roles) for complete usage.}}

### {{CORS errors}}

**{{Symptom}}**: {{Access-Control-Allow-Origin error in browser.}}

**{{Solution}}**:

1. {{Configure CORS in API Gateway:}}
```typescript
const api = new apigateway.HttpApi(this, 'Api', {
  corsPreflight: {
    allowOrigins: ['http://localhost:3000', 'https://your-domain.com'],
    allowMethods: [apigateway.CorsHttpMethod.ANY],
    allowHeaders: ['Authorization', 'Content-Type'],
  },
});
```

2. {{Ensure OPTIONS requests are handled}}

## {{Event Processing}} {#event-processing}

### {{Events not being processed}}

**{{Symptom}}**: {{DynamoDB streams or SQS messages not triggering handlers.}}

**{{Solution}}**:

1. {{Check event source mapping:}}
```bash
aws lambda list-event-source-mappings --function-name your-function
```

2. {{Verify handler is registered:}}
```typescript
@EventHandler(YourEvent)
export class YourEventHandler implements IEventHandler<YourEvent> {
  async execute(event: YourEvent): Promise<void> {
    // {{Handler implementation}}
  }
}
```

3. {{Check CloudWatch Logs for errors}}

### {{Duplicate event processing}}

**{{Symptom}}**: {{Same event processed multiple times.}}

**{{Solution}}**:

1. {{Implement idempotency:}}
```typescript
// {{Use a unique identifier to check if already processed}}
// {{For commands, use pk + sk + version as the idempotency key}}
const idempotencyKey = `${command.pk}#${command.sk}@${command.version}`;
if (await this.isProcessed(idempotencyKey)) {
  return; // {{Skip duplicate}}
}
```

2. {{Configure SQS visibility timeout appropriately}}

## {{Step Functions}} {#step-functions}

### {{Step Function execution failed}}

**{{Symptom}}**: {{State machine execution fails with error.}}

**{{Solution}}**:

1. {{Check execution history in AWS Console:}}
   - {{Go to Step Functions → State machines → Your machine}}
   - {{Click on failed execution}}
   - {{Review error details in each step}}

2. {{Add error handling:}}
```typescript
// {{Add retry and catch in state machine definition}}
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

### {{Step Function timeout}}

**{{Symptom}}**: {{Execution times out.}}

**{{Solution}}**:

- {{Increase timeout in state machine definition}}
- {{Break long-running tasks into smaller steps}}
- {{Use wait states with callbacks for async operations}}

## {{Deployment Issues}} {#deployment-issues}

### {{CDK deployment fails}}

**{{Symptom}}**: {{cdk deploy fails with CloudFormation error.}}

**{{Solution}}**:

1. {{Check CloudFormation events:}}
```bash
aws cloudformation describe-stack-events --stack-name YourStack
```

2. {{Common causes:}}
   - {{IAM permission issues}}
   - {{Resource limit exceeded}}
   - {{Invalid resource configuration}}

3. {{Roll back and fix:}}
```bash
aws cloudformation delete-stack --stack-name YourStack
# {{Fix the issue and redeploy}}
cdk deploy
```

### {{Resource already exists}}

**{{Symptom}}**: {{Resource with name X already exists.}}

**{{Solution}}**:

1. {{Use unique naming:}}
```typescript
const bucket = new s3.Bucket(this, 'Bucket', {
  bucketName: `${props.appName}-${props.envName}-${cdk.Aws.ACCOUNT_ID}`,
});
```

2. {{Or let CDK generate names by not specifying bucketName}}

## {{Performance Issues}} {#performance-issues}

### {{Slow API response times}}

**{{Symptom}}**: {{API responses take too long.}}

**{{Solution}}**:

1. {{Enable Lambda provisioned concurrency}}
2. {{Implement caching with API Gateway or DAX}}
3. {{Optimize database queries}}
4. {{Use connection pooling for RDS}}

### {{High Lambda costs}}

**{{Symptom}}**: {{Unexpectedly high Lambda billing.}}

**{{Solution}}**:

1. {{Review invocation counts and duration}}
2. {{Optimize memory allocation (more memory = faster execution)}}
3. {{Implement request batching}}
4. {{Use reserved concurrency to limit scaling}}

## {{Notifications & Real-time Events}} {#notifications-realtime}

### {{AppSync Events API not publishing notifications}} {#appsync-events-not-publishing}

**{{Symptom}}**: {{Clients subscribed via the AppSync Events API do not receive notifications after commands are processed (v1.3.0+).}}

**{{Checklist}}**:

1. {{Verify the environment variable is set:}}
```bash
NOTIFICATION_TRANSPORTS=appsync-event
# {{Or, to dual-publish to both GraphQL and Events API:}}
NOTIFICATION_TRANSPORTS=appsync-graphql,appsync-event
```

2. {{Confirm `APPSYNC_EVENTS_ENDPOINT` points to the Events API URL — it ends in `/event`, not `/graphql`:}}
```bash
# {{Correct}}
APPSYNC_EVENTS_ENDPOINT=https://xxxx.appsync-api.ap-northeast-1.amazonaws.com/event
```

3. {{Check IAM permissions — Lambda/ECS execution role must have `appsync:EventPublish` on the Event API ARN. The CDK template adds this automatically via `grantPublish()`.}}

4. {{Verify the channel namespace — `APPSYNC_EVENTS_NAMESPACE` must match a pre-created namespace in your AppSync Event API (default: `default`).}}

5. {{Check CloudWatch Logs for publish errors:}}
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/your-function \
  --filter-pattern "appsync"
```

{{See [AppSync Events API](/docs/notification-module#appsync-events-service) for full setup instructions.}}

## {{Getting Help}} {#getting-help}

{{If you can't find a solution here:}}

1. {{Check the [Debugging Guide](/docs/debugging-guide) for investigation techniques}}
2. {{Search existing issues on GitHub}}
3. {{Create a new issue with:}}
   - {{Clear description of the problem}}
   - {{Steps to reproduce}}
   - {{Error messages and logs}}
   - {{Environment details (Node version, OS, etc.)}}


## {{Related Documentation}}

- [{{Debugging Guide}}](/docs/debugging-guide) - {{Detailed debugging procedures}}
- [{{Error Catalog}}](/docs/error-catalog) - {{Error codes and solutions}}
- [{{Monitoring and Logging}}](/docs/monitoring-logging) - {{Production monitoring setup}}
