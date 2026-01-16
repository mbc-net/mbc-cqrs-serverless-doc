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

## ローカルStep Functionsデバッグ

フレームワークはAWS Step Functions Localをサポートしており、ローカル開発環境でStep Functionsワークフローをテストおよびデバッグできます。

### Step Functions Localの起動

Step Functions Localは他のローカルサービスと並行してDockerコンテナとして実行されます：

```bash
# Start all local services including Step Functions (Step Functionsを含むすべてのローカルサービスを起動)
cd infra-local
docker-compose up -d
```

Step Functions Localサービスはポート8083で実行され、ローカルのLambda関数に接続します。

### ローカルでのステートマシン作成

AWS CLIを使用してStep Functions Localでステートマシンを作成します：

```bash
# Create state machine from definition (定義からステートマシンを作成)
aws stepfunctions create-state-machine \
  --endpoint-url http://localhost:8083 \
  --name command \
  --definition file://state-machine-definition.json \
  --role-arn "arn:aws:iam::101010101010:role/DummyRole"
```

### 実行の開始とモニタリング

ローカルでStep Functions実行を開始およびモニタリングします：

```bash
# Start an execution (実行を開始)
aws stepfunctions start-execution \
  --endpoint-url http://localhost:8083 \
  --state-machine-arn arn:aws:states:ap-northeast-1:101010101010:stateMachine:command \
  --input '{"pk":"TODO#tenant","sk":"item#001@1"}'

# List executions (実行一覧を表示)
aws stepfunctions list-executions \
  --endpoint-url http://localhost:8083 \
  --state-machine-arn arn:aws:states:ap-northeast-1:101010101010:stateMachine:command

# Get execution history (実行履歴を取得)
aws stepfunctions get-execution-history \
  --endpoint-url http://localhost:8083 \
  --execution-arn arn:aws:states:ap-northeast-1:101010101010:execution:command:execution-id
```

### waitForTaskTokenのデバッグ

waitForTaskTokenを使用するStep Functions（コマンド処理ワークフローなど）をデバッグする場合、手動でタスク成功または失敗を送信できます：

```bash
# Send task success (タスク成功を送信)
aws stepfunctions send-task-success \
  --endpoint-url http://localhost:8083 \
  --task-token "YOUR_TASK_TOKEN" \
  --task-output '{"Payload":[[{"result":0}]]}'

# Send task failure (タスク失敗を送信)
aws stepfunctions send-task-failure \
  --endpoint-url http://localhost:8083 \
  --task-token "YOUR_TASK_TOKEN" \
  --cause "Debug failure" \
  --error "TestError"
```

## CloudWatchを使用した本番デバッグ

### Lambdaログ分析

各Lambda関数はCloudWatchにログを書き込みます。これらのパターンを使用して本番環境の問題を分析します：

```bash
# Find log groups for your application (アプリケーションのロググループを検索)
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/prod-myapp

# Get recent log events (最近のログイベントを取得)
aws logs get-log-events \
  --log-group-name /aws/lambda/prod-myapp-handler \
  --log-stream-name '2024/01/15/[$LATEST]abc123' \
  --limit 100

# Filter for errors in the last hour (過去1時間のエラーをフィルタリング)
aws logs filter-log-events \
  --log-group-name /aws/lambda/prod-myapp-handler \
  --start-time $(date -d '1 hour ago' +%s000) \
  --filter-pattern "ERROR"
```

### Step Functions実行分析

本番環境のStep Functionsデバッグの場合：

```bash
# List failed executions (失敗した実行を一覧表示)
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:REGION:ACCOUNT:stateMachine:command \
  --status-filter FAILED

# Get detailed execution history (詳細な実行履歴を取得)
aws stepfunctions get-execution-history \
  --execution-arn arn:aws:states:REGION:ACCOUNT:execution:command:exec-id \
  --include-execution-data

# Describe execution for input/output (入出力の実行詳細を取得)
aws stepfunctions describe-execution \
  --execution-arn arn:aws:states:REGION:ACCOUNT:execution:command:exec-id
```

### CQRS向けCloudWatch Logs Insights

MBC CQRSアプリケーション向けにカスタマイズされたCloudWatch Logs Insightsクエリを使用します：

