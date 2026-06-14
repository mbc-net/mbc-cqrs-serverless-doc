---
sidebar_position: 5
description: MBC CQRS Serverlessでの並行コマンド処理と競合解決のためのバージョン番号を使用した楽観的ロック戦略を理解します。
---

# バージョン管理ルール

MBC CQRS サーバーレスフレームワークは、バージョン番号を使用した楽観的ロックを実装し、分散システムでのデータ一貫性を確保します。このガイドでは、バージョン管理ルールを説明し、実装例を提供します。

## 基本ルール

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
   - バージョン競合時にConditionalCheckFailedExceptionをスローします。
   - 分散環境でのデータ一貫性を確保します。

## 実装例

### 基本的なバージョン管理

```typescript
describe('Version Handling', () => {
  it('should handle sequential versions correctly', async () => {
    // バージョン0で初期作成
    const createPayload = {
      pk: 'test#version',
      sk: 'item#1',
      id: 'test#version#item#1',
      name: 'Version Test',
      version: 0,
      type: 'test',
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
    const createPayload = {
      pk: 'test#version',
      sk: 'conflict#1',
      id: 'test#version#conflict#1',
      name: 'Conflict Test',
      version: 0,
      type: 'test',
    }

    // アイテムを最初に作成
    const createRes = await request(config.apiBaseUrl)
      .post('/items')
      .send(createPayload)

    expect(createRes.statusCode).toBe(201)

    const updatePayload = {
      ...createPayload,
      version: 1,
      name: 'Updated Name',
    }

    // バージョン1での最初の更新は成功
    const res1 = await request(config.apiBaseUrl)
      .put(`/items/${createPayload.id}`)
      .send(updatePayload)

    // 同じバージョン1での2番目の更新は失敗
    const res2 = await request(config.apiBaseUrl)
      .put(`/items/${createPayload.id}`)
      .send(updatePayload)

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

    // 両方のアイテムはバージョン1から開始
    const res1 = await request(config.apiBaseUrl)
      .post('/items')
      .send(item1)

    const res2 = await request(config.apiBaseUrl)
      .post('/items')
      .send(item2)

    expect(res1.body.version).toBe(1)
    expect(res2.body.version).toBe(1)

    // 最初のアイテムを更新
    const updateRes = await request(config.apiBaseUrl)
      .put(`/items/${item1.id}`)
      .send({ ...item1, version: 1 })

    expect(updateRes.body.version).toBe(2)

    // 2番目のアイテムはまだバージョン1
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


## 関連ドキュメント

- [コマンドサービス](/docs/command-service) - バージョン処理を伴うpublishSync
- [エラーカタログ](/docs/error-catalog) - バージョン競合エラー
- [サービスパターン](/docs/service-patterns) - 楽観的ロックパターン
