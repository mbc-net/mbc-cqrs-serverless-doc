---
sidebar_position: 1
description: MBC CQRS Serverlessフレームワークで使用されるTypeScriptインターフェースの完全なリファレンス。
---

# インターフェース

このドキュメントでは、MBC CQRS Serverlessフレームワークで使用されるすべてのTypeScriptインターフェースの包括的なリファレンスを提供します。

## コアインターフェース

### コマンドインターフェース

#### CommandInputModel

新しいコマンドを作成するためのプライマリインターフェース。新しいエンティティを発行する際に使用します。

```ts
export interface CommandInputModel {
  pk: string              // Partition key (e.g., "ORDER#tenant001")
  sk: string              // Sort key with version (e.g., "ORDER#ORD001#v0")
  id: string              // Unique identifier (e.g., UUID)
  code: string            // Business code (e.g., "ORD001")
  name: string            // Display name
  version: number         // Version number for optimistic locking
  tenantCode: string      // Tenant identifier
  type: string            // Entity type (e.g., "ORDER")
  isDeleted?: boolean     // Soft delete flag
  seq?: number            // Sequence number (auto-generated)
  ttl?: number            // Time-to-live timestamp (Unix epoch)
  attributes?: Record<string, any>  // Custom domain attributes
}
```

**使用例**:
```typescript
const orderInput: CommandInputModel = {
  pk: 'ORDER#tenant001',
  sk: 'ORDER#ORD001#v0',
  id: crypto.randomUUID(),
  code: 'ORD001',
  name: 'Customer Order',
  version: 1,
  tenantCode: 'tenant001',
  type: 'ORDER',
  attributes: {
    customerId: 'CUST001',
    totalAmount: 1500,
    status: 'pending',
  },
};
```

#### CommandPartialInputModel

部分更新に使用します。pk、sk、versionのみが必須です。

```ts
export interface CommandPartialInputModel extends Partial<CommandInputModel> {
  pk: string       // Required: Partition key
  sk: string       // Required: Sort key
  version: number  // Required: Current version for optimistic locking
}
```

**使用例**:
```typescript
const partialUpdate: CommandPartialInputModel = {
  pk: 'ORDER#tenant001',
  sk: 'ORDER#ORD001',
  version: 2,  // Must match current version
  name: 'Updated Order Name',
  attributes: {
    status: 'confirmed',
  },
};
```

#### ICommandOptions

コマンド発行メソッドに渡されるオプション。

```ts
export interface ICommandOptions {
  source?: string        // Source identifier for tracking
  requestId?: string     // Request ID for tracing
  invokeContext: IInvoke // Required: Invocation context
}
```

**使用例**:
```typescript
const options: ICommandOptions = {
  source: 'order-service',
  requestId: context.awsRequestId,
  invokeContext: {
    userContext: getUserContext(event),
    tenantCode: 'tenant001',
  },
};
```

### キーインターフェース

#### DetailKey

DynamoDBアイテムのプライマリキーを表します。

```ts
export interface DetailKey {
  pk: string  // Partition key
  sk: string  // Sort key
}
```

### コンテキストインターフェース

#### IInvoke

Lambda/Expressのイベントとコンテキストを含む呼び出しコンテキスト。

```ts
export interface IInvoke {
  event?: IInvokeEvent      // Request event (headers, requestContext, etc.)
  context?: IInvokeContext  // Lambda context (requestId, functionName, etc.)
}
```

#### UserContext

認証トークンから抽出されるユーザーコンテキストクラス。

```ts
export class UserContext {
  userId: string      // Cognito user ID (from JWT sub claim)
  tenantRole: string  // User's role within the tenant
  tenantCode: string  // Current tenant code
}
```

**使用例**:
```typescript
import { getUserContext, IInvoke } from '@mbc-cqrs-serverless/core';

// Extract user context from IInvoke or ExecutionContext
const userContext = getUserContext(invokeContext);
console.log(userContext.userId);      // '92ca4f68-9ac6-4080-9ae2-2f02a86206a4'
console.log(userContext.tenantCode);  // 'tenant001'
console.log(userContext.tenantRole);  // 'admin'
```

## データインターフェース

### エンティティインターフェース

#### CommandModel

コマンドエンティティ（書き込みモデル）のインターフェース。

```ts
export interface CommandModel extends CommandInputModel {
  status?: string       // Processing status (処理ステータス: 'PENDING', 'COMPLETED', 'FAILED'等)
  source?: string       // Event source identifier (イベントソース識別子: 'POST /api/master', 'SQS'等)
  requestId?: string    // Unique request ID for tracing and idempotency (トレースと冪等性のための一意のリクエストID)
  createdAt?: Date      // Timestamp when the command was created (コマンド作成時のタイムスタンプ)
  updatedAt?: Date      // Timestamp when the command was last updated (コマンド最終更新時のタイムスタンプ)
  createdBy?: string    // User ID who created the command (コマンドを作成したユーザーID)
  updatedBy?: string    // User ID who last updated the command (コマンドを最後に更新したユーザーID)
  createdIp?: string    // IP address of the creator (作成者のIPアドレス)
  updatedIp?: string    // IP address of the last updater (最終更新者のIPアドレス)
  taskToken?: string    // Step Functions task token for async workflows (非同期ワークフロー用のStep Functionsタスクトークン)
}
```

#### DataModel

データエンティティ（読み取りモデル）の基本インターフェース。

```ts
export interface DataModel extends Omit<CommandModel, 'status'> {
  cpk?: string  // Command partition key - references source command record (コマンドパーティションキー - ソースコマンドレコードへの参照)
  csk?: string  // Command sort key with version - references exact command version (バージョン付きコマンドソートキー - 正確なコマンドバージョンへの参照)
}
```

