---
description: MBC CQRS Serverlessフレームワークで開発する際に避けるべき一般的なアンチパターン。
---

# アンチパターンガイド

このガイドでは、MBC CQRS Serverlessフレームワークで開発する際に避けるべき一般的な間違いとアンチパターンを文書化しています。「やってはいけないこと」を理解することは、ベストプラクティスを知ることと同じくらい重要です。

## コマンド処理のアンチパターン

### AP001: CommandServiceをバイパスした直接データベース書き込み

:::danger アンチパターン
CommandServiceをバイパスしてDynamoDBテーブルに直接書き込むことは絶対にしないでください。
:::

```typescript
// ❌ Anti-Pattern: Direct DynamoDB write (アンチパターン: 直接DynamoDB書き込み)
const dynamodb = new DynamoDBClient({});
await dynamodb.send(new PutItemCommand({
  TableName: 'my-table',
  Item: { pk: { S: 'TENANT#mbc' }, sk: { S: 'ITEM#001' }, ... }
}));
```

```typescript
// ✅ Correct: Use CommandService (正解: CommandServiceを使用)
await this.commandService.publishAsync(new ItemCommand({
  pk: { S: 'TENANT#mbc' },
  sk: { S: 'ITEM#001' },
  ...
}), context);
```

**なぜこれが問題なのか：**
- バージョン管理と楽観的ロックをバイパスする
- 下流同期のイベント発行をスキップする
- コマンドテーブルに監査証跡が残らない
- CQRSパターンの一貫性を壊す

---

### AP002: バージョン不一致エラーの無視

:::danger アンチパターン
適切な処理なしにVersionMismatchErrorをキャッチして無視することは絶対にしないでください。
:::

```typescript
// ❌ Anti-Pattern: Silently ignoring version mismatch (アンチパターン: バージョン不一致を黙って無視)
try {
  await this.commandService.publishAsync(command, context);
} catch (error) {
  if (error.name === 'VersionMismatchError') {
    console.log('Version mismatch, skipping...'); // Silent failure! (サイレント失敗！)
  }
}
```

```typescript
// ✅ Correct: Implement retry with fresh data (正解: 最新データでリトライを実装)
const MAX_RETRIES = 3;
for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  try {
    const latest = await this.dataService.getItem({ pk, sk });
    const command = this.buildCommand(latest);
    await this.commandService.publishAsync(command, context);
    break;
  } catch (error) {
    if (error.name === 'VersionMismatchError' && attempt < MAX_RETRIES - 1) {
      continue; // Retry with fresh data (最新データでリトライ)
    }
    throw error;
  }
}
```

**なぜこれが問題なのか：**
- データ損失 - 変更が黙って破棄される
- ユーザーが見ているものとデータベースの間で状態が不整合
- 本番環境での問題のデバッグが困難

---

### AP003: 重い操作にpublishSyncを使用

:::danger アンチパターン
重い下流処理をトリガーする操作にはpublishSyncを避けてください。
:::

```typescript
// ❌ Anti-Pattern: Sync publish for batch import (アンチパターン: バッチインポートに同期パブリッシュ)
for (const item of thousandItems) {
  await this.commandService.publishSync(item, context); // Blocks until complete! (完了までブロック！)
}
```

```typescript
// ✅ Correct: Use publishAsync for batch operations (正解: バッチ操作にはpublishAsyncを使用)
const promises = thousandItems.map(item =>
  this.commandService.publishAsync(item, context)
);
await Promise.all(promises);
```

**なぜこれが問題なのか：**
- Lambdaタイムアウトのリスク - Step Functions実行がレイテンシを追加
- 悪いユーザー体験 - 長い待ち時間
- 高いコスト - Lambdaは実行時間で課金

---

## データアクセスのアンチパターン

### AP004: N+1クエリパターン

:::danger アンチパターン
ループ内で関連データを取得することを避けてください。
:::

```typescript
// ❌ Anti-Pattern: N+1 queries (アンチパターン: N+1クエリ)
const orders = await this.dataService.listItems({ pk: tenantPk });
for (const order of orders) {
  // Each iteration makes a DB call! (各反復でDBコールが発生！)
  const customer = await this.dataService.getItem({
    pk: order.customerPk,
    sk: order.customerSk
  });
  order.customer = customer;
}
```

