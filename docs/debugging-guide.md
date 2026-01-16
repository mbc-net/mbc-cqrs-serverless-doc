---
description: {{Learn debugging techniques for MBC CQRS Serverless applications.}}
---

# {{Debugging Guide}}

{{This guide covers debugging techniques for MBC CQRS Serverless applications in both local and AWS environments.}}

## {{Local Development Debugging}}

### {{Using NestJS REPL}}

{{The REPL (Read-Eval-Print Loop) allows interactive debugging:}}

```bash
npm run start:repl
```

{{In the REPL, you can:}}

```typescript
// {{Get a service instance}}
> get(TodoService)
TodoService { ... }

// {{Call methods directly}}
> await get(TodoService).findAll()
[{ id: '1', title: 'Test' }, ...]

// {{Show available methods on a service}}
> methods(TodoService)
Methods:
 ◻ findAll
 ◻ findOne
 ◻ create
 ◻ update
 ◻ delete
```

{{For more details on NestJS REPL, see the [NestJS REPL documentation](https://docs.nestjs.com/recipes/repl).}}

### {{VS Code Debugging}}

{{Create a `.vscode/launch.json` configuration:}}

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Serverless Offline",
      "program": "${workspaceFolder}/node_modules/.bin/serverless",
      "args": ["offline", "start"],
      "cwd": "${workspaceFolder}/infra-local",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--watchAll=false"],
      "console": "integratedTerminal"
    }
  ]
}
```

### {{Serverless Offline Debugging}}

{{Enable detailed logging with Serverless Offline:}}

```bash
SLS_DEBUG=* npm run offline:sls
```

{{Or add to serverless.yml:}}

```yaml
custom:
  serverless-offline:
    httpPort: 3000
    lambdaPort: 3002
    printOutput: true
```

### {{Console Logging}}

{{Use structured logging for easier debugging:}}

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class TodoService {
  private readonly logger = new Logger(TodoService.name);

  async create(dto: CreateTodoDto, invokeContext: IInvoke): Promise<Todo> {
    this.logger.debug(`Creating todo: ${JSON.stringify(dto)}`);

    try {
      const result = await this.commandService.publishAsync(entity, { invokeContext });
      this.logger.log(`Todo created: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create todo: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

## {{DynamoDB Debugging}}

### {{View Table Contents}}

{{Using AWS CLI with DynamoDB Local:}}

```bash
# List tables
aws dynamodb list-tables --endpoint-url http://localhost:8000

# Scan table
aws dynamodb scan \
  --table-name your-table-name \
  --endpoint-url http://localhost:8000

# Query by partition key
aws dynamodb query \
  --table-name your-table-name \
  --key-condition-expression "pk = :pk" \
  --expression-attribute-values '{":pk":{"S":"TODO#123"}}' \
  --endpoint-url http://localhost:8000
```

### {{DynamoDB Streams}}

{{Debug stream records:}}

```typescript
@EventHandler(DataSyncEvent)
export class DebugHandler implements IEventHandler<DataSyncEvent> {
  async execute(event: DataSyncEvent): Promise<void> {
    console.log('Stream record:', JSON.stringify(event.record, null, 2));
    console.log('Event name:', event.eventName);
    console.log('New image:', event.newImage);
    console.log('Old image:', event.oldImage);
  }
}
```

## {{CloudWatch Logs}}

### {{Viewing Logs}}

{{Use AWS CLI to tail logs:}}

```bash
# Find log group
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/your-app

# Tail logs
aws logs tail /aws/lambda/your-app-dev-handler --follow

# Filter logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/your-app-dev-handler \
  --filter-pattern "ERROR"
```

### {{Log Insights Queries}}

{{Use CloudWatch Logs Insights for advanced queries:}}

```
# Find errors
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100

# Analyze cold starts
fields @timestamp, @message, @duration
| filter @type = "REPORT"
| stats avg(@duration), max(@duration), count(*) by bin(1h)

# Find slow requests
fields @timestamp, @message, @duration
| filter @duration > 3000
| sort @duration desc
| limit 20
```

### {{Structured Log Analysis}}

{{If using structured logging:}}

```
fields @timestamp, level, message, context
| filter level = "error"
| sort @timestamp desc
```

## {{Step Functions Debugging}}

### {{Execution History}}

{{View execution in AWS Console:}}

1. {{Go to Step Functions → State machines}}
2. {{Select your state machine}}
3. {{Click on an execution}}
4. {{View the visual workflow with step status}}

### {{Event History}}

{{Using AWS CLI:}}