### リストレスポンスインターフェース

#### DataListEntity

データクエリ用のページネーション付きリストレスポンス。

```ts
export class DataListEntity {
  items: DataEntity[]   // Array of entities
  total?: number        // Total count (if available)
  lastSk?: string       // Pagination cursor (last sort key)
}
```

**使用例**:
```typescript
const result = await dataService.listItemsByPk('ORDER#tenant001', {
  limit: 20,
  startFromSk: previousLastSk,
});

// Pagination
if (result.lastSk) {
  // More items available - use result.lastSk for next page
}
```

## サービスインターフェース

### 同期ハンドラーインターフェース

#### IDataSyncHandler

データ同期ハンドラーを実装するためのインターフェース。前進（up）およびロールバック（down）操作の両方を処理します。

```ts
export interface IDataSyncHandler<TExecuteResult = any, TRollbackResult = any> {
  readonly type?: string  // Optional type identifier

  /**
   * Upgrade/sync data when a command is executed
   */
  up(cmd: CommandModel): Promise<TExecuteResult>

  /**
   * Rollback/undo data when a command needs to be reverted
   */
  down(cmd: CommandModel): Promise<TRollbackResult>
}
```

**実装例**:
```typescript
@Injectable()
export class OrderRdsSyncHandler implements IDataSyncHandler {
  readonly type = 'ORDER';

  constructor(private readonly prisma: PrismaService) {}

  async up(cmd: CommandModel): Promise<void> {
    if (cmd.isDeleted) {
      await this.prisma.order.delete({
        where: { id: cmd.id },
      });
    } else {
      await this.prisma.order.upsert({
        where: { id: cmd.id },
        create: this.toRdsModel(cmd),
        update: this.toRdsModel(cmd),
      });
    }
  }

  async down(cmd: CommandModel): Promise<void> {
    // Rollback logic - restore previous state
    await this.prisma.order.delete({
      where: { id: cmd.id },
    });
  }

  private toRdsModel(cmd: CommandModel) {
    return {
      id: cmd.id,
      code: cmd.code,
      name: cmd.name,
      ...cmd.attributes,
    };
  }
}
```

## 通知インターフェース

### EmailNotification

メール通知送信用の設定。

```ts
export interface EmailNotification {
  fromAddr?: string       // Sender address (uses default if not specified)
  toAddrs: string[]       // Required: Recipient addresses
  ccAddrs?: string[]      // CC addresses
  bccAddrs?: string[]     // BCC addresses
  subject: string         // Required: Email subject
  body: string            // Required: HTML body content
  replyToAddrs?: string[] // Reply-to addresses
  attachments?: Attachment[]  // File attachments
}

export interface Attachment {
  filename: string      // Attachment filename
  content: Buffer       // File content as Buffer
  contentType?: string  // MIME type (e.g., 'application/pdf')
}
```

**使用例**:
```typescript
await emailService.sendEmail({
  toAddrs: ['user@example.com'],
  subject: 'Order Confirmation',
  body: `<h1>Order Confirmed</h1><p>Your order ${orderCode} has been confirmed.</p>`,
});
```

## モジュール設定インターフェース

### CommandModuleOptions

CommandModuleの設定オプション。

```ts
export interface CommandModuleOptions {
  tableName: string                           // DynamoDB table name
  dataSyncHandlers?: Type<IDataSyncHandler>[] // Custom sync handlers
  skipError?: boolean                         // Skip errors from previous command versions
  disableDefaultHandler?: boolean             // Disable the default data sync handler
}
```

**使用例**:
```typescript
@Module({
  imports: [
    CommandModule.register({
      tableName: 'order',
      dataSyncHandlers: [OrderRdsSyncHandler],
      disableDefaultHandler: false,
    }),
  ],
})
export class OrderModule {}
```

### SequencesModuleOptions

SequenceModuleの設定オプション。

```ts
export interface SequencesModuleOptions {
  enableController?: boolean  // Enable or disable default sequence controller
}
```

## イベントインターフェース

### StepFunctionsEvent

AWS Step Functionsからのイベント構造。

```ts
export interface StepFunctionsContextExecution {
  Id: string                    // Execution ID (実行ID)
  Input: { [id: string]: any }  // Input data (入力データ)
  Name: string                  // Execution name (実行名)
  RoleArn: string               // IAM role ARN (IAMロールARN)
  StartTime: string             // Execution start time (実行開始時刻)
}

export interface StepFunctionsContextState {
  EnteredTime: string   // State entered time (ステート開始時刻)
  Name: string          // State name (ステート名)
  RetryCount: number    // Retry count (リトライ回数)
}

export interface StepFunctionsContextStateMachine {
  Id: string    // State machine ID (ステートマシンID)
  Name: string  // State machine name (ステートマシン名)
}

export interface StepFunctionsContext {
  Execution: StepFunctionsContextExecution
  State: StepFunctionsContextState
  StateMachine: StepFunctionsContextStateMachine
}

export interface StepFunctionsEvent<TInput> {
  input: TInput                    // Input data passed to the state (ステートに渡された入力データ)
  context: StepFunctionsContext    // Step Functions context information (Step Functionsコンテキスト情報)
}
```

## 型ユーティリティ

### 共通型ヘルパー

```ts
// Partial type that requires specific keys
type RequiredPick<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// Deep partial type
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Entity without audit fields
type EntityInput<T> = Omit<T, 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>;
```

## 関連情報

- [コマンドサービス](./command-service) - これらのインターフェースを使用したコマンド
- [データサービス](./data-service) - これらのインターフェースを使用したデータクエリ
- [エンティティパターン](./entity-patterns) - エンティティの設計
- [エラーカタログ](./error-catalog) - エラーハンドリング
