---
description: Prisma関連のレシピ。
---

# Prisma

MBC CQRS サーバーレスでは、ORM として Prisma を使用します。これは、開発者がデータベースを操作する際の生産性を高めるのに役立ちます。

Prisma を使用する場合の一般的なシナリオでは、テーブルの作成、テーブル内のフィールドの更新など、データベースに変更を加える必要があります。次の手順を行います。

1. prisma/schema.prisma ファイルを更新します。
2. ローカル開発の場合は、npm run merge:dev コマンドを実行してしてマイグレーションファイルを作成し、適用します。

:::warning

ローカル開発の場合は、正しい「DATABASE_URL」環境変数を設定してください。

```bash
# Example
DATABASE_URL="postgresql://root:RootCqrs@localhost:5432/cqrs?schema=public"
```

:::

> 詳細については、[prisma-client ドキュメント](https://www.prisma.io/docs/orm/prisma-client) をご覧ください。

## テーブル設計の規則

DynamoDB テーブルにマップする RDS テーブルを作成するときは、必要なフィールドとインデックスをそれに応じて RDS テーブルに追加してください。

```ts
id         String   @id
cpk        String // コマンド用PK
csk        String // コマンド用SK
pk         String // データ用PK, MASTER#unigrab (テナントコード)
sk         String // データ用SK, マスタ種別コード#マスタコード
tenantCode String   @map("tenant_code") // テナントコード, 【テナントコードマスタ】
seq        Int      @default(0) // 並び順, 採番機能を使用する
code       String // レコードのコード, マスタ種別コード#マスタコード
name       String // レコード名, 名前
version    Int // バージョン
isDeleted  Boolean  @default(false) @map("is_deleted") // 削除フラグ
createdBy  String   @default("") @map("created_by") // 作成者
createdIp  String   @default("") @map("created_ip") // 作成IP, IPv6も考慮する
createdAt  DateTime @default(dbgenerated("CURRENT_TIMESTAMP(0)")) @map("created_at") @db.Timestamp(0) // 作成日時
updatedBy  String   @default("") @map("updated_by") // 更新者
updatedIp  String   @default("") @map("updated_ip") // 更新IP, IPv6も考慮する
updatedAt  DateTime @default(dbgenerated("CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0)")) @map("updated_at") @db.Timestamp(0) // 更新日時

// properties

// relations

// index
@@unique([cpk, csk])
@@unique([pk, sk])
```
