---
description: MBC CQRS Serverlessアプリケーションのデバッグテクニックを学びます。
---

# デバッグガイド

このガイドでは、ローカル環境とAWS環境の両方でのMBC CQRS Serverlessアプリケーションのデバッグテクニックを説明します。

## ローカル開発環境でのデバッグ

### NestJS REPLの使用

REPL（Read-Eval-Print Loop）を使用してインタラクティブにデバッグできます：

```bash
npm run start:repl
```

REPLでは以下のことができます：

```typescript
// Get a service instance (サービスインスタンスを取得)
> get(TodoService)
TodoService { ... }

// Call methods directly (メソッドを直接呼び出す)
> await get(TodoService).findAll()
[{ id: '1', title: 'Test' }, ...]

// Show available methods on a service (サービスで利用可能なメソッドを表示)
> methods(TodoService)
Methods:
 ◻ findAll
 ◻ findOne
 ◻ create
 ◻ update
 ◻ delete
```

NestJS REPLの詳細については、[NestJS REPLドキュメント](https://docs.nestjs.com/recipes/repl)を参照してください。

### VS Codeでのデバッグ

`.vscode/launch.json` 設定を作成します：

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

### Serverless Offlineでのデバッグ

Serverless Offlineで詳細なログを有効にします：

```bash
SLS_DEBUG=* npm run offline:sls
```

またはserverless.ymlに追加：

```yaml
custom:
  serverless-offline:
    httpPort: 3000
    lambdaPort: 3002
    printOutput: true
```

### コンソールロギング

デバッグを容易にするために構造化ログを使用します：

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

## DynamoDBのデバッグ

### テーブル内容の表示

DynamoDB LocalでAWS CLIを使用：

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

### DynamoDB Streams

ストリームレコードをデバッグ：

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

## CloudWatch Logs

### ログの表示

AWS CLIを使用してログをテール：

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

### Log Insightsクエリ

高度なクエリにはCloudWatch Logs Insightsを使用：

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

### 構造化ログ分析

構造化ログを使用している場合：

```
fields @timestamp, level, message, context
| filter level = "error"
| sort @timestamp desc
```

## Step Functionsのデバッグ

### 実行履歴

AWSコンソールで実行を表示：

1. Step Functions → ステートマシン に移動
2. ステートマシンを選択
3. 実行をクリック
4. ステップステータス付きのビジュアルワークフローを表示

### イベント履歴

AWS CLIを使用：

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

### CloudWatchでのデバッグ

Step Functionsでログを有効化：

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

## API Gatewayのデバッグ

### アクセスログの有効化

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

### エンドポイントのテスト

詳細出力付きでcurlを使用：

```bash
curl -v -X POST https://your-api.execute-api.region.amazonaws.com/todos \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Todo"}'
```

## X-Rayトレーシング

X-RayトレーシングはCDKレベルでLambda関数とAPI Gatewayに対して自動的に有効化されています。`aws-xray-sdk`を使用したSDKレベルのインストルメンテーションは、追加のトレーシング機能が必要な場合のオプションです。

### CDKレベルの設定

CDKインフラストラクチャではX-Rayはデフォルトで有効です：

```typescript
// Lambda functions have X-Ray tracing enabled by default (Lambda関数はデフォルトでX-Rayトレーシングが有効)
const handler = new NodejsFunction(this, 'Handler', {
  // ...
  tracing: lambda.Tracing.ACTIVE, // Enabled by default (デフォルトで有効)
});

// Step Functions can also enable X-Ray (Step FunctionsでもX-Rayを有効化できる)
const stateMachine = new sfn.StateMachine(this, 'StateMachine', {
  definition: definition,
  tracingEnabled: true, // Enable X-Ray (X-Rayを有効化)
});
```

### オプション: SDKレベルのインストルメンテーション

より詳細なトレーシングが必要な場合は、オプションでX-Ray SDKをインストールして設定できます：

```bash
npm install aws-xray-sdk
```

```typescript
// Optional: Instrument AWS SDK for detailed tracing (オプション: 詳細トレーシング用にAWS SDKをインストルメント)
import * as AWSXRay from 'aws-xray-sdk';
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
```

### カスタムセグメントの追加

詳細なトレーシングのためにカスタムサブセグメントが必要な場合：

```typescript
import * as AWSXRay from 'aws-xray-sdk';

async function processOrder(orderId: string): Promise<void> {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('ProcessOrder');

  try {
    subsegment?.addAnnotation('orderId', orderId);
    // Process order (注文を処理)
    subsegment?.addMetadata('result', { status: 'success' });
  } catch (error) {
    subsegment?.addError(error);
    throw error;
  } finally {
    subsegment?.close();
  }
}
```

## 一般的なデバッグパターン

### リクエスト相関

リクエストを追跡するために相関IDを追加：

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

### 環境変数のデバッグ

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

### 条件付きデバッグ

```typescript
const DEBUG = process.env.DEBUG === 'true';

function debugLog(message: string, data?: any): void {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}
```

## トラブルシューティングチェックリスト

問題をデバッグする際：

1. **ローカルで再現**: ローカル環境で再現できますか？
2. **ログを確認**: CloudWatch Logsでエラーを確認
3. **設定を確認**: 環境変数と設定を確認
4. **分離テスト**: コンポーネントを個別にテスト
5. **権限を確認**: IAMロールとポリシーを確認
6. **最近の変更を確認**: 最後に動作した時から何が変わりましたか？
7. **依存関係を確認**: すべてのサービスは正常ですか？

## 次のステップ

- [よくある問題](./common-issues) - 既知の問題と解決策
- [モニタリングとロギング](./monitoring-logging) - 包括的なモニタリングをセットアップ
