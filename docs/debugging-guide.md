---
description: {{Learn debugging techniques for MBC CQRS Serverless applications.}}
---

# {{Debugging Guide}}

{{This guide covers debugging techniques for MBC CQRS Serverless applications in both local and AWS environments.}}

## {{Local Development Debugging}}

### {{Using NestJS REPL}}

{{The REPL (Read-Eval-Print Loop) allows interactive debugging:}}

```bash
npm run repl
```

{{In the REPL, you can:}}

```typescript
// Get a service instance
const todoService = await get(TodoService);

// Call methods directly
await todoService.findAll();

// Inspect module dependencies
debug(TodoModule);
```

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

  async create(dto: CreateTodoDto): Promise<Todo> {
    this.logger.debug(`Creating todo: ${JSON.stringify(dto)}`);

    try {
      const result = await this.commandService.publish(/* ... */);
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

### {{Enable X-Ray}}

```typescript
// In your main Lambda handler
import * as AWSXRay from 'aws-xray-sdk';

// Instrument AWS SDK
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
```

### {{Add Custom Segments}}

```typescript
import * as AWSXRay from 'aws-xray-sdk';

async function processOrder(orderId: string): Promise<void> {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('ProcessOrder');

  try {
    subsegment?.addAnnotation('orderId', orderId);
    // Process order
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

## {{Next Steps}}

- {{[Common Issues](./common-issues) - Known issues and solutions}}
- {{[Monitoring and Logging](./monitoring-logging) - Set up comprehensive monitoring}}
