---
sidebar_position: 2
description: MBC CQRS Serverlessの原因、解決策、復旧戦略を含む包括的なエラーカタログ。
---

# エラーカタログ

このカタログでは、MBC CQRS Serverlessで発生するエラーの原因、解決策、復旧戦略を含む包括的なドキュメントを提供します。

## クイックリファレンス

このテーブルを使用してエラーを素早く特定し、解決策にジャンプできます。

### コマンド＆データエラー

| コード | エラーメッセージ | 重大度 | クイックフィックス |
|----------|-------------------|--------------|---------------|
| MBC-CMD-001 | バージョン不一致 | 高 | 最新バージョンを取得するか`version: -1`を使用 |
| MBC-CMD-002 | アイテムが見つからない | 中 | 更新前にアイテムが存在するか確認 |
| MBC-CMD-003 | 無効な入力バージョン | 中 | getItem()から最新バージョンを使用 |

### テナントエラー

| コード | エラーメッセージ | 重大度 | クイックフィックス |
|----------|-------------------|--------------|---------------|
| MBC-TNT-001 | テナントが見つからない | 高 | listTenants()でテナントの存在を確認 |
| MBC-TNT-002 | テナントコードが既に存在 | 低 | 作成前に存在確認 |

### シーケンス＆タスクエラー

| コード | エラーメッセージ | 重大度 | クイックフィックス |
|----------|-------------------|--------------|---------------|
| MBC-SEQ-001 | シーケンスが見つからない | 中 | シーケンスは初回使用時に自動初期化 |
| MBC-TSK-001 | タスクが見つからない | 中 | 操作前にタスクステータスを確認 |

### バリデーションエラー

| コード | エラーメッセージ | 重大度 | クイックフィックス |
|----------|-------------------|--------------|---------------|
| MBC-VAL-001 | バリデーション失敗 | 中 | DTOの制約と入力データを確認 |

### DynamoDBエラー

| コード | エラーメッセージ | 重大度 | クイックフィックス |
|----------|-------------------|--------------|---------------|
| MBC-DDB-001 | ProvisionedThroughputExceededException | 高 | 指数バックオフリトライを実装 |
| MBC-DDB-002 | ConditionalCheckFailedException | 高 | アイテムを更新し新バージョンでリトライ |
| MBC-DDB-003 | ResourceNotFoundException | 重大 | テーブルの存在と環境変数を確認 |
| MBC-DDB-004 | ValidationException | 中 | 空文字列を避け、予約語をエスケープ |

### 認証エラー

| コード | エラーメッセージ | 重大度 | クイックフィックス |
|----------|-------------------|--------------|---------------|
| MBC-COG-001 | NotAuthorizedException | 高 | トークンを更新または再認証 |
| MBC-COG-002 | UserNotFoundException | 中 | プールにユーザーが存在するか確認 |
| MBC-COG-003 | UserNotConfirmedException | 中 | 確認コードを再送信 |

### インポートモジュールエラー

| コード | エラーメッセージ | 重大度 | クイックフィックス |
|----------|-------------------|--------------|---------------|
| MBC-IMP-001 | Step Functionsタイムアウト | 重大 | 適切な失敗処理のためv1.0.18以降にアップグレード |
| MBC-IMP-002 | インポート戦略が見つからない | 高 | モジュール設定にImportStrategyを登録 |
| MBC-IMP-003 | インポートがPROCESSINGでスタック | 高 | DynamoDBストリームとSNSトピックを確認 |

### Step Functionsエラー

| コード | エラーメッセージ | 重大度 | クイックフィックス |
|----------|-------------------|--------------|---------------|
| MBC-SFN-001 | TaskTimedOut | 高 | Lambdaタイムアウトを増やすかチャンク処理 |
| MBC-SFN-002 | TaskFailed | 高 | sendTaskFailureで適切なエラーハンドリングを追加 |

### AWSサービスエラー

| コード | エラーメッセージ | 重大度 | クイックフィックス |
|----------|-------------------|--------------|---------------|
| MBC-S3-001 | NoSuchKey | 中 | headObjectでオブジェクトの存在を確認 |
| MBC-S3-002 | AccessDenied | 高 | 必要なIAM権限を追加 |
| MBC-SQS-001 | MessageNotInflight | 中 | 可視性タイムアウト内に処理 |

---

## コマンドサービスエラー

### BadRequestException: "The input is not a valid, item not found or version not match"

**場所**: `packages/core/src/commands/command.service.ts`

**原因**: 楽観的ロックの失敗。リクエストのバージョン番号がデータベースの現在のバージョンと一致しません。