```
# Find version conflicts (バージョン競合を検索)
fields @timestamp, @message
| filter @message like /version not match|ConditionalCheckFailed/
| sort @timestamp desc
| limit 50

# Track command processing (コマンド処理を追跡)
fields @timestamp, @message
| filter @message like /publish|publishSync|publishAsync/
| parse @message "pk=* sk=*" as pk, sk
| sort @timestamp desc
| limit 100

# Analyze data sync operations (データ同期操作を分析)
fields @timestamp, @message
| filter @message like /DataSyncHandler|sync_data/
| sort @timestamp desc
| limit 100

# Find Step Functions timeouts (Step Functionsタイムアウトを検索)
fields @timestamp, @message
| filter @message like /waitForTaskToken|taskToken/
| sort @timestamp desc
| limit 50
```

## バージョン競合のデバッグ

バージョン競合は、複数のプロセスが同時に同じアイテムを更新しようとした場合に発生します。フレームワークは楽観的ロックを使用してデータの一貫性を確保します。

### バージョン番号の理解

MBC CQRS Serverlessでは、バージョン管理は以下のように機能します：

- ソートキー（sk）形式：`ITEM#code@version`（例：`TODO#001@3`）
- バージョン区切り文字：`@`
- VERSION_FIRST：`0`（初期バージョン）
- VERSION_LATEST：`-1`（最新バージョンを自動取得）

### バージョン競合の特定

コマンドテーブルでバージョン履歴を確認：

```bash
# Query all versions of an item (アイテムの全バージョンをクエリ)
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

### バージョン競合の解決

```typescript
// Option 1: Use VERSION_LATEST (-1) for auto-versioning (オプション1：自動バージョニングにVERSION_LATEST (-1)を使用)
await commandService.publishPartialUpdateAsync({
  pk: 'TODO#tenant',
  sk: 'TODO#001',
  version: -1,  // Auto-fetches latest version (最新バージョンを自動取得)
  name: 'Updated Name',
}, options);

// Option 2: Fetch and retry pattern (オプション2：フェッチとリトライパターン)
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

## DynamoDBコマンド履歴の検査

コマンドテーブルはすべてのコマンドの完全な履歴を保存し、完全な監査証跡とデバッグを可能にします。

### テーブル構造

フレームワークはモジュールごとに2つのDynamoDBテーブルを使用します：

- `{env}-{app}-{module}-command`：バージョン付きのコマンド履歴を保存
- `{env}-{app}-{module}-data`：現在の状態（最新バージョン）を保存

### コマンド履歴のクエリ

```bash
# Get the latest version from data table (データテーブルから最新バージョンを取得)
aws dynamodb get-item \
  --table-name dev-myapp-sample-data \
  --endpoint-url http://localhost:8000 \
  --key '{"pk":{"S":"TODO#tenant"},"sk":{"S":"TODO#001"}}'

# Get all command versions (すべてのコマンドバージョンを取得)
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

# Get a specific version (特定のバージョンを取得)
aws dynamodb get-item \
  --table-name dev-myapp-sample-command \
  --endpoint-url http://localhost:8000 \
  --key '{"pk":{"S":"TODO#tenant"},"sk":{"S":"TODO#001@3"}}'
```

### DynamoDB Admin UIの使用

DynamoDB Adminはローカルの DynamoDBテーブルを閲覧するためのWebインターフェースを提供します：

1. ローカルサービス実行中に http://localhost:8001 にアクセス
2. テーブルを選択（例：`dev-myapp-sample-command`）
3. pkまたはskで特定のアイテムを検索するためにフィルターを使用

### プログラムによる履歴アクセス

```typescript
import { DynamoDbService } from '@mbc-cqrs-serverless/core';

// Get all versions of an item (アイテムの全バージョンを取得)
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
    'desc', // Latest first (最新順)
  );
  return result.items;
}
```

## 一般的なデバッグシナリオ

### シナリオ1：コマンドがデータテーブルに表示されない

症状：コマンドは公開されましたが、データテーブルには古いバージョンが表示されています。

デバッグ手順：

1. コマンドテーブルで新しいバージョンを確認：
   ```bash
   aws dynamodb query --table-name dev-myapp-sample-command \
     --endpoint-url http://localhost:8000 \
     --key-condition-expression "pk = :pk" \
     --expression-attribute-values '{":pk":{"S":"TODO#tenant"}}' \
     --scan-index-forward false --limit 5
   ```

2. DynamoDB Streamsが有効で処理中か確認：
   - .envでLOCAL_DDB_SAMPLE_STREAMが設定されているか確認
   - Lambdaログでストリーム処理エラーを確認