```bash
# List executions
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:REGION:ACCOUNT:stateMachine:YourMachine

# Get execution details
aws stepfunctions describe-execution \
  --execution-arn arn:aws:states:REGION:ACCOUNT:execution:YourMachine:execution-id

# Get execution history
aws stepfunctions get-execution-history \
  --execution-arn arn:aws:states:REGION:ACCOUNT:execution:YourMachine:execution-id
```

### {{Debug with CloudWatch}}

{{Enable logging in Step Functions:}}

```typescript
const stateMachine = new sfn.StateMachine(this, 'StateMachine', {
  definition: definition,
  logs: {
    destination: new logs.LogGroup(this, 'StateMachineLogGroup'),
    level: sfn.LogLevel.ALL,
  },
  tracingEnabled: true, // Enable X-Ray
});
```

## {{API Gateway Debugging}}

### {{Enable Access Logs}}

```typescript
const api = new apigateway.HttpApi(this, 'Api');

const stage = api.defaultStage?.node.defaultChild as apigateway.CfnStage;
stage.accessLogSettings = {
  destinationArn: logGroup.logGroupArn,
  format: JSON.stringify({
    requestId: '$context.requestId',
    ip: '$context.identity.sourceIp',
    method: '$context.httpMethod',
    path: '$context.path',
    status: '$context.status',
    latency: '$context.responseLatency',
    error: '$context.error.message',
  }),
};
```

### {{Test Endpoints}}

{{Use curl with verbose output:}}

```bash
curl -v -X POST https://your-api.execute-api.region.amazonaws.com/todos \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Todo"}'
```

## {{X-Ray Tracing}}

{{X-Ray tracing is automatically enabled at the CDK level for Lambda functions and API Gateway. SDK-level instrumentation with `aws-xray-sdk` is optional for additional tracing capabilities.}}

### {{CDK-Level Configuration}}

{{X-Ray is enabled by default in the CDK infrastructure:}}

```typescript
// {{Lambda functions have X-Ray tracing enabled by default}}
const handler = new NodejsFunction(this, 'Handler', {
  // ...
  tracing: lambda.Tracing.ACTIVE, // {{Enabled by default}}
});

// {{Step Functions can also enable X-Ray}}
const stateMachine = new sfn.StateMachine(this, 'StateMachine', {
  definition: definition,
  tracingEnabled: true, // {{Enable X-Ray}}
});
```

### {{Optional: SDK-Level Instrumentation}}

{{For more detailed tracing, you can optionally install and configure the X-Ray SDK:}}

```bash
npm install aws-xray-sdk
```

```typescript
// {{Optional: Instrument AWS SDK for detailed tracing}}
import * as AWSXRay from 'aws-xray-sdk';
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
```

### {{Add Custom Segments}}

{{If you need custom subsegments for detailed tracing:}}

```typescript
import * as AWSXRay from 'aws-xray-sdk';

async function processOrder(orderId: string): Promise<void> {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('ProcessOrder');

  try {
    subsegment?.addAnnotation('orderId', orderId);
    // {{Process order}}
    subsegment?.addMetadata('result', { status: 'success' });
  } catch (error) {
    subsegment?.addError(error);
    throw error;
  } finally {
    subsegment?.close();
  }
}
```

## {{Common Debugging Patterns}}

### {{Request Correlation}}

{{Add correlation IDs to trace requests:}}

```typescript
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    req['correlationId'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
```

### {{Debug Environment Variables}}

```typescript
// Log environment on startup (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    AWS_REGION: process.env.AWS_REGION,
    DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
  });
}
```

### {{Conditional Debugging}}

```typescript
const DEBUG = process.env.DEBUG === 'true';

function debugLog(message: string, data?: any): void {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}
```

## {{Troubleshooting Checklist}}

{{When debugging an issue:}}

1. **{{Reproduce locally}}**: {{Can you reproduce in local environment?}}
2. **{{Check logs}}**: {{Review CloudWatch Logs for errors}}
3. **{{Verify configuration}}**: {{Check environment variables and settings}}
4. **{{Test isolation}}**: {{Test components individually}}
5. **{{Check permissions}}**: {{Verify IAM roles and policies}}
6. **{{Review recent changes}}**: {{What changed since it last worked?}}
7. **{{Check dependencies}}**: {{Are all services healthy?}}

## {{Local Step Functions Debugging}}

{{The framework includes support for AWS Step Functions Local, allowing you to test and debug Step Functions workflows in your local development environment.}}

### {{Starting Step Functions Local}}

{{Step Functions Local runs as a Docker container alongside other local services:}}

