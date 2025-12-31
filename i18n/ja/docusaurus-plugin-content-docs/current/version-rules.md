---
sidebar_position: 5
description: バージョン管理ルールと楽観的ロックについて学びます
---

# バージョン管理ルール

MBC CQRS サーバーレスフレームワークは、バージョン番号を使用した楽観的ロックを実装し、分散システムでのデータ一貫性を確保します。このガイドでは、バージョン管理ルールを説明し、実装例を提供します。

## 基本ルール

1. 同一PK/SKのシーケンシャルバージョニング   
   - 同一のPK/SKを持つアイテムは、バージョンを1から順次設定する必要があります。
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
   - バージョン競合時にConditionalCheckFailedExceptionをスローします。
   - 分散環境でのデータ一貫性を確保します。

## 実装例

### 基本的なバージョン管理

```typescript
describe('Version Handling', () => {
  it('should handle sequential versions correctly', async () => {
    // バージョン0で初期作成
    const createPayload = {
      pk: 'TEST#VERSION',
      sk: 'item#1',
      id: 'TEST#VERSION#item#1',
      name: 'Version Test',
      version: 0,
      type: 'TEST',
    }

    const createRes = await request(config.apiBaseUrl)
      .post('/items')
      .send(createPayload)

    expect(createRes.statusCode).toBe(201)
    expect(createRes.body.version).toBe(1)

    // 正しいバージョンで更新
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
    const payload = {
      pk: 'TEST#VERSION',
      sk: 'conflict#1',
      id: 'TEST#VERSION#conflict#1',
      name: 'Conflict Test',
      version: 1,
      type: 'TEST',
    }

    // First update succeeds
    const res1 = await request(config.apiBaseUrl)
      .put(`/items/${payload.id}`)
      .send(payload)

    // Second update with same version fails
    const res2 = await request(config.apiBaseUrl)
      .put(`/items/${payload.id}`)
      .send(payload)

    expect(res1.statusCode).toBe(200)
    expect(res2.statusCode).toBe(409) // Conflict
  })
})
```

### 独立したバージョンシーケンス

```typescript
describe('Independent Versioning', () => {
  it('should maintain independent version sequences', async () => {
    const item1 = {
      pk: 'TEST#SEQ1',
      sk: 'item#1',
      id: 'TEST#SEQ1#item#1',
      name: 'Sequence 1',
      version: 0,
      type: 'TEST',
    }

    const item2 = {
      pk: 'TEST#SEQ2',
      sk: 'item#1',
      id: 'TEST#SEQ2#item#1',
      name: 'Sequence 2',
      version: 0,
      type: 'TEST',
    }

    // Both items start at version 1
    const res1 = await request(config.apiBaseUrl)
      .post('/items')
      .send(item1)

    const res2 = await request(config.apiBaseUrl)
      .post('/items')
      .send(item2)

    expect(res1.body.version).toBe(1)
    expect(res2.body.version).toBe(1)

    // Update first item
    const updateRes = await request(config.apiBaseUrl)
      .put(`/items/${item1.id}`)
      .send({ ...item1, version: 1 })

    expect(updateRes.body.version).toBe(2)

    // Second item still at version 1
    const getRes = await request(config.apiBaseUrl)
      .get(`/items/${item2.id}`)

    expect(getRes.body.version).toBe(1)
  })
})
```

## ベストプラクティス

1. 更新操作には常にバージョン番号を含める
2. アプリケーションでバージョン競合エラーを適切に処理する
3. 競合を処理するための適切なリトライ戦略を使用する
4. リトライには指数バックオフを実装することを検討する
5. APIドキュメントにバージョン管理を記載する
