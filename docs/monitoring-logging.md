---
description: {{Set up monitoring and logging for your MBC CQRS Serverless application.}}
---

# {{Monitoring and Logging}}

{{This guide covers setting up comprehensive monitoring and logging for MBC CQRS Serverless applications on AWS.}}

## {{Overview}}

{{A complete observability strategy includes:}}

- **{{Logging}}**: {{Capturing application events and errors}}
- **{{Metrics}}**: {{Measuring performance and usage}}
- **{{Tracing}}**: {{Following requests across services}}
- **{{Alerting}}**: {{Notifying on issues}}

### {{Built-in Features}}

{{The MBC CQRS Serverless framework provides the following observability features out-of-the-box:}}

- **{{RequestLogger}}**: {{Extended NestJS logger with context (tenantCode, userId, requestId, sourceIp)}}
- **{{AWS X-Ray Tracing}}**: {{Enabled by default in the CDK template for Lambda and Step Functions}}
- **{{JSON Logging Format}}**: {{Lambda functions log in JSON format for easy querying}}
- **{{Configurable Log Levels}}**: {{Set via LOG_LEVEL environment variable}}

:::info {{AWS Services Guidance}}
{{The sections below provide guidance on setting up additional AWS CloudWatch features (metrics, dashboards, alarms). These are not built into the framework but are recommended patterns for production deployments.}}
:::

## {{CloudWatch Logs}}

### {{Lambda Logging}}

{{The framework includes a built-in RequestLogger that automatically adds context to your logs:}}

```typescript
// {{The framework's RequestLogger is used automatically}}
// {{Log output includes: context, requestId, ip, tenantCode, userId}}

import { Logger, Injectable } from '@nestjs/common';

@Injectable()
export class YourService {
  private readonly logger = new Logger(YourService.name);

  async doSomething() {
    // {{These logs automatically include user context in Lambda}}
    this.logger.log('{{Operation started}}');
    this.logger.debug('{{Debug information}}');
    this.logger.error('{{Error occurred}}');
  }
}
```

{{You can enhance with structured logging for more detailed tracking:}}

```typescript
import { Logger, Injectable } from '@nestjs/common';

@Injectable()
export class TodoService {
  private readonly logger = new Logger(TodoService.name);

  async create(dto: CreateTodoDto): Promise<Todo> {
    this.logger.log({
      action: 'create_todo',
      input: dto,
      userId: context.userId,
    });

    try {
      const result = await this.save(dto);
      this.logger.log({
        action: 'todo_created',
        todoId: result.id,
        duration: Date.now() - startTime,
      });
      return result;
    } catch (error) {
      this.logger.error({
        action: 'create_todo_failed',
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
```

### {{Log Retention}}

{{Configure log retention in CDK:}}

```typescript
import * as logs from 'aws-cdk-lib/aws-logs';

const logGroup = new logs.LogGroup(this, 'AppLogGroup', {
  logGroupName: `/aws/lambda/${props.appName}-${props.envName}`,
  retention: logs.RetentionDays.ONE_MONTH,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});
```

### {{Log Format}}

{{Recommended log format for easy querying:}}

```typescript
interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context: string;
  correlationId?: string;
  userId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack: string;
  };
  metadata?: Record<string, any>;
}
```

## {{CloudWatch Metrics}}

:::info {{Implementation Required}}
{{Custom metrics are not built into the framework. The following examples show how you can implement custom metrics in your application using the AWS SDK.}}
:::

### {{Custom Metrics}}

{{Publish custom metrics from your application:}}

```typescript
import { CloudWatch } from 'aws-sdk';

const cloudwatch = new CloudWatch();

async function publishMetric(
  metricName: string,
  value: number,
  unit: string = 'Count',
): Promise<void> {
  await cloudwatch.putMetricData({
    Namespace: 'YourApp/Custom',
    MetricData: [
      {
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Dimensions: [
          { Name: 'Environment', Value: process.env.ENVIRONMENT },
        ],
      },
    ],
  }).promise();
}

// Usage
await publishMetric('TodosCreated', 1);
await publishMetric('ProcessingTime', 150, 'Milliseconds');
```

### {{Key Metrics to Monitor}}

