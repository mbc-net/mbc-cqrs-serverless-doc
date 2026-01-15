---
description: MBC CQRS Serverlessアプリケーションのモニタリングとロギングをセットアップします。
---

# モニタリングとロギング

このガイドでは、AWS上のMBC CQRS Serverlessアプリケーション向けの包括的なモニタリングとロギングのセットアップ方法を説明します。

## 概要

完全な可観測性戦略には以下が含まれます：

- **ロギング**: アプリケーションイベントとエラーのキャプチャ
- **メトリクス**: パフォーマンスと使用量の測定
- **トレーシング**: サービス間のリクエスト追跡
- **アラート**: 問題発生時の通知

### 組み込み機能

MBC CQRS Serverlessフレームワークは、以下の可観測性機能をすぐに使える形で提供します：

- **RequestLogger**: コンテキスト情報（tenantCode、userId、requestId、sourceIp）を含む拡張NestJSロガー
- **AWS X-Rayトレーシング**: CDKテンプレートでLambdaとStep Functionsに対してデフォルトで有効
- **JSONロギングフォーマット**: Lambda関数はクエリしやすいJSON形式でログを出力
- **設定可能なログレベル**: LOG_LEVEL環境変数で設定

:::info AWSサービスガイダンス
以下のセクションでは、追加のAWS CloudWatch機能（メトリクス、ダッシュボード、アラーム）のセットアップに関するガイダンスを提供します。これらはフレームワークに組み込まれていませんが、本番デプロイメントに推奨されるパターンです。
:::

## CloudWatch Logs

### Lambdaロギング

フレームワークには、ログにコンテキストを自動的に追加する組み込みのRequestLoggerが含まれています：

```typescript
// フレームワークのRequestLoggerは自動的に使用されます
// ログ出力には以下が含まれます: context、requestId、ip、tenantCode、userId

import { Logger, Injectable } from '@nestjs/common';

@Injectable()
export class YourService {
  private readonly logger = new Logger(YourService.name);

  async doSomething() {
    // これらのログはLambdaでユーザーコンテキストを自動的に含みます
    this.logger.log('操作を開始しました');
    this.logger.debug('デバッグ情報');
    this.logger.error('エラーが発生しました');
  }
}
```

より詳細な追跡のために、構造化ロギングで強化できます：

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

### ログ保持

CDKでログ保持を設定：

```typescript
import * as logs from 'aws-cdk-lib/aws-logs';

const logGroup = new logs.LogGroup(this, 'AppLogGroup', {
  logGroupName: `/aws/lambda/${props.appName}-${props.envName}`,
  retention: logs.RetentionDays.ONE_MONTH,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});
```

### ログフォーマット

クエリを容易にするための推奨ログフォーマット：

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

## CloudWatchメトリクス

:::info 実装が必要
カスタムメトリクスはフレームワークに組み込まれていません。以下の例は、AWS SDKを使用してアプリケーションにカスタムメトリクスを実装する方法を示しています。
:::

### カスタムメトリクス

アプリケーションからカスタムメトリクスを発行：

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

### 監視すべき主要メトリクス

| カテゴリ | メトリクス | 説明 |
|--------------|------------|-----------------|
| Lambda | `Invocations` | 関数呼び出し回数 |
| Lambda | `Duration` | 実行時間 |
| Lambda | `Errors` | 失敗した呼び出し |
| Lambda | `ConcurrentExecutions` | 並列実行数 |
| API Gateway | `Count` | リクエスト数 |
| API Gateway | `Latency` | レスポンス時間 |
| API Gateway | `4XXError` | クライアントエラー |
| API Gateway | `5XXError` | サーバーエラー |
| DynamoDB | `ConsumedReadCapacity` | 読み取り使用量 |
| DynamoDB | `ConsumedWriteCapacity` | 書き込み使用量 |
| DynamoDB | `ThrottledRequests` | スロットルされた操作 |

### CDKダッシュボード

:::info CDKカスタマイズ
ダッシュボードはデフォルトのCDKテンプレートに含まれていません。CloudWatchダッシュボードを作成するには、CDKスタックに以下を追加してください。
:::

CloudWatchダッシュボードを作成：

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

## CloudWatchアラーム

:::info CDKカスタマイズ
アラームはデフォルトのCDKテンプレートに含まれていません。本番監視用にCDKスタックに以下を追加してください。
:::

### アラームの作成

重要なメトリクスにアラームを設定：

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

### 推奨アラーム

| アラーム | メトリクス | しきい値 | 説明 |
|-----------|------------|---------------|-----------------|
| 高エラー率 | `Lambda Errors` | 1分あたり5件超 | アプリケーションの問題を示す |
| 高レイテンシー | `Lambda Duration p99` | 5秒超 | レスポンス時間が遅い |
| DynamoDBスロットリング | `ThrottledRequests` | 0より大きい | 容量の問題 |
| 5XXエラー | `API Gateway 5XXError` | 1%超 | サーバーエラー |
| デッドレターキュー | `SQS ApproximateNumberOfMessages` | 0より大きい | 失敗したメッセージ |

## AWS X-Rayトレーシング

:::tip 組み込み機能
X-RayトレーシングはMBC CQRS Serverless CDKテンプレートでLambda関数とStep Functionsに対してデフォルトで有効になっています。
:::

### X-Rayの有効化

X-Rayトレーシングはデフォルトのcdkテンプレートで既に有効になっています：

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

### アプリケーションのインストルメント

:::info オプションの拡張
AWS SDK呼び出しとHTTPリクエストのより深いトレーシングのために、オプションでaws-xray-sdkパッケージをアプリケーションに追加できます。
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

## 集中ロギング

:::info CDKカスタマイズ
集中ロギングはデフォルトテンプレートに含まれていません。以下のパターンは、複雑なアプリケーションでログを集約する方法を示しています。
:::

### ログ集約パターン

複雑なアプリケーションでは、ログを集約：

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

### Log Insightsクエリ

便利なCloudWatch Logs Insightsクエリ：

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

## アプリケーションパフォーマンスモニタリング

:::info 実装が必要
フレームワークには組み込みのAPM機能は含まれていません。以下の例は、アプリケーションに実装できるパターンを示しています。
:::

### パフォーマンスメトリクス

主要パフォーマンス指標を追跡：

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

### ヘルスチェック

フレームワークは`GET /`にシンプルなレスポンスを返す基本的なヘルスチェックエンドポイントを提供します。本番アプリケーションでは、より包括的なヘルスチェックを実装することをお勧めします：

:::tip 組み込みヘルスチェック
デフォルトの`GET /`エンドポイントは「Hello World!」を返し、基本的な生存確認チェックに使用できます。
:::

より詳細なヘルスチェックには、カスタムコントローラーを実装してください：

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

## ベストプラクティス

### ロギング

- 構造化JSONロギングを使用
- 相関IDを含める
- 適切なレベルでログを記録
- 機密データのログ記録を避ける
- 適切な保持期間を設定

### メトリクス

- アクション可能なメトリクスに焦点を当てる
- レイテンシーにはパーセンタイル（p50、p95、p99）を使用
- 意味のあるしきい値を設定
- 異なる対象者向けのダッシュボードを作成

### アラート

- アラート疲れを避ける
- 適切なしきい値を設定
- アラート説明にランブックを含める
- エスカレーションポリシーを使用

## 次のステップ

- [デプロイメントガイド](./deployment-guide) - モニタリングを有効にしてデプロイ
- [CodePipelineによるCI/CD](./codepipeline-cicd) - デプロイを自動化
- [トラブルシューティング](./common-issues) - 問題のデバッグ
