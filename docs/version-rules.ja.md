---
description: バージョン管理ルールと楽観的ロックについて学ぶ
---

# バージョン管理ルール

MBC CQRS Serverless フレームワークは、分散システムでのデータ整合性を確保するために、バージョン番号を使用した楽観的ロックを実装しています。このガイドでは、バージョン管理ルールとその実装例について説明します。

## 基本ルール

1. 同一PK/SKの順次バージョン管理
   - 同じpk/skの組み合わせを持つアイテムは、バージョン1から順番に設定する必要があります
   - 更新ごとにバージョン番号が1ずつインクリメントされます
   - 特定のバージョンでは最初のリクエストのみが成功します
   - 同じバージョンの後続のリクエストは競合エラーで失敗します

2. 独立したバージョンシーケンス
   - 異なるpk/skの組み合わせは、それぞれバージョン1から独自のシーケンスを開始します
   - バージョンシーケンスは各pk/skの組み合わせで独立して管理されます
   - これにより、異なるアイテムへの並行操作がバージョン競合なく実行可能です

3. 楽観的ロック
   - 同一アイテムへの同時更新を防ぐために使用されます
   - バージョン番号は更新ごとに自動的にインクリメントされます
   - バージョン競合時にConditionalCheckFailedExceptionをスローします
   - 分散環境でのデータ整合性を確保します

## 実装例

### 基本的なバージョン管理

```typescript
describe('バージョン管理', () => {
  it('順次バージョンを正しく処理すること', async () => {
    // バージョン0で作成
    const createPayload = {
      pk: 'TEST#VERSION',
      sk: 'item#1',
      id: 'TEST#VERSION#item#1',
      name: 'バージョンテスト',
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
      name: '更新後の名前',
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
describe('バージョン競合', () => {
  it('同時更新を正しく処理すること', async () => {
    const payload = {
      pk: 'TEST#VERSION',
      sk: 'conflict#1',
      id: 'TEST#VERSION#conflict#1',
      name: '競合テスト',
      version: 1,
      type: 'TEST',
    }

    // 最初の更新は成功
    const res1 = await request(config.apiBaseUrl)
      .put(`/items/${payload.id}`)
      .send(payload)

    // 同じバージョンでの2回目の更新は失敗
    const res2 = await request(config.apiBaseUrl)
      .put(`/items/${payload.id}`)
      .send(payload)

    expect(res1.statusCode).toBe(200)
    expect(res2.statusCode).toBe(409) // 競合
  })
})
```

### 独立したバージョンシーケンス

```typescript
describe('独立したバージョン管理', () => {
  it('独立したバージョンシーケンスを維持すること', async () => {
    const item1 = {
      pk: 'TEST#SEQ1',
      sk: 'item#1',
      id: 'TEST#SEQ1#item#1',
      name: 'シーケンス1',
      version: 0,
      type: 'TEST',
    }

    const item2 = {
      pk: 'TEST#SEQ2',
      sk: 'item#1',
      id: 'TEST#SEQ2#item#1',
      name: 'シーケンス2',
      version: 0,
      type: 'TEST',
    }

    // 両方のアイテムがバージョン1で開始
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

1. 更新操作には必ずバージョン番号を含める
2. アプリケーションでバージョン競合エラーを適切に処理する
3. 競合処理に適切なリトライ戦略を使用する
4. リトライには指数バックオフを検討する
5. APIドキュメントにバージョン管理の仕様を記載する