```bash
# {{Start all local services including Step Functions}}
cd infra-local
docker-compose up -d
```

{{The Step Functions Local service runs on port 8083 and connects to your local Lambda functions.}}

### {{Creating State Machines Locally}}

{{Use the AWS CLI to create state machines in Step Functions Local:}}

```bash
# {{Create state machine from definition}}
aws stepfunctions create-state-machine \
  --endpoint-url http://localhost:8083 \
  --name command \
  --definition file://state-machine-definition.json \
  --role-arn "arn:aws:iam::101010101010:role/DummyRole"
```

### {{Starting and Monitoring Executions}}

{{Start and monitor Step Functions executions locally:}}

```bash
# {{Start an execution}}
aws stepfunctions start-execution \
  --endpoint-url http://localhost:8083 \
  --state-machine-arn arn:aws:states:ap-northeast-1:101010101010:stateMachine:command \
  --input '{"pk":"TODO#tenant","sk":"item#001@1"}'

# {{List executions}}
aws stepfunctions list-executions \
  --endpoint-url http://localhost:8083 \
  --state-machine-arn arn:aws:states:ap-northeast-1:101010101010:stateMachine:command

# {{Get execution history}}
aws stepfunctions get-execution-history \
  --endpoint-url http://localhost:8083 \
  --execution-arn arn:aws:states:ap-northeast-1:101010101010:execution:command:execution-id
```

### {{Debugging waitForTaskToken}}

{{When debugging Step Functions that use waitForTaskToken (like the command processing workflow), you can manually send task success or failure:}}

```bash
# {{Send task success}}
aws stepfunctions send-task-success \
  --endpoint-url http://localhost:8083 \
  --task-token "YOUR_TASK_TOKEN" \
  --task-output '{"Payload":[[{"result":0}]]}'

# {{Send task failure}}
aws stepfunctions send-task-failure \
  --endpoint-url http://localhost:8083 \
  --task-token "YOUR_TASK_TOKEN" \
  --cause "Debug failure" \
  --error "TestError"
```

## {{Production Debugging with CloudWatch}}

### {{Lambda Log Analysis}}

{{Each Lambda function writes logs to CloudWatch. Use these patterns to analyze production issues:}}

```bash
# {{Find log groups for your application}}
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/prod-myapp

# {{Get recent log events}}
aws logs get-log-events \
  --log-group-name /aws/lambda/prod-myapp-handler \
  --log-stream-name '2024/01/15/[$LATEST]abc123' \
  --limit 100

# {{Filter for errors in the last hour}}
aws logs filter-log-events \
  --log-group-name /aws/lambda/prod-myapp-handler \
  --start-time $(date -d '1 hour ago' +%s000) \
  --filter-pattern "ERROR"
```

### {{Step Functions Execution Analysis}}

{{For production Step Functions debugging:}}

```bash
# {{List failed executions}}
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:REGION:ACCOUNT:stateMachine:command \
  --status-filter FAILED

# {{Get detailed execution history}}
aws stepfunctions get-execution-history \
  --execution-arn arn:aws:states:REGION:ACCOUNT:execution:command:exec-id \
  --include-execution-data

# {{Describe execution for input/output}}
aws stepfunctions describe-execution \
  --execution-arn arn:aws:states:REGION:ACCOUNT:execution:command:exec-id
```

### {{CloudWatch Logs Insights for CQRS}}

{{Use these CloudWatch Logs Insights queries tailored for MBC CQRS applications:}}

```
# {{Find version conflicts}}
fields @timestamp, @message
| filter @message like /version not match|ConditionalCheckFailed/
| sort @timestamp desc
| limit 50

# {{Track command processing}}
fields @timestamp, @message
| filter @message like /publish|publishSync|publishAsync/
| parse @message "pk=* sk=*" as pk, sk
| sort @timestamp desc
| limit 100

# {{Analyze data sync operations}}
fields @timestamp, @message
| filter @message like /DataSyncHandler|sync_data/
| sort @timestamp desc
| limit 100

# {{Find Step Functions timeouts}}
fields @timestamp, @message
| filter @message like /waitForTaskToken|taskToken/
| sort @timestamp desc
| limit 50
```

## {{Version Conflict Debugging}}

{{Version conflicts occur when multiple processes attempt to update the same item simultaneously. The framework uses optimistic locking to ensure data consistency.}}

### {{Understanding Version Numbers}}

{{In MBC CQRS Serverless, version management works as follows:}}

- {{Sort key (sk) format: `ITEM#code@version` (e.g., `TODO#001@3`)}}
- {{Version separator: `@`}}
- {{VERSION_FIRST: `0` (initial version)}}
- {{VERSION_LATEST: `-1` (auto-fetch latest version)}}

