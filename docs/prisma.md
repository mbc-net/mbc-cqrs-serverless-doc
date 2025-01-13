---
description: { { Prisma related recipes. } }
---

# {{Prisma}}

{{In MBC CQRS serverless, we use prisma as an ORM. It helps developers more productive when working with databases.}}

{{A common scenario when working with Prisma is needing to make changes to the database, such as creating tables, updating fields in tables, etc. Follow these steps:}}

1. {{Update prisma/schema.prisma file.}}
2. {{For local development, create and apply migrations with command npm run migrate:dev.}}

:::warning

{{For local development, please make sure to set the correct `DATABASE_URL` environment variable.}}

```bash
# Example
DATABASE_URL="postgresql://root:RootCqrs@localhost:5432/cqrs?schema=public"
```

:::

> {{You could view [prisma-client documentation](https://www.prisma.io/docs/orm/prisma-client) for more information}}

## {{Design table convention}}

{{When creating an RDS table that maps to a DynamoDB table, ensure you add the necessary fields and indexes to the RDS table accordingly.}}

```ts
id         String   @id
cpk        String // コマンド用PK
csk        String // コマンド用SK
pk         String // データ用PK, MASTER#tenantCode (テナントコード)
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