3. Step Functions実行を確認：
   ```bash
   aws stepfunctions list-executions \
     --endpoint-url http://localhost:8083 \
     --state-machine-arn arn:aws:states:ap-northeast-1:101010101010:stateMachine:command \
     --status-filter RUNNING
   ```

4. データ同期ハンドラーが登録されているか確認：
   ```typescript
   // Check in your module (モジュールで確認)
   @Module({
     imports: [
       CommandModule.register({
         tableName: 'sample',
         dataSyncHandlers: [YourSyncHandler], // Ensure registered (登録を確認)
       }),
     ],
   })
   ```

### シナリオ2：Step FunctionがRUNNING状態で停止

症状：Step Functions実行が完了しません。

デバッグ手順：

1. 実行詳細を取得：
   ```bash
   aws stepfunctions describe-execution \
     --endpoint-url http://localhost:8083 \
     --execution-arn YOUR_EXECUTION_ARN
   ```

2. taskTokenを待っているか確認：
   - `wait_prev_command`で停止している場合、前のバージョンがまだ処理中です
   - 前のコマンドのtaskTokenコールバックが送信されたか確認

3. コマンドテーブルでtaskTokenを確認：
   ```bash
   aws dynamodb get-item \
     --table-name dev-myapp-sample-command \
     --endpoint-url http://localhost:8000 \
     --key '{"pk":{"S":"TODO#tenant"},"sk":{"S":"TODO#001@2"}}' \
     --projection-expression "taskToken, version, #s" \
     --expression-attribute-names '{"#s": "status"}'
   ```

4. 必要に応じて手動で再開（デバッグ目的のみ）：
   ```bash
   aws stepfunctions send-task-success \
     --endpoint-url http://localhost:8083 \
     --task-token "TASK_TOKEN_FROM_COMMAND" \
     --task-output '{"Payload":[[{"result":0}]]}'
   ```

### シナリオ3：重複コマンドが処理されている

症状：同じコマンドが複数回処理されています。

デバッグ手順：

1. 同じデータで複数のバージョンを確認：
   ```bash
   aws dynamodb query --table-name dev-myapp-sample-command \
     --endpoint-url http://localhost:8000 \
     --key-condition-expression "pk = :pk AND begins_with(sk, :sk)" \
     --expression-attribute-values '{":pk":{"S":"TODO#tenant"},":sk":{"S":"TODO#001@"}}' \
     --projection-expression "sk, version, requestId, createdAt"
   ```

2. requestIdの値を比較して重複送信を特定

3. クライアントがタイムアウト時にリトライしているか確認：
   - クライアント側のエラーハンドリングを確認
   - 冪等性キーを実装

### シナリオ4：データ同期ハンドラーが実行されない

症状：コマンドは保存されましたが、外部システムは更新されていません。

デバッグ手順：

1. ハンドラーが正しくデコレートされているか確認：
   ```typescript
   @DataSyncHandler({
     tableName: 'sample',
     type: 'custom-sync',
   })
   export class CustomSyncHandler implements IDataSyncHandler {
     // ...
   }
   ```

2. ハンドラーが検出されているか確認：
   - デバッグロギングを有効化：`DEBUG=* npm run offline`
   - "find data sync handlers from decorator"メッセージを探す

3. ハンドラーにデバッグを追加：
   ```typescript
   async up(command: CommandModel): Promise<void> {
     this.logger.debug(`CustomSyncHandler.up called: ${command.pk}#${command.sk}`);
     // Your sync logic (同期ロジック)
   }
   ```

### シナリオ5：X-Rayトレースが表示されない

症状：X-Rayサービスマップまたはトレースが表示されません。

デバッグ手順：

1. CDKでX-Rayが有効になっているか確認：
   ```typescript
   // Check Lambda function configuration (Lambda関数の設定を確認)
   const handler = new NodejsFunction(this, 'Handler', {
     tracing: lambda.Tracing.ACTIVE, // Should be ACTIVE (ACTIVEであるべき)
   });
   ```

2. IAM権限にX-Rayが含まれているか確認：
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

3. SDKインストルメンテーションの場合、セットアップを確認：
   ```typescript
   import * as AWSXRay from 'aws-xray-sdk';
   // Must be called before any AWS SDK usage (AWS SDK使用前に呼び出す必要がある)
   const AWS = AWSXRay.captureAWS(require('aws-sdk'));
   ```

## 次のステップ

- [よくある問題](./common-issues) - 既知の問題と解決策
- [モニタリングとロギング](./monitoring-logging) - 包括的なモニタリングをセットアップ
