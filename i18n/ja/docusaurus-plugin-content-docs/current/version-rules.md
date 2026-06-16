---
sidebar_position: 5
description: MBC CQRS Serverlessでの並行コマンド処理と競合解決のためのバージョン番号を使用した楽観的ロック戦略を理解します。
---

# バージョン管理ルール

MBC CQRS サーバーレスフレームワークは、バージョン番号を使用した楽観的ロックを実装し、分散システムでのデータ一貫性を確保します。このガイドでは、バージョン管理ルールを説明し、実装例を提供します。

## 基本ルール {#basic-rules}

1. 同一PK/SKのシーケンシャルバージョニング   
   - 同一 pk/sk の最初のコマンドはバージョン 0（`VERSION_FIRST`）で送信し、保存されたアイテムはバージョン 1 になります。以降のバージョンは順番に増加します
   - 各更新でバージョン番号が1増加します。
   - 指定されたバージョンで最初のリクエストのみが成功します。
   - 同じバージョンでの後続リクエストは競合エラーで失敗します。

2. 独立したバージョンシーケンス
   - 異なるPK/SKの組み合わせごとに、独自のバージョンシーケンスを1から開始します。
   - バージョンシーケンスは、各PK/SKの組み合わせごとに独立して管理されます。
   - これにより、異なるアイテムに対する並列操作がバージョン競合なしで可能になります。

3. 楽観的ロック
   - 同一アイテムへの同時更新を防止するために使用されます。
   - バージョン番号は各更新時に自動的にインクリメントされます。
   - Throws BadRequestException on version conflicts (publishSync) (バージョン競合時にBadRequestExceptionをスロー（publishSync）)
   - Throws ConditionalCheckFailedException for concurrent duplicate key writes (DynamoDB-level) (重複キーの同時書き込み時にDynamoDBレベルでConditionalCheckFailedExceptionをスロー)
   - 分散環境でのデータ一貫性を確保します。

## VERSIONの定数 {#version-constants}

### VERSION_FIRST — 新規エンティティ

`VERSION_FIRST`（= `0`）は新規エンティティ作成時にversionとして使用します。フレームワークはアイテムが存在しないことを確認し、バージョン`1`で保存します。

```typescript
import { VERSION_FIRST } from '@mbc-cqrs-serverless/core';

await this.commandService.publishAsync(
  {
    pk: 'ORDER#tenant001',
    sk: 'ORD-001',
    version: VERSION_FIRST, // Create new entity — framework stores at version 1 (新規エンティティを作成 — フレームワークがバージョン1で保存)
    type: 'ORDER',
    tenantCode: 'tenant001',
    attributes: { total: 150 },
  },
  { invokeContext },
);
```

### VERSION_LATEST — バージョンチェックをスキップ

`VERSION_LATEST`（= `-1`）を使用すると、フレームワークが自動的に最新バージョンに解決し、楽観的ロックをバイパスします（「最後の書き込みが優先」）。並行競合が許容可能で常に最新値が正しい場合にのみ使用してください。

```typescript
import { VERSION_LATEST } from '@mbc-cqrs-serverless/core';

await this.commandService.publishPartialUpdateAsync(
  {
    pk: 'ORDER#tenant001',
    sk: 'ORD-001',
    version: VERSION_LATEST, // Update without version check — last writer wins (バージョンチェックなしで更新 — 最後の書き込みが優先)
    attributes: { status: 'shipped' },
  },
  { invokeContext },
);
```

:::warning
`VERSION_LATEST`は楽観的ロックをバイパスします。2つの並行リクエストが両方とも`VERSION_LATEST`を使用すると、2番目の書き込みが最初のものを上書きします。最新値が常に正しいべき等フィールド（例：ステータスフラグ）にのみ使用してください。
:::

## 実装例 {#implementation-examples}

### 基本的なバージョン管理