### {{Identifying Version Conflicts}}

{{Check the command table for version history:}}

```bash
# {{Query all versions of an item}}
aws dynamodb query \
  --table-name prod-myapp-command \
  --endpoint-url http://localhost:8000 \
  --key-condition-expression "pk = :pk AND begins_with(sk, :sk)" \
  --expression-attribute-values '{
    ":pk": {"S": "TODO#tenant"},
    ":sk": {"S": "TODO#001@"}
  }' \
  --scan-index-forward false
```

### {{Resolving Version Conflicts}}

```typescript
// {{Option 1: Use VERSION_LATEST (-1) for auto-versioning}}
await commandService.publishPartialUpdateAsync({
  pk: 'TODO#tenant',
  sk: 'TODO#001',
  version: -1,  // {{Auto-fetches latest version}}
  name: 'Updated Name',
}, options);

// {{Option 2: Fetch and retry pattern}}
async function updateWithRetry(pk: string, sk: string, updates: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const latest = await dataService.getItem({ pk, sk });
      return await commandService.publishPartialUpdateSync({
        pk,
        sk,
        version: latest.version,
        ...updates,
      }, options);
    } catch (error) {
      if (error.message.includes('version not match') && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 100 * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
}
```

## {{Inspecting DynamoDB Command History}}

{{The command table stores a complete history of all commands, enabling full audit trails and debugging.}}

### {{Table Structure}}

{{The framework uses two DynamoDB tables per module:}}

- {{`{env}-{app}-{module}-command`: Stores command history with versions}}
- {{`{env}-{app}-{module}-data`: Stores current state (latest version)}}

### {{Querying Command History}}

```bash
# {{Get the latest version from data table}}
aws dynamodb get-item \
  --table-name dev-myapp-sample-data \
  --endpoint-url http://localhost:8000 \
  --key '{"pk":{"S":"TODO#tenant"},"sk":{"S":"TODO#001"}}'

# {{Get all command versions}}
aws dynamodb query \
  --table-name dev-myapp-sample-command \
  --endpoint-url http://localhost:8000 \
  --key-condition-expression "pk = :pk AND begins_with(sk, :sk)" \
  --expression-attribute-values '{
    ":pk": {"S": "TODO#tenant"},
    ":sk": {"S": "TODO#001@"}
  }' \
  --projection-expression "pk, sk, version, createdAt, createdBy, #s, requestId" \
  --expression-attribute-names '{"#s": "source"}' \
  --scan-index-forward false

# {{Get a specific version}}
aws dynamodb get-item \
  --table-name dev-myapp-sample-command \
  --endpoint-url http://localhost:8000 \
  --key '{"pk":{"S":"TODO#tenant"},"sk":{"S":"TODO#001@3"}}'
```

### {{Using DynamoDB Admin UI}}

{{DynamoDB Admin provides a web interface for browsing local DynamoDB tables:}}