```typescript
// ✅ Correct: Batch fetch or denormalize (正解: バッチ取得または非正規化)
const orders = await this.dataService.listItems({ pk: tenantPk });
const customerKeys = orders.map(o => ({ pk: o.customerPk, sk: o.customerSk }));
const customers = await this.dataService.batchGetItems(customerKeys);
const customerMap = new Map(customers.map(c => [c.sk, c]));
orders.forEach(order => {
  order.customer = customerMap.get(order.customerSk);
});
```

**なぜこれが問題なのか：**
- パフォーマンス低下 - 100件の注文 = 101回のDBコール
- 高いDynamoDBコスト
- 負荷時にスロットリングの可能性

---

### AP005: フィルターなしのスキャン

:::danger アンチパターン
適切なフィルタリングなしにテーブル全体をスキャンしないでください。
:::

```typescript
// ❌ Anti-Pattern: Full table scan (アンチパターン: フルテーブルスキャン)
const allItems = await this.dataService.scan({ TableName: 'data-table' });
const filteredItems = allItems.filter(item => item.status === 'active');
```

```typescript
// ✅ Correct: Query with proper key conditions (正解: 適切なキー条件でクエリ)
const activeItems = await this.dataService.listItems({
  pk: tenantPk,
  sk: { $beginsWith: 'ITEM#' },
  filter: { status: 'active' }
});
```

**なぜこれが問題なのか：**
- テーブル全体を読み取り、大量のRCUを消費
- 大きなテーブルでは極端に遅い
- 他の操作に影響を与えるDynamoDBスロットリングを引き起こす可能性

---

### AP006: DynamoDBへの大きなオブジェクトの保存

:::danger アンチパターン
大きなファイルやバイナリデータをDynamoDBアイテムに直接保存しないでください。
:::

```typescript
// ❌ Anti-Pattern: Large base64 file in DynamoDB (アンチパターン: DynamoDBに大きなbase64ファイル)
const command = new DocumentCommand({
  pk,
  sk,
  attributes: {
    pdfContent: largeBase64String, // Could be megabytes! (メガバイトになる可能性！)
  }
});
```

```typescript
// ✅ Correct: Store in S3, reference in DynamoDB (正解: S3に保存、DynamoDBで参照)
const s3Key = `documents/${tenantCode}/${documentId}.pdf`;
await this.s3Service.upload(s3Key, fileBuffer);

const command = new DocumentCommand({
  pk,
  sk,
  attributes: {
    pdfLocation: toS3Uri(bucket, s3Key), // s3://bucket/path
  }
});
```

**なぜこれが問題なのか：**
- DynamoDBアイテムサイズ制限は400KB
- 大きなアイテムの読み取り/書き込みコストが高い
- クエリパフォーマンスが遅い

---

## マルチテナントのアンチパターン

### AP007: テナントコードのハードコーディング

:::danger アンチパターン
アプリケーションロジックにテナントコードをハードコーディングしないでください。
:::

```typescript
// ❌ Anti-Pattern: Hardcoded tenant (アンチパターン: ハードコードされたテナント)
const pk = 'TENANT#default';
const items = await this.dataService.listItems({ pk });
```

```typescript
// ✅ Correct: Use context-provided tenant (正解: コンテキストから提供されるテナントを使用)
const { tenantCode } = getUserContext(context);
const pk = generatePk(tenantCode);
const items = await this.dataService.listItems({ pk });
```

**なぜこれが問題なのか：**
- テナント間データ漏洩のリスク
- マルチテナント分離が壊れる
- テナント固有の問題のデバッグが困難

---

### AP008: テナント検証の欠如

:::danger アンチパターン
検証なしにクライアント提供のテナントコードを信頼しないでください。
:::

