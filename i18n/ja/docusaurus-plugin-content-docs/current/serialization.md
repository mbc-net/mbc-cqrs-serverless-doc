---
sidebar_position: 4
description: データ構造変換のためのシリアライズヘルパーの使用方法を学びます
---

# シリアライズヘルパー関数

## 概要
MBC CQRS Serverless フレームワークは、DynamoDBの内部構造と外部向けフラット構造の間の変換を行うヘルパー関数を提供します。これらのヘルパーは、型安全性を維持しながら一貫したデータ変換を保証します。
## データ構造の変換

### DynamoDBの内部構造
```typescript
{
  pk: "PROJECT",
  sk: "123",
  name: "Test Project",
  attributes: {
    details: {
      status: "active",
      category: "development"
    }
  }
}
```

### External Flat Structure
```typescript
{
  id: "PROJECT#123",    // Combination of pk and sk
  code: "123",         // Mainly sk
  name: "Test Project", // First level in DynamoDB
  details: {           // Flattened from attributes
    status: "active",
    category: "development"
  }
}
```

## 使用方法

### 内部形式から外部形式への変換
```typescript
import { serializeToExternal } from '@mbc-cqrs-serverless/core';

const internal = {
  pk: "PROJECT",
  sk: "123",
  name: "Test Project",
  attributes: {
    details: {
      status: "active",
      category: "development"
    }
  }
};

const external = serializeToExternal(internal);
```

### 外部形式から内部形式への変換
```typescript
import { deserializeToInternal, CommandEntity } from '@mbc-cqrs-serverless/core';

const external = {
  id: "PROJECT#123",
  code: "123",
  name: "Test Project",
  details: {
    status: "active",
    category: "development"
  }
};

const internal = deserializeToInternal(external, CommandEntity);
```

## APIリファレンス

### serializeToExternal
```typescript
function serializeToExternal<T extends CommandEntity | DataEntity>(
  item: T | null | undefined,
  options?: SerializerOptions
): Record<string, any> | null
```

パラメータ
- `item`: 内部エンティティ（CommandEntityまたはDataEntity）
- `options`: オプションのシリアライズ設定
  - `keepAttributes`: 出力にattributesフィールドを保持（デフォルト: false）
  - `flattenDepth`: ネストされたオブジェクトのフラット化の最大深度（デフォルト: 無制限）

戻り値
- フラット化された外部構造、または入力がnull/undefinedの場合はnull

### deserializeToInternal
```typescript
function deserializeToInternal<T extends CommandEntity | DataEntity>(
  data: Record<string, any> | null | undefined,
  EntityClass: new () => T
): T | null
```

パラメータ
- `data`: Entity class to instantiate (CommandEntity or DataEntity)
- `EntityClass`: インスタンス化するエンティティクラス（CommandEntityまたはDataEntity）

戻り値
- 内部エンティティのインスタンス、または入力がnull/undefinedの場合はnull

## フィールドマッピング

### メタデータフィールド
| フィールド | 説明 |
|-------|-------------|
| id | 主キー |
| cpk | コマンドテーブル用の主キー |
| csk | コマンドテーブル用のソートキー |
| pk | データテーブル用の主キー |
| sk | データテーブル用のソートキー |
| tenantCode | テナントコード |
| type | エンティティタイプ（pkに埋め込む、例：'PROJECT'） |
| seq | 並び順 |
| code | コード（skの一部として使用可能） |
| name | 名前 |
| version | バージョン番号 |
| isDeleted | 削除フラグ |
| createdBy |  作成者のユーザIDまたはユーザ名 |
| createdIp | 作成者のIPアドレス |
| createdAt | 作成日時 |
| updatedBy | 更新者のユーザIDまたはユーザ名（作成時に設定） |
| updatedIp | 更新者のIPアドレス（作成時に設定） |
| updatedAt | 更新日時（作成時に設定） |
| description | 説明 |
| status | ステータス（CQRS処理用） |
| dueDate | DynamoDBのTTLに使用 |

### シリアライズマッピング
| 内部フィールド | 外部フィールド | 説明 |
|---------------|----------------|-------------|
| pk + sk | id | 一意識別のための結合主キー  |
| cpk | cpk | コマンドテーブル用の主キー  |
| csk | csk | コマンドテーブル用のソートキー |
| pk | pk | データテーブル用の主キー |
| sk | sk | データテーブル用のソートキー |
| sk | code | コードとして使用されるソートキー |
| tenantCode | tenantCode | テナント識別子 |
| type | type | エンティティタイプ（例：PROJECT） |
| seq | seq | 並び順用のシーケンス番号 |
| name | name | エンティティ名（第1階層のプロパティ） |
| version | version | 楽観的ロック用のバージョン |
| isDeleted | isDeleted | 削除フラグ |
| createdBy | createdBy | 作成者のユーザIDまたはユーザ名  |
| createdIp | createdIp | 作成者のIPアドレス |
| createdAt | createdAt | 作成日時 |
| updatedBy | updatedBy | 更新者のユーザIDまたはユーザ名 |
| updatedIp | updatedIp | 更新者のIPアドレス |
| updatedAt | updatedAt | 更新日時 |
| description | description | 説明 |
| status | status | CQRS処理ステータス |
| dueDate | dueDate | DynamoDBのTTLに使用 |
| attributes.* | * | 内部構造からフラット化された属性 |
