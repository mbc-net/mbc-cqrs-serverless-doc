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
await this.commandService.publishAsync({
  pk: 'TENANT#mbc',
  sk: 'ITEM#001',
  version: 0,
  // ...
}, { invokeContext });
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
@DataSyncHandler('sample')
export class MyDataSyncHandler implements IDataSyncHandler {
  async up(cmd: CommandModel): Promise<any> {
    const result = await this.externalApi.call(cmd.attributes);
    // If API fails, entire batch fails and retries! (APIが失敗すると、バッチ全体が失敗してリトライ！)
  }
}
```

```typescript
// ✅ Correct: Handle errors gracefully (正解: エラーを優雅に処理)
@DataSyncHandler('sample')
export class MyDataSyncHandler implements IDataSyncHandler {
  async up(cmd: CommandModel): Promise<any> {
    try {
      const result = await this.externalApi.call(cmd.attributes);
    } catch (error) {
      this.logger.error('Sync failed', { cmd, error });
      await this.deadLetterQueue.send(cmd); // DLQ for later processing (後で処理するためのDLQ)
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
@DataSyncHandler('sample')
export class MyDataSyncHandler implements IDataSyncHandler {
  async up(cmd: CommandModel): Promise<any> {
    await this.generatePdfReport(cmd.attributes); // Takes 30+ seconds (30秒以上かかる)
    await this.sendEmailWithAttachment(report);
  }
}
```

```typescript
// ✅ Correct: Delegate to async processing (正解: 非同期処理に委任)
@DataSyncHandler('sample')
export class MyDataSyncHandler implements IDataSyncHandler {
  async up(cmd: CommandModel): Promise<any> {
    // Quick enqueue, process asynchronously (素早くキューに入れ、非同期で処理)
    await this.taskService.publish('GenerateReport', {
      itemId: cmd.id,
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

## クイックリファレンスカード

MCPサーバーは現在、以下のアンチパターンを自動検出します。各コードの詳細については[MCPサーバーのアンチパターン検出](/docs/mcp-server#anti-pattern-detection)を参照してください。

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
| AP011 | 非推奨の `publish()` メソッド | 高 |
| AP012 | 大文字COMMON テナントキー（v1.1.0以前） | 重大 |
| AP013 | `publishSync` のnull戻り値未チェック（v1.2.0以降） | 高 |
| AP014 | 非推奨の `genNewSequence`（v1.2.0） | 高 |
| AP015 | `TaskModule.register()` の重複 | 高 |
| AP016 | 再スロー前のエラーログ欠如 | 高 |
| AP017 | 部分更新での属性マージ誤り | 高 |
| AP018 | Swaggerドキュメント欠如 | 低 |
| AP019 | リストクエリのページネーション欠如 | 高 |
| AP020 | トレース用 `getCommandSource` 欠如 | 低 |
| AP021 | publishAsync直後のイベント送信 | 高 |
| AP022 | `eval()` または `Function()` コンストラクタの使用 | 重大 |
| AP023 | 文字列連結によるシェルコマンド構築 | 重大 |
| AP024 | タイムアウトなしのHTTPリクエスト | 中 |
| AP025 | `process.env` またはリクエストオブジェクト全体のログ出力 | 高 |

## 関連ドキュメント

- [サービスパターン](/docs/service-patterns) - 推奨パターン
- [セキュリティベストプラクティス](/docs/security-best-practices) - セキュリティガイドライン
- [よくある問題](/docs/common-issues) - トラブルシューティングガイド
- [MCPサーバー](/docs/mcp-server) - アンチパターン検出ツール