```typescript
// ❌ Anti-Pattern: Trusting client input (アンチパターン: クライアント入力を信頼)
@Post()
async create(@Body() dto: CreateDto) {
  const pk = `TENANT#${dto.tenantCode}`; // Client controls tenant! (クライアントがテナントを制御！)
  // ...
}
```

```typescript
// ✅ Correct: Validate against JWT claims (正解: JWTクレームに対して検証)
@Post()
async create(
  @Body() dto: CreateDto,
  @Req() request: IInvoke
) {
  const { tenantCode } = getUserContext(request);
  const pk = generatePk(tenantCode); // From authenticated context (認証済みコンテキストから)
  // ...
}
```

**なぜこれが問題なのか：**
- 重大なセキュリティ脆弱性
- 攻撃者が他のテナントのデータにアクセス可能
- コンプライアンス違反（GDPR、SOC2など）

---

## イベント処理のアンチパターン

### AP009: データ同期ハンドラーでのエラースロー

:::danger アンチパターン
DataSyncHandlerから未処理の例外をエスケープさせないでください。
:::

```typescript
// ❌ Anti-Pattern: Unhandled exception (アンチパターン: 未処理の例外)
@DataSyncHandler({ tableName: 'data-table' })
export class MyDataSyncHandler implements IDataSyncHandler {
  async handleSync(event: SyncEvent): Promise<void> {
    const result = await this.externalApi.call(event.data);
    // If API fails, entire batch fails and retries! (APIが失敗すると、バッチ全体が失敗してリトライ！)
  }
}
```

```typescript
// ✅ Correct: Handle errors gracefully (正解: エラーを優雅に処理)
@DataSyncHandler({ tableName: 'data-table' })
export class MyDataSyncHandler implements IDataSyncHandler {
  async handleSync(event: SyncEvent): Promise<void> {
    try {
      const result = await this.externalApi.call(event.data);
    } catch (error) {
      this.logger.error('Sync failed', { event, error });
      await this.deadLetterQueue.send(event); // DLQ for later processing (後で処理するためのDLQ)
      // Don't rethrow - mark as processed (再スローしない - 処理済みとしてマーク)
    }
  }
}
```

**なぜこれが問題なのか：**
- DynamoDB Streamsがバッチ全体をリトライ
- 無限リトライループを引き起こす可能性
- 後続イベントの処理をブロック

---

### AP010: 長時間実行の同期ハンドラー

:::danger アンチパターン
同期ハンドラーでの長時間実行操作を避けてください。
:::

```typescript
// ❌ Anti-Pattern: Heavy processing in handler (アンチパターン: ハンドラーでの重い処理)
@DataSyncHandler({ tableName: 'data-table' })
export class MyDataSyncHandler implements IDataSyncHandler {
  async handleSync(event: SyncEvent): Promise<void> {
    await this.generatePdfReport(event.data); // Takes 30+ seconds (30秒以上かかる)
    await this.sendEmailWithAttachment(report);
  }
}
```

```typescript
// ✅ Correct: Delegate to async processing (正解: 非同期処理に委任)
@DataSyncHandler({ tableName: 'data-table' })
export class MyDataSyncHandler implements IDataSyncHandler {
  async handleSync(event: SyncEvent): Promise<void> {
    // Quick enqueue, process asynchronously (素早くキューに入れ、非同期で処理)
    await this.taskService.publish('GenerateReport', {
      itemId: event.data.id,
      type: 'pdf'
    });
  }
}
```

**なぜこれが問題なのか：**
- Lambdaタイムアウト（最大15分）
- DynamoDB Stream処理をブロック
- 高コストと低スケーラビリティ

---

## シーケンスのアンチパターン

### AP011: シーケンス枯渇の未処理

:::danger アンチパターン
シーケンスが枯渇しないと仮定しないでください。
:::

```typescript
// ❌ Anti-Pattern: No exhaustion check (アンチパターン: 枯渇チェックなし)
const sequence = await this.sequenceService.next('ORDER', context);
const orderCode = `ORD-${sequence.value}`;
```

```typescript
// ✅ Correct: Plan for sequence limits (正解: シーケンス制限を計画)
const sequence = await this.sequenceService.next('ORDER', context);
if (sequence.value >= 9999999) {
  this.logger.warn('Sequence nearing limit', { current: sequence.value });
  await this.alertService.notify('Sequence almost exhausted');
}
const orderCode = `ORD-${String(sequence.value).padStart(7, '0')}`;
```

**なぜこれが問題なのか：**
- シーケンス枯渇時のビジネス中断
- フォーマット移行計画が必要な場合がある

---

### AP012: 非シーケンシャルなニーズにシーケンスを使用

:::danger アンチパターン
一意のIDが必要なだけの場合はシーケンスを使用しないでください。
:::

```typescript
// ❌ Anti-Pattern: Sequence for uniqueness only (アンチパターン: 一意性のためだけにシーケンス)
const seq = await this.sequenceService.next('TEMP_FILE', context);
const tempFileName = `file_${seq.value}.tmp`;
```

```typescript
// ✅ Correct: Use UUID for non-sequential needs (正解: 非シーケンシャルなニーズにはUUIDを使用)
import { randomUUID } from 'crypto';
const tempFileName = `file_${randomUUID()}.tmp`;
```

**なぜこれが問題なのか：**
- シーケンスが競合ポイントを作成
- 不要なDynamoDB書き込み
- シーケンス番号の無駄遣い

---

## 認証のアンチパターン

### AP013: コードにシークレットを保存

:::danger アンチパターン
シークレットをソースコントロールにコミットしないでください。
:::

```typescript
// ❌ Anti-Pattern: Hardcoded secrets (アンチパターン: ハードコードされたシークレット)
const cognitoConfig = {
  clientId: 'abc123xyz',
  clientSecret: 'super-secret-value-here', // In source code! (ソースコード内！)
};
```

```typescript
// ✅ Correct: Use environment variables or Secrets Manager (正解: 環境変数またはSecrets Managerを使用)
const cognitoConfig = {
  clientId: process.env.COGNITO_CLIENT_ID,
  clientSecret: await this.secretsManager.getSecret('cognito-secret'),
};
```

**なぜこれが問題なのか：**
- リポジトリが侵害された場合のセキュリティ侵害
- コード変更なしでローテーションできない
- セキュリティコンプライアンス要件に違反

---

### AP014: JWTクレームの未検証

:::danger アンチパターン
適切な検証なしにJWTを信頼しないでください。
:::

```typescript
// ❌ Anti-Pattern: Trusting unvalidated claims (アンチパターン: 未検証のクレームを信頼)
const token = request.headers.authorization?.split(' ')[1];
const payload = JSON.parse(atob(token.split('.')[1]));
const userId = payload.sub; // No signature verification! (署名検証なし！)
```

```typescript
// ✅ Correct: Use framework's built-in validation (正解: フレームワークの組み込み検証を使用)
// The framework validates JWT automatically via Cognito authorizer (フレームワークはCognitoオーソライザーを介してJWTを自動検証)
@UseGuards(AuthGuard)
async myEndpoint(@Req() request: IInvoke) {
  const claims = getJwtClaims(request);
  const userId = claims.sub; // Verified by authorizer (オーソライザーによって検証済み)
}
```

**なぜこれが問題なのか：**
- トークンが偽造される可能性
- 有効期限の検証なし
- 発行者の検証なし

---

## テストのアンチパターン

### AP015: 本番データに対するテスト

:::danger アンチパターン
本番データベースに対してテストを実行しないでください。
:::

```typescript
// ❌ Anti-Pattern: Production connection in tests (アンチパターン: テストでの本番接続)
// .env.test
DATABASE_URL=dynamodb://production-table  // DANGEROUS! (危険！)
```

```typescript
// ✅ Correct: Use local DynamoDB for testing (正解: テストにはローカルDynamoDBを使用)
// .env.test
DATABASE_URL=http://localhost:8000
TABLE_NAME=test-table
```

**なぜこれが問題なのか：**
- データ破損または損失
- 実際のユーザーに影響
- コンプライアンスとプライバシーの違反

---

### AP016: AWSサービスのモックなし

:::danger アンチパターン
ユニットテストで実際のAWSコールを行わないでください。
:::

```typescript
// ❌ Anti-Pattern: Real AWS calls (アンチパターン: 実際のAWSコール)
describe('OrderService', () => {
  it('creates order', async () => {
    const result = await service.create(orderDto); // Hits real DynamoDB! (実際のDynamoDBにアクセス！)
  });
});
```

```typescript
// ✅ Correct: Mock AWS services (正解: AWSサービスをモック)
describe('OrderService', () => {
  beforeEach(() => {
    jest.spyOn(commandService, 'publishAsync').mockResolvedValue({});
  });

  it('creates order', async () => {
    const result = await service.create(orderDto);
    expect(commandService.publishAsync).toHaveBeenCalledWith(
      expect.objectContaining({ pk: expect.any(String) }),
      expect.any(Object)
    );
  });
});
```

**なぜこれが問題なのか：**
- テスト実行が遅い
- AWSコストが蓄積
- ネットワーク問題による不安定なテスト
- オフラインでテストを実行できない

---

## パフォーマンスのアンチパターン

### AP017: コールドスタートの増幅

:::danger アンチパターン
コールドスタートの影響を増大させるパターンを避けてください。
:::

```typescript
// ❌ Anti-Pattern: Heavy initialization at module load (アンチパターン: モジュールロード時の重い初期化)
import { createConnection } from 'heavy-database-lib'; // Loaded on cold start (コールドスタート時にロード)