| {{Category}} | {{Metric}} | {{Description}} |
|--------------|------------|-----------------|
| {{Lambda}} | `Invocations` | {{Number of function calls}} |
| {{Lambda}} | `Duration` | {{Execution time}} |
| {{Lambda}} | `Errors` | {{Failed invocations}} |
| {{Lambda}} | `ConcurrentExecutions` | {{Parallel executions}} |
| {{API Gateway}} | `Count` | {{Request count}} |
| {{API Gateway}} | `Latency` | {{Response time}} |
| {{API Gateway}} | `4XXError` | {{Client errors}} |
| {{API Gateway}} | `5XXError` | {{Server errors}} |
| {{DynamoDB}} | `ConsumedReadCapacity` | {{Read usage}} |
| {{DynamoDB}} | `ConsumedWriteCapacity` | {{Write usage}} |
| {{DynamoDB}} | `ThrottledRequests` | {{Throttled operations}} |

### {{CDK Dashboard}}

:::info {{CDK Customization}}
{{Dashboards are not included in the default CDK template. Add the following to your CDK stack to create a CloudWatch dashboard.}}
:::

{{Create a CloudWatch dashboard:}}

```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

const dashboard = new cloudwatch.Dashboard(this, 'AppDashboard', {
  dashboardName: `${props.appName}-${props.envName}`,
});

dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'Lambda Invocations',
    left: [handler.metricInvocations()],
  }),
  new cloudwatch.GraphWidget({
    title: 'Lambda Duration',
    left: [handler.metricDuration()],
  }),
  new cloudwatch.GraphWidget({
    title: 'Lambda Errors',
    left: [handler.metricErrors()],
  }),
  new cloudwatch.GraphWidget({
    title: 'API Gateway Requests',
    left: [
      api.metricCount(),
      api.metricClientError(),
      api.metricServerError(),
    ],
  }),
);
```

## {{CloudWatch Alarms}}

:::info {{CDK Customization}}
{{Alarms are not included in the default CDK template. Add the following to your CDK stack for production monitoring.}}
:::

### {{Create Alarms}}

{{Set up alarms for critical metrics:}}

```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';

// SNS topic for notifications
const alertTopic = new sns.Topic(this, 'AlertTopic');

// Lambda error alarm
const errorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
  metric: handler.metricErrors(),
  threshold: 5,
  evaluationPeriods: 1,
  alarmDescription: 'Lambda function errors exceed threshold',
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
errorAlarm.addAlarmAction(new actions.SnsAction(alertTopic));

// High latency alarm
const latencyAlarm = new cloudwatch.Alarm(this, 'LatencyAlarm', {
  metric: handler.metricDuration({
    statistic: 'p99',
  }),
  threshold: 5000, // 5 seconds
  evaluationPeriods: 3,
  alarmDescription: 'P99 latency exceeds 5 seconds',
});
latencyAlarm.addAlarmAction(new actions.SnsAction(alertTopic));

// DynamoDB throttling alarm
const throttleAlarm = new cloudwatch.Alarm(this, 'ThrottleAlarm', {
  metric: table.metricThrottledRequests(),
  threshold: 1,
  evaluationPeriods: 1,
  alarmDescription: 'DynamoDB throttling detected',
});
throttleAlarm.addAlarmAction(new actions.SnsAction(alertTopic));
```

### {{Recommended Alarms}}

| {{Alarm}} | {{Metric}} | {{Threshold}} | {{Description}} |
|-----------|------------|---------------|-----------------|
| {{High Error Rate}} | `Lambda Errors` | {{> 5 per minute}} | {{Indicates application issues}} |
| {{High Latency}} | `Lambda Duration p99` | {{> 5 seconds}} | {{Slow response times}} |
| {{DynamoDB Throttling}} | `ThrottledRequests` | {{> 0}} | {{Capacity issues}} |
| {{5XX Errors}} | `API Gateway 5XXError` | {{> 1%}} | {{Server errors}} |
| {{Dead Letter Queue}} | `SQS ApproximateNumberOfMessages` | {{> 0}} | {{Failed messages}} |

## {{AWS X-Ray Tracing}}

:::tip {{Built-in Feature}}
{{X-Ray tracing is enabled by default in the MBC CQRS Serverless CDK template for Lambda functions and Step Functions.}}
:::

### {{Enable X-Ray}}

{{X-Ray tracing is already enabled in the default CDK template:}}

```typescript
const handler = new lambda.Function(this, 'Handler', {
  // ... other config
  tracing: lambda.Tracing.ACTIVE,
});

const api = new apigateway.HttpApi(this, 'Api', {
  // ... other config
});

// Enable X-Ray for API Gateway
const stage = api.defaultStage?.node.defaultChild as apigateway.CfnStage;
stage.addPropertyOverride('TracingEnabled', true);
```