**解決策**:
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

**場所**: `packages/core/src/commands/command.service.ts`

**原因**: データベースに存在しないアイテムを更新しようとしています。

**解決策**:
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

**場所**: `packages/core/src/commands/command.service.ts`

**原因**: publishSyncで最新の保存バージョンと一致しないバージョンを使用しています。

**解決策**: 最新のアイテムを取得してそのバージョンを使用するか、非同期メソッドでversion: -1を使用してください。

---

## テナントエラー

### BadRequestException: "Tenant not found"

**場所**: `packages/tenant/src/services/tenant.service.ts`

**原因**: 指定されたテナントが存在しないか削除されています。

**解決策**:
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

**場所**: `packages/tenant/src/services/tenant.service.ts`

**原因**: 既に存在するコードでテナントを作成しようとしています。

**解決策**:
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

## シーケンスエラー

### BadRequestException: "Sequence not found"

**場所**: `packages/sequence/src/services/sequence.service.ts`

**原因**: リクエストされたシーケンスキーが存在しません。

**解決策**:
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

## タスクエラー

### BadRequestException: "Task not found"

**場所**: `packages/task/src/services/task.service.ts`

**原因**: 指定されたタスクが存在しないか、完了/削除されています。

**解決策**:
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

## バリデーションエラー

### BadRequestException: "Validation failed"

**場所**: `packages/core/src/pipe/class.validation.pipe.ts`

**原因**: リクエストDTOがclass-validatorのバリデーションに失敗しました。

**一般的なバリデーションエラー**:
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

**解決策**:
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

## DynamoDBエラー

### ProvisionedThroughputExceededException

**場所**: AWS DynamoDB

**原因**: オンデマンドまたはプロビジョニングテーブルで読み取りまたは書き込み容量を超過しました。

**解決策**:
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

**予防策**:
- 予測困難なワークロードにはオンデマンドキャパシティモードを使用
- 書き込み操作を減らすためにリクエストバッチングを実装
- 読み取りが多いワークロードにはDAXを使用

---

### ConditionalCheckFailedException

**場所**: AWS DynamoDB

**原因**: 楽観的ロック条件が失敗（バージョン不一致）またはユニーク制約違反。

**解決策**:
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

**場所**: AWS DynamoDB

**原因**: 指定されたテーブルまたはインデックスが存在しません。

**解決策**:
```bash
# Verify table exists
aws dynamodb describe-table --table-name your-table-name

# Check environment variable
echo $DYNAMODB_TABLE_NAME
```

---

### ValidationException: "One or more parameter values were invalid"

**場所**: AWS DynamoDB

**原因**: 無効なキー構造、非キー属性の空文字列、または予約語の競合。

**解決策**:
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

## Cognito認証エラー

### NotAuthorizedException

**場所**: AWS Cognito

**原因**: 無効な認証情報またはトークンの有効期限切れ。

**解決策**:
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

**場所**: AWS Cognito

**原因**: ユーザープールにユーザーが存在しません。

**解決策**:
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

**場所**: AWS Cognito

**原因**: ユーザーがメール/電話を確認していません。

**解決策**:
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

## インポートモジュールエラー {#import-module-errors}