1. {{Access http://localhost:8001 when running local services}}
2. {{Select your table (e.g., `dev-myapp-sample-command`)}}
3. {{Use filters to find specific items by pk or sk}}

### {{Programmatic History Access}}

```typescript
import { DynamoDbService } from '@mbc-cqrs-serverless/core';

// {{Get all versions of an item}}
async function getCommandHistory(pk: string, baseSk: string) {
  const result = await dynamoDbService.listItemsByPk(
    commandTableName,
    pk,
    {
      skExpession: 'begins_with(sk, :sk)',
      skAttributeValues: { ':sk': `${baseSk}@` },
    },
    undefined,
    100,
    'desc', // {{Latest first}}
  );
  return result.items;
}
```

## {{Common Debugging Scenarios}}

### {{Scenario 1: Command Not Appearing in Data Table}}

{{Symptoms: Command was published but data table shows old version.}}

{{Debugging steps:}}

1. {{Check command table for the new version:}}
   ```bash
   aws dynamodb query --table-name dev-myapp-sample-command \
     --endpoint-url http://localhost:8000 \
     --key-condition-expression "pk = :pk" \
     --expression-attribute-values '{":pk":{"S":"TODO#tenant"}}' \
     --scan-index-forward false --limit 5
   ```

2. {{Check DynamoDB Streams is enabled and processing:}}
   - {{Verify LOCAL_DDB_SAMPLE_STREAM is set in .env}}
   - {{Check Lambda logs for stream processing errors}}

3. {{Check Step Functions execution:}}
   ```bash
   aws stepfunctions list-executions \
     --endpoint-url http://localhost:8083 \
     --state-machine-arn arn:aws:states:ap-northeast-1:101010101010:stateMachine:command \
     --status-filter RUNNING
   ```

4. {{Verify data sync handlers are registered:}}
   ```typescript
   // {{Check in your module}}
   @Module({
     imports: [
       CommandModule.register({
         tableName: 'sample',
         dataSyncHandlers: [YourSyncHandler], // {{Ensure registered}}
       }),
     ],
   })
   ```

### {{Scenario 2: Step Function Stuck in RUNNING State}}

{{Symptoms: Step Functions execution never completes.}}

{{Debugging steps:}}

1. {{Get execution details:}}
   ```bash
   aws stepfunctions describe-execution \
     --endpoint-url http://localhost:8083 \
     --execution-arn YOUR_EXECUTION_ARN
   ```

2. {{Check if waiting for taskToken:}}
   - {{If stuck at `wait_prev_command`, a previous version is still processing}}
   - {{Check if the previous command's taskToken callback was sent}}

3. {{Check command table for taskToken:}}
   ```bash
   aws dynamodb get-item \
     --table-name dev-myapp-sample-command \
     --endpoint-url http://localhost:8000 \
     --key '{"pk":{"S":"TODO#tenant"},"sk":{"S":"TODO#001@2"}}' \
     --projection-expression "taskToken, version, #s" \
     --expression-attribute-names '{"#s": "status"}'
   ```

4. {{Manually resume if needed (for debugging only):}}
   ```bash
   aws stepfunctions send-task-success \
     --endpoint-url http://localhost:8083 \
     --task-token "TASK_TOKEN_FROM_COMMAND" \
     --task-output '{"Payload":[[{"result":0}]]}'
   ```

### {{Scenario 3: Duplicate Commands Being Processed}}

{{Symptoms: Same command processed multiple times.}}

{{Debugging steps:}}

1. {{Check for multiple versions with same data:}}
   ```bash
   aws dynamodb query --table-name dev-myapp-sample-command \
     --endpoint-url http://localhost:8000 \
     --key-condition-expression "pk = :pk AND begins_with(sk, :sk)" \
     --expression-attribute-values '{":pk":{"S":"TODO#tenant"},":sk":{"S":"TODO#001@"}}' \
     --projection-expression "sk, version, requestId, createdAt"
   ```

2. {{Compare requestId values to identify duplicate submissions}}

3. {{Check if client is retrying on timeout:}}
   - {{Review client-side error handling}}
   - {{Implement idempotency keys}}

### {{Scenario 4: Data Sync Handler Not Executing}}

{{Symptoms: Command saved but external systems not updated.}}

{{Debugging steps:}}

1. {{Verify handler is decorated correctly:}}
   ```typescript
   @DataSyncHandler({
     tableName: 'sample',
     type: 'custom-sync',
   })
   export class CustomSyncHandler implements IDataSyncHandler {
     // ...
   }
   ```

2. {{Check if handler is discovered:}}
   - {{Enable debug logging: `DEBUG=* npm run offline`}}
   - {{Look for "find data sync handlers from decorator" message}}

3. {{Add debugging to handler:}}
   ```typescript
   async up(command: CommandModel): Promise<void> {
     this.logger.debug(`CustomSyncHandler.up called: ${command.pk}#${command.sk}`);
     // {{Your sync logic}}
   }
   ```

### {{Scenario 5: X-Ray Traces Not Appearing}}

{{Symptoms: X-Ray service map or traces not visible.}}

{{Debugging steps:}}

1. {{Verify X-Ray is enabled in CDK:}}
   ```typescript
   // {{Check Lambda function configuration}}
   const handler = new NodejsFunction(this, 'Handler', {
     tracing: lambda.Tracing.ACTIVE, // {{Should be ACTIVE}}
   });
   ```

2. {{Check IAM permissions include X-Ray:}}
   ```json
   {
     "Effect": "Allow",
     "Action": [
       "xray:PutTraceSegments",
       "xray:PutTelemetryRecords"
     ],
     "Resource": "*"
   }
   ```

3. {{For SDK instrumentation, verify setup:}}
   ```typescript
   import * as AWSXRay from 'aws-xray-sdk';
   // {{Must be called before any AWS SDK usage}}
   const AWS = AWSXRay.captureAWS(require('aws-sdk'));
   ```

## {{Next Steps}}

- {{[Common Issues](./common-issues) - Known issues and solutions}}
- {{[Monitoring and Logging](./monitoring-logging) - Set up comprehensive monitoring}}