### {{Instrument Application}}

:::info {{Optional Enhancement}}
{{For deeper tracing of AWS SDK calls and HTTP requests, you can optionally add the aws-xray-sdk package to your application.}}
:::

```typescript
import * as AWSXRay from 'aws-xray-sdk';

// Instrument AWS SDK
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

// Instrument HTTP calls
AWSXRay.captureHTTPsGlobal(require('http'));
AWSXRay.captureHTTPsGlobal(require('https'));

// Add custom annotations
const segment = AWSXRay.getSegment();
const subsegment = segment?.addNewSubsegment('CustomOperation');
subsegment?.addAnnotation('userId', userId);
subsegment?.addMetadata('request', requestData);
// ... perform operation
subsegment?.close();
```

## {{Centralized Logging}}

:::info {{CDK Customization}}
{{Centralized logging is not included in the default template. The following patterns show how to aggregate logs for complex applications.}}
:::

### {{Log Aggregation Pattern}}

{{For complex applications, aggregate logs:}}

```typescript
// Create a centralized log group
const centralLogGroup = new logs.LogGroup(this, 'CentralLogs', {
  logGroupName: `/app/${props.appName}/central`,
  retention: logs.RetentionDays.THREE_MONTHS,
});

// Subscribe Lambda logs
new logs.SubscriptionFilter(this, 'LambdaLogSubscription', {
  logGroup: lambdaLogGroup,
  destination: new destinations.LambdaDestination(logProcessorFunction),
  filterPattern: logs.FilterPattern.allEvents(),
});
```

### {{Log Insights Queries}}

{{Useful CloudWatch Logs Insights queries:}}

```
# Error analysis
fields @timestamp, @message
| filter @message like /ERROR/
| stats count(*) by bin(1h)

# Slow requests
fields @timestamp, @duration, @requestId
| filter @duration > 3000
| sort @duration desc
| limit 20

# Request volume by endpoint
fields @timestamp
| filter @message like /HTTP/
| parse @message /(?<method>\w+) (?<path>\/\S+)/
| stats count(*) by path, method
| sort count desc

# Cold starts
fields @timestamp, @message
| filter @message like /Init Duration/
| parse @message /Init Duration: (?<initDuration>[\d.]+) ms/
| stats avg(initDuration), max(initDuration), count(*)
```

## {{Application Performance Monitoring}}

:::info {{Implementation Required}}
{{The framework does not include built-in APM features. The following examples show patterns you can implement in your application.}}
:::

### {{Performance Metrics}}

{{Track key performance indicators:}}

```typescript
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startTimer(operation: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.recordMetric(operation, duration);
    };
  }

  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  async flush(): Promise<void> {
    for (const [name, values] of this.metrics.entries()) {
      await publishMetric(name, average(values), 'Milliseconds');
    }
    this.metrics.clear();
  }
}
```

### {{Health Checks}}

{{The framework provides a basic health check endpoint at `GET /` that returns a simple response. For production applications, you may want to implement more comprehensive health checks:}}

:::tip {{Built-in Health Check}}
{{The default `GET /` endpoint returns "Hello World!" and can be used for basic liveness checks.}}
:::

{{For more detailed health checks, implement a custom controller:}}

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dynamodb: DynamoDBService,
  ) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkDynamoDB(),
    ]);

    return {
      status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: checks[0].status === 'fulfilled' ? 'ok' : 'failed',
        dynamodb: checks[1].status === 'fulfilled' ? 'ok' : 'failed',
      },
    };
  }
}
```

## {{Best Practices}}

### {{Logging}}

- {{Use structured JSON logging}}
- {{Include correlation IDs}}
- {{Log at appropriate levels}}
- {{Avoid logging sensitive data}}
- {{Set appropriate retention periods}}

### {{Metrics}}

- {{Focus on actionable metrics}}
- {{Use percentiles (p50, p95, p99) for latency}}
- {{Set meaningful thresholds}}
- {{Create dashboards for different audiences}}

### {{Alerting}}

- {{Avoid alert fatigue}}
- {{Set appropriate thresholds}}
- {{Include runbooks in alert descriptions}}
- {{Use escalation policies}}

## {{Next Steps}}

- {{[Deployment Guide](./deployment-guide) - Deploy with monitoring enabled}}
- {{[CI/CD with CodePipeline](./codepipeline-cicd) - Automate deployments}}
- {{[Troubleshooting](./common-issues) - Debug issues}}