```typescript
describe('Version Handling', () => {
  it('should handle sequential versions correctly', async () => {
    // Initial create with version 0 (バージョン0で初期作成)
    const createPayload = {
      pk: 'TEST#tenant001',
      sk: 'TEST#item-1',
      id: 'TEST#tenant001#TEST#item-1',
      name: 'Version Test',
      version: 0,
      type: 'TEST',
    }

    const createRes = await request(config.apiBaseUrl)
      .post('/items')
      .send(createPayload)

    expect(createRes.statusCode).toBe(201)
    expect(createRes.body.version).toBe(1)

    // Update with correct version (正しいバージョンで更新)
    const updatePayload = {
      ...createPayload,
      version: 1,
      name: 'Updated Name',
    }

    const updateRes = await request(config.apiBaseUrl)
      .put(`/items/${createPayload.id}`)
      .send(updatePayload)

    expect(updateRes.statusCode).toBe(200)
    expect(updateRes.body.version).toBe(2)
  })
})
```

### バージョン競合の処理

```typescript
describe('Version Conflicts', () => {
  it('should handle concurrent updates correctly', async () => {
    const createPayload = {
      pk: 'TEST#tenant001',
      sk: 'TEST#conflict-1',
      id: 'TEST#tenant001#TEST#conflict-1',
      name: 'Conflict Test',
      version: 0,
      type: 'TEST',
    }

    // First create the item (アイテムを最初に作成)
    const createRes = await request(config.apiBaseUrl)
      .post('/items')
      .send(createPayload)

    expect(createRes.statusCode).toBe(201)

    const updatePayload = {
      ...createPayload,
      version: 1,
      name: 'Updated Name',
    }

    // First update with version 1 succeeds (バージョン1での最初の更新は成功)
    const res1 = await request(config.apiBaseUrl)
      .put(`/items/${createPayload.id}`)
      .send(updatePayload)

    // Second update with same version 1 fails (同じバージョン1での2番目の更新は失敗)
    const res2 = await request(config.apiBaseUrl)
      .put(`/items/${createPayload.id}`)
      .send(updatePayload)

    expect(res1.statusCode).toBe(200)
    expect(res2.statusCode).toBe(409) // 競合（409）
  })
})
```

### 独立したバージョンシーケンス

```typescript
describe('Independent Versioning', () => {
  it('should maintain independent version sequences', async () => {
    const item1 = {
      pk: 'TEST#seq1',
      sk: 'TEST#item-1',
      id: 'TEST#seq1#TEST#item-1',
      name: 'Sequence 1',
      version: 0,
      type: 'TEST',
    }

    const item2 = {
      pk: 'TEST#seq2',
      sk: 'TEST#item-1',
      id: 'TEST#seq2#TEST#item-1',
      name: 'Sequence 2',
      version: 0,
      type: 'TEST',
    }

    // Both items start at version 1 (両方のアイテムはバージョン1から開始)
    const res1 = await request(config.apiBaseUrl)
      .post('/items')
      .send(item1)

    const res2 = await request(config.apiBaseUrl)
      .post('/items')
      .send(item2)

    expect(res1.body.version).toBe(1)
    expect(res2.body.version).toBe(1)

    // Update first item (最初のアイテムを更新)
    const updateRes = await request(config.apiBaseUrl)
      .put(`/items/${item1.id}`)
      .send({ ...item1, version: 1 })

    expect(updateRes.body.version).toBe(2)

    // Second item still at version 1 (2番目のアイテムはまだバージョン1)
    const getRes = await request(config.apiBaseUrl)
      .get(`/items/${item2.id}`)

    expect(getRes.body.version).toBe(1)
  })
})
```

## ベストプラクティス {#best-practices}

1. 更新操作には常にバージョン番号を含める
2. アプリケーションでバージョン競合エラーを適切に処理する
3. 競合を処理するための適切なリトライ戦略を使用する
4. リトライには指数バックオフを実装することを検討する
5. APIドキュメントにバージョン管理を記載する


## 関連ドキュメント

- [コマンドサービス](/docs/command-service) - バージョン処理を伴うpublishSync
- [エラーカタログ](/docs/error-catalog) - バージョン競合エラー
- [バージョン競合ガイド](/docs/version-conflict-guide) - リトライ戦略と復旧パターン
- [サービスパターン](/docs/service-patterns) - 楽観的ロックパターン