:::tip Related Documentation
APIの詳細と使用パターンについては[ImportStatusHandler API](./import-export-patterns#importstatushandler-api)を参照してください。バージョン履歴については[変更履歴 v1.0.18](./changelog#v1018)を参照してください。
:::

### Step Functionsタイムアウト（インポートジョブ）

**場所**: `packages/import/src/event/import-status.queue.event.handler.ts`

**症状**: インポートジョブでStep Functions実行が無期限に`RUNNING`状態のまま。

**原因**: バージョン1.0.18より前は、`ImportStatusHandler`は完了したジョブに対してのみ`SendTaskSuccessCommand`を送信していました。インポートジョブが失敗した場合、Step Functionsにコールバックが送信されず、`waitForTaskToken`コールバックを無期限に待機していました。

**解決策** (1.0.18以降で修正):
ハンドラーはインポートジョブが失敗した場合に適切に`SendTaskFailureCommand`を送信するようになりました：

```typescript
// Internal behavior (automatic, no user action needed):
// - COMPLETED status → SendTaskSuccessCommand
// - FAILED status → SendTaskFailureCommand
```

古いバージョンを使用している場合：
1. `@mbc-cqrs-serverless/import@^1.0.18`にアップグレード
2. スタックした実行については、AWSコンソールまたはCLIで手動停止：
   ```bash
   aws stepfunctions stop-execution --execution-arn <execution-arn>
   ```

---

### BadRequestException: "No import strategy found for table: `{tableName}`"

**場所**: `packages/import/src/import.service.ts`

**原因**: 指定されたテーブル名にインポート戦略が登録されていません。

**解決策**:
ImportModuleを設定する際にインポート戦略を登録：

```typescript
ImportModule.register({
  profiles: [
    {
      tableName: 'your-table-name',  // Must match the tableName in your import request
      importStrategy: YourImportStrategy,
      processStrategy: YourProcessStrategy,
    },
  ],
})
```

---

### インポートジョブがPROCESSINGステータスでスタック

**場所**: `packages/import/src/event/import.queue.event.handler.ts`

**原因**: インポート処理中にエラーが発生したがジョブステータスが正しく更新されなかった、またはDynamoDBストリームが次のステップをトリガーできなかった。

**解決策**:
1. Lambdaエラーについては**CloudWatchログ**を確認
2. import_tmpテーブルでDynamoDBストリームが有効になっているか確認
3. インポートステータス通知用のSNSトピックが存在するか確認
4. スタックしたレコードをクリーンアップ：
   ```typescript
   await importService.updateStatus(
     { pk: 'CSV_IMPORT#tenant', sk: 'table#taskCode' },
     ImportStatusEnum.FAILED,
     { error: 'Manual cleanup' }
   );
   ```

---

## Step Functionsエラー

### TaskTimedOut

**場所**: AWS Step Functions

**原因**: Lambda関数が設定されたタイムアウト内に応答しませんでした。

**解決策**:
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

**場所**: AWS Step Functions

**原因**: Lambda関数が未処理のエラーをスローしました。

**解決策**:
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

## S3エラー

### NoSuchKey

**場所**: AWS S3

**原因**: 指定されたオブジェクトがバケットに存在しません。

**解決策**:
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

**場所**: AWS S3

**原因**: IAMポリシーがリクエストされた操作を許可していません。

**解決策**:
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

## SQSエラー

### MessageNotInflight

**場所**: AWS SQS

**原因**: フライト中でなくなったメッセージの削除または可視性の変更を試みています。

**解決策**:
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

## HTTPステータスコードリファレンス

| ステータス | 例外 | 意味 | 復旧戦略 |
|--------|-----------|---------|-------------------|
| 400 | BadRequestException | 無効な入力またはビジネスルール違反 | リクエストデータを修正 |
| 401 | UnauthorizedException | 認証が欠落しているか無効 | トークンを更新または再ログイン |
| 403 | ForbiddenException | 認証済みだが権限がない | ユーザー権限を確認 |
| 404 | NotFoundException | リソースが見つからない | リソースの存在を確認 |
| 409 | ConflictException | バージョン競合（楽観的ロック） | 更新して再試行 |
| 422 | UnprocessableEntityException | バリデーション失敗 | バリデーションエラーを修正 |
| 429 | TooManyRequestsException | レート制限超過 | バックオフリトライを実装 |
| 500 | InternalServerErrorException | 予期しないサーバーエラー | ログを確認し、バグを報告 |
| 502 | BadGatewayException | 上流サービスエラー | バックオフで再試行 |
| 503 | ServiceUnavailableException | サービスが一時的に利用不可 | 後で再試行 |
| 504 | GatewayTimeoutException | 上流サービスタイムアウト | タイムアウトを増やすか最適化 |

---

## エラーハンドリングのベストプラクティス

### 1. 集中エラーハンドラー

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

### 2. 指数バックオフでリトライ

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

### 3. サーキットブレーカーパターン

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

## デバッグのヒント

1. **デバッグログを有効にする**:
   ```bash
   DEBUG=* npm run offline
   ```

2. **Lambdaエラーについては**CloudWatchログ**を確認**:
   ```bash
   aws logs tail /aws/lambda/your-function-name --follow
   ```

3. **トレーシングには**リクエストID**を使用**:
   ```typescript
   console.log('RequestId:', context.awsRequestId);
   ```

4. **環境変数を確認**:
   ```typescript
   console.log('Config:', {
     table: process.env.DYNAMODB_TABLE_NAME,
     region: process.env.AWS_REGION,
   });
   ```

5. **serverless-offlineでローカルテスト**:
   ```bash
   npm run offline -- --stage dev
   ```

## 関連情報

- [デバッグガイド](./debugging-guide) - 詳細なデバッグ手順
- [よくある問題](./common-issues) - よく発生する問題
- [監視とログ](./monitoring-logging) - 本番監視の設定
