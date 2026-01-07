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
cpk        String // Command PK (コマンド用PK)
csk        String // Command SK (コマンド用SK)
pk         String // Data PK (データ用PK)
sk         String // Data SK (データ用SK)
tenantCode String   @map("tenant_code") // Tenant code (テナントコード)
seq        Int      @default(0) // Sort order, uses sequence feature (並び順、採番機能を使用)
code       String // Record code (レコードコード)
name       String // Record name (レコード名)
version    Int // Version (バージョン)
isDeleted  Boolean  @default(false) @map("is_deleted") // Deleted flag (削除フラグ)
createdBy  String   @default("") @map("created_by") // Created by (作成者)
createdIp  String   @default("") @map("created_ip") // Created IP, supports IPv6 (作成IP、IPv6対応)
createdAt  DateTime @default(now()) @map("created_at") @db.Timestamp(0) // Created at (作成日時)
updatedBy  String   @default("") @map("updated_by") // Updated by (更新者)
updatedIp  String   @default("") @map("updated_ip") // Updated IP, supports IPv6 (更新IP、IPv6対応)
updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamp(0) // Updated at (更新日時)

// properties (プロパティ)

// relations (リレーション)

// index (インデックス)
@@unique([cpk, csk])
@@unique([pk, sk])
@@unique([tenantCode, code])
@@index([tenantCode, name])
```
