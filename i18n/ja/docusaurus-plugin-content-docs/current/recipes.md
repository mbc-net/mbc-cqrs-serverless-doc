---
description: MBC CQRS Serverlessフレームワークでの一般的なユースケースの実践例と実装ガイド。
---

# サンプル

このセクションでは、一般的なユースケースの実践例と実装ガイドを提供します。各サンプルは、本番環境対応の完全なコードで実際のシナリオを示しています。

## 利用可能なサンプル

| サンプル | 説明 | 主要な概念 |
|-------------|-----------------|------------------|
| ディレクトリ | 組織階層とユーザー管理 | ネスト構造、リレーション、検索 |
| アンケートテンプレート | バリデーション付き動的フォームビルダー | スキーマ設計、バージョニング、複雑な属性 |

## 実装パターン

各サンプルは一貫したパターンに従っています:

### 1. エンティティ設計

```typescript
// Define your entity with proper key structure
export class OrderEntity extends BaseEntity {
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
// Create commands for state changes
async createOrder(dto: CreateOrderDto, context: IInvoke) {
  const orderId = await this.sequencesService.generateSequenceItem({
    tenantCode: dto.tenantCode,
    typeCode: 'ORDER',
  });

  return this.commandService.publish(
    {
      pk: `${dto.tenantCode}#ORDER`,
      sk: `ORDER#${orderId.formattedNo}`,
      code: orderId.formattedNo,
      name: dto.name,
      tenantCode: dto.tenantCode,
      attributes: dto.attributes,
    },
    { invokeContext: context },
  );
}
```

### 3. クエリパターン

```typescript
// Query data with proper filtering
async listOrders(tenantCode: string, options: ListOptions) {
  return this.dataService.listItemsByPk(
    { pk: `${tenantCode}#ORDER` },
    {
      limit: options.limit,
      exclusiveStartKey: options.nextToken,
    },
  );
}
```

### 4. イベントハンドラー

```typescript
// Handle data sync events
@EventHandler(OrderDataSyncEvent)
export class OrderDataSyncHandler implements IEventHandler<OrderDataSyncEvent> {
  async execute(event: OrderDataSyncEvent): Promise<void> {
    // Sync to read model (RDS, OpenSearch, etc.)
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
try {
  await this.commandService.publish(command, options);
} catch (error) {
  if (error instanceof VersionConflictException) {
    // Handle optimistic locking conflict
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