const connection = createConnection({ /* ... */ }); // Blocks cold start! (コールドスタートをブロック！)

export class MyService {
  // ...
}
```

```typescript
// ✅ Correct: Lazy initialization (正解: 遅延初期化)
import type { Connection } from 'database-lib';

let connection: Connection | null = null;

async function getConnection(): Promise<Connection> {
  if (!connection) {
    const { createConnection } = await import('database-lib');
    connection = await createConnection({ /* ... */ });
  }
  return connection;
}

export class MyService {
  async query() {
    const conn = await getConnection();
    // ...
  }
}
```

**なぜこれが問題なのか：**
- すべてのコールドスタートが初期化コストを支払う
- 最初のリクエストでのユーザー体験が悪い
- 高いレイテンシパーセンタイル

---

### AP018: 無制限のバッチ操作

:::danger アンチパターン
単一のLambda呼び出しで無制限のアイテムを処理しないでください。
:::

```typescript
// ❌ Anti-Pattern: Processing all items (アンチパターン: すべてのアイテムを処理)
async processAll(): Promise<void> {
  const allItems = await this.fetchAllItems(); // Could be millions! (数百万になる可能性！)
  for (const item of allItems) {
    await this.process(item);
  }
}
```

```typescript
// ✅ Correct: Paginated processing with limits (正解: 制限付きのページネーション処理)
async processAll(): Promise<void> {
  let lastKey: Key | undefined;
  const BATCH_SIZE = 100;

  do {
    const { items, lastEvaluatedKey } = await this.dataService.listItems({
      pk: this.tenantPk,
      limit: BATCH_SIZE,
      exclusiveStartKey: lastKey,
    });

    await Promise.all(items.map(item => this.process(item)));
    lastKey = lastEvaluatedKey;

    if (lastKey) {
      // Continue in new invocation to avoid timeout (タイムアウトを避けるため新しい呼び出しで続行)
      await this.taskService.publish('ProcessBatch', { startKey: lastKey });
      break;
    }
  } while (lastKey);
}
```

**なぜこれが問題なのか：**
- Lambdaタイムアウト（最大15分）
- メモリ枯渇
- 進捗の可視性なし

---

## クイックリファレンスカード

| コード | アンチパターン | 重大度 |
|----------|------------------|--------------|
| AP001 | 直接データベース書き込み | 重大 |
| AP002 | バージョン不一致の無視 | 高 |
| AP003 | 重い操作にpublishSync | 中 |
| AP004 | N+1クエリパターン | 高 |
| AP005 | フィルターなしのテーブルスキャン | 高 |
| AP006 | DynamoDBの大きなオブジェクト | 中 |
| AP007 | ハードコードされたテナントコード | 重大 |
| AP008 | テナント検証の欠如 | 重大 |
| AP009 | 同期ハンドラーでのスロー | 高 |
| AP010 | 長時間実行の同期ハンドラー | 中 |
| AP011 | シーケンス枯渇処理なし | 低 |
| AP012 | 非シーケンシャルIDにシーケンス | 低 |
| AP013 | コード内のシークレット | 重大 |
| AP014 | 未検証のJWTクレーム | 重大 |
| AP015 | 本番に対するテスト | 重大 |
| AP016 | テストでの実際のAWSコール | 中 |
| AP017 | コールドスタートの増幅 | 中 |
| AP018 | 無制限のバッチ操作 | 高 |

## 関連項目

- [エラーカタログ](./error-catalog) - エラーコードと解決策
- [よくある問題](./common-issues) - トラブルシューティングガイド
- [セキュリティベストプラクティス](./security-best-practices) - セキュリティガイドライン
- [サービスパターン](./service-patterns) - 推奨パターン
