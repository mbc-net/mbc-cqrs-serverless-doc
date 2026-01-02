---
description: MBC CQRS Serverless使用時によく発生する問題の解決策。
---

# よくある問題

このページでは、MBC CQRS Serverlessアプリケーション開発時によくある問題とその解決策を紹介します。

## インストールとセットアップ

### npm installがピア依存関係エラーで失敗する

**症状**: npm installがピア依存関係の警告またはエラーで失敗する。

**解決策**:

```bash
# Use --legacy-peer-deps flag
npm install --legacy-peer-deps

# Or update npm to latest version
npm install -g npm@latest
```

### CLIコマンドが見つからない

**症状**: `mbc-cqrs` コマンドが認識されない。

**解決策**:

```bash
# Install globally
npm install -g @mbc-cqrs-serverless/cli

# Or use npx
npx @mbc-cqrs-serverless/cli new my-app
```

### Dockerサービスが起動しない

**症状**: docker-compose upが失敗するか、サービスが起動しない。

**解決策**:

```bash
# Check Docker is running
docker info

# Clean up and restart
docker-compose -f infra-local/docker-compose.yml down -v
docker-compose -f infra-local/docker-compose.yml up -d

# Check logs for specific service
docker-compose -f infra-local/docker-compose.yml logs dynamodb-local
```

## データベースの問題

### DynamoDB接続が拒否される

**症状**: DynamoDB Localに接続できない。

**解決策**:

1. DynamoDB Localが実行中であることを確認：
```bash
docker ps | grep dynamodb
```

2. 設定でエンドポイントURLを確認：
```typescript
// Should be http://localhost:8000 for local development
dynamodbEndpoint: 'http://localhost:8000'
```

3. テーブルが存在することを確認：
```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

### Prismaマイグレーションエラー

**症状**: Prisma migrateが接続エラーで失敗する。

**解決策**:

1. PostgreSQLが実行中であることを確認：
```bash
docker ps | grep postgres
```

2. .envのDATABASE_URLを確認：
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/myapp?schema=public"
```

3. リセットしてマイグレーションを再実行：
```bash
npx prisma migrate reset
npx prisma migrate dev
```

### DynamoDBスループット超過

**症状**: ProvisionedThroughputExceededExceptionエラー。

**解決策**:

- 開発用：オンデマンド課金モードを使用
- 本番用：プロビジョニング容量を増やすか、オートスケーリングを有効化

```typescript
// CDK configuration for on-demand
const table = new dynamodb.Table(this, 'Table', {
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
});
```

## Lambdaエラー

### Lambdaタイムアウト

**症状**: タスクがX秒後にタイムアウトした。

**解決策**:

1. CDKでタイムアウトを延長：
```typescript
const handler = new lambda.Function(this, 'Handler', {
  timeout: cdk.Duration.seconds(30),
});
```

2. コールドスタートを最適化：
- バンドルサイズを縮小
- 重要な関数にはプロビジョニング済み同時実行を使用
- 初期化処理をハンドラー外に移動

### Lambdaメモリ不足

**症状**: Runtime.ExitErrorまたはメモリ制限超過。

**解決策**:

```typescript
const handler = new lambda.Function(this, 'Handler', {
  memorySize: 1024, // Increase memory
});
```

### Lambdaでモジュールが見つからない

**症状**: モジュール 'xxx' が見つからないエラー。

**解決策**:

1. バンドリング設定を確認：
```typescript
// Ensure dependencies are bundled
const handler = new lambda_nodejs.NodejsFunction(this, 'Handler', {
  bundling: {
    externalModules: [], // Don't exclude anything
  },
});
```

2. package.jsonの依存関係が正しいことを確認

## 認証エラー

### Cognitoトークンが無効

**症状**: 401 Unauthorizedまたはトークン検証の失敗。

**解決策**:

1. Cognito設定を確認：
```typescript
// Check USER_POOL_ID and CLIENT_ID match
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

2. トークンの有効期限を確認：
- アクセストークンはデフォルトで1時間後に期限切れ
- トークンリフレッシュロジックを実装

3. 発行者URLを確認：
```typescript
const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
```

### CORSエラー

**症状**: ブラウザでAccess-Control-Allow-Originエラー。

**解決策**:

1. API GatewayでCORSを設定：
```typescript
const api = new apigateway.HttpApi(this, 'Api', {
  corsPreflight: {
    allowOrigins: ['http://localhost:3000', 'https://your-domain.com'],
    allowMethods: [apigateway.CorsHttpMethod.ANY],
    allowHeaders: ['Authorization', 'Content-Type'],
  },
});
```

2. OPTIONSリクエストが処理されていることを確認

## イベント処理

### イベントが処理されない

**症状**: DynamoDB StreamsまたはSQSメッセージがハンドラーをトリガーしない。

**解決策**:

1. イベントソースマッピングを確認：
```bash
aws lambda list-event-source-mappings --function-name your-function
```

2. ハンドラーが登録されていることを確認：
```typescript
@EventHandler(YourEvent)
export class YourEventHandler implements IEventHandler<YourEvent> {
  async execute(event: YourEvent): Promise<void> {
    // Handler implementation
  }
}
```

3. CloudWatch Logsでエラーを確認

### 重複イベント処理

**症状**: 同じイベントが複数回処理される。

**解決策**:

1. 冪等性を実装：
```typescript
// Use event ID to check if already processed
const eventId = event.getEventId();
if (await this.isProcessed(eventId)) {
  return; // Skip duplicate
}
```

2. SQS可視性タイムアウトを適切に設定

## Step Functions

### Step Functions実行の失敗

**症状**: ステートマシンの実行がエラーで失敗する。

**解決策**:

1. AWSコンソールで実行履歴を確認：
   - Step Functions → ステートマシン → 対象のマシン に移動
   - 失敗した実行をクリック
   - 各ステップでエラーの詳細を確認

2. エラーハンドリングを追加：
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

### Step Functionsタイムアウト

**症状**: 実行がタイムアウトする。

**解決策**:

- ステートマシン定義でタイムアウトを延長
- 長時間実行タスクを小さなステップに分割
- 非同期操作にはコールバック付きのWait状態を使用

## デプロイの問題

### CDKデプロイの失敗

**症状**: cdk deployがCloudFormationエラーで失敗する。

**解決策**:

1. CloudFormationイベントを確認：
```bash
aws cloudformation describe-stack-events --stack-name YourStack
```

2. よくある原因：
   - IAM権限の問題
   - リソース制限超過
   - 無効なリソース設定

3. ロールバックして修正：
```bash
aws cloudformation delete-stack --stack-name YourStack
# Fix the issue and redeploy
cdk deploy
```

### リソースが既に存在する

**症状**: 名前Xのリソースが既に存在する。

**解決策**:

1. ユニークな命名を使用：
```typescript
const bucket = new s3.Bucket(this, 'Bucket', {
  bucketName: `${props.appName}-${props.envName}-${cdk.Aws.ACCOUNT_ID}`,
});
```

2. またはbucketNameを指定せずにCDKに名前を生成させる

## パフォーマンスの問題

### APIレスポンスが遅い

**症状**: APIレスポンスに時間がかかりすぎる。

**解決策**:

1. Lambdaプロビジョニング済み同時実行を有効化
2. API GatewayまたはDAXでキャッシュを実装
3. データベースクエリを最適化
4. RDSにコネクションプーリングを使用

### Lambda高コスト

**症状**: 予想外に高いLambda課金。

**解決策**:

1. 呼び出し回数と実行時間を確認
2. メモリ割り当てを最適化（メモリが多い＝実行が速い）
3. リクエストバッチングを実装
4. 予約済み同時実行でスケーリングを制限

## ヘルプを得る

ここで解決策が見つからない場合：

1. [デバッグガイド](./debugging-guide)で調査テクニックを確認
2. GitHubで既存のIssueを検索
3. 以下を含む新しいIssueを作成：
   - 問題の明確な説明
   - 再現手順
   - エラーメッセージとログ
   - 環境の詳細（Nodeバージョン、OSなど）
