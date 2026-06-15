---
description: MBC CQRS Serverlessフレームワークでの一般的なユースケースの実践例と実装ガイド。
---

# サンプル

このセクションでは、一般的なユースケースの実践例と実装ガイドを提供します。各サンプルは、本番環境対応の完全なコードで実際のシナリオを示しています。

## 利用可能なサンプル

| サンプル | 説明 | 主要な概念 |
|-------------|-----------------|------------------|
| [Eコマース](/docs/ecommerce-example) | 在庫追跡を備えた注文管理 | 楽観的ロック、イベント駆動同期、ステータス遷移 |
| [SaaSアプリケーション](/docs/saas-example) | マルチテナントサブスクリプションと使用量計測 | テナント分離、クォータ強制、課金連携 |
| [アンケートテンプレート](/docs/survey-template) | バリデーション付き動的フォームビルダー | スキーマ設計、バージョニング、複雑な属性 |

## 実装パターン

各サンプルは一貫したパターンに従っています:

### 1. エンティティ設計

```typescript
// 適切なキー構造でエンティティを定義
export class OrderEntity extends DataEntity {
  pk: string;           // TENANT#tenantCode
  sk: string;           // ORDER#orderId
  id: string;
  tenantCode: string;
  code: string;
  name: string;
  attributes: OrderAttributes;
}
```

### 2. コマンドパターン

```typescript
// Create commands for state changes (状態変更用のコマンドを作成)
import { VERSION_FIRST, generateId } from '@mbc-cqrs-serverless/core';

async createOrder(dto: CreateOrderDto, context: IInvoke) {
  const orderId = await this.sequencesService.generateSequenceItem(
    {
      tenantCode: dto.tenantCode,
      typeCode: 'ORDER',
    },
    { invokeContext: context },
  );
  const pk = `ORDER#${dto.tenantCode}`;
  const sk = `ORDER#${orderId.formattedNo}`;
  return this.commandService.publishAsync(
    {
      pk,
      sk,
      id: generateId(pk, sk),           // Required: unique identifier (pk#sk) (必須: 一意識別子)
      code: orderId.formattedNo,
      name: dto.name,
      version: VERSION_FIRST,            // Required: VERSION_FIRST (0) for new entities (必須: 新規エンティティにはVERSION_FIRST (0) を使用)
      tenantCode: dto.tenantCode,
      type: 'ORDER',                     // Required: entity type (必須: エンティティタイプ)
      attributes: dto.attributes,
    },
    { invokeContext: context },
  );
}
```

### 3. クエリパターン

```typescript
// 適切なフィルタリングでデータを取得
async listOrders(tenantCode: string, options: ListOptions) {
  return this.dataService.listItemsByPk(
    `ORDER#${tenantCode}`,
    {
      limit: options.limit,
      startFromSk: options.lastSk,
    },
  );
}
```

### 4. イベントハンドラー

```typescript
// データ同期イベントを処理
@EventHandler(OrderDataSyncEvent)
export class OrderDataSyncHandler implements IEventHandler<OrderDataSyncEvent> {
  async execute(event: OrderDataSyncEvent): Promise<void> {
    // 読み取りモデルに同期（RDS、OpenSearchなど）
    await this.syncToReadModel(event.data);
  }
}
```

## ベストプラクティス

### キー設計

- 一貫したプレフィックスパターンを使用: `TENANT#code`、`ORDER#id`
- パーティションキーは均等に分散されるよう十分に広く保つ
- 階層データにはソートキーを使用

### エラーハンドリング

```typescript
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { ConflictException } from '@nestjs/common';

try {
  await this.commandService.publishAsync(command, options);
} catch (error) {
  if (error instanceof ConditionalCheckFailedException) {
    // 楽観的ロック競合を処理（バージョン不一致）
    throw new ConflictException('Item was modified by another process');
  }
  throw error;
}
```

### テスト

```typescript
describe('OrderService', () => {
  it('should create order with sequence', async () => {
    const result = await service.createOrder(mockDto, mockContext);
    expect(result.code).toMatch(/^ORD-\d{6}$/);
  });
});
```

## サンプルを探索

```mdx-code-block
import DocCardList from '@theme/DocCardList';

<DocCardList />
```


## 関連ドキュメント

- [サービスパターン](/docs/service-patterns) - CRUDサービスパターン
- [バックエンド開発](/docs/backend-development) - コアバックエンドガイド
- [キーパターン](/docs/key-patterns) - レシピ向けキー設計
