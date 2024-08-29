---
description: { { description } }
---

# {{title}}

{{intro_text}}

{{common_scenario_intro}}

1. {{step_1}}
2. {{step_2}}

:::warning

{{database_url_warning}}

```bash
# Example
DATABASE_URL="postgresql://root:RootCqrs@localhost:5432/cqrs?schema=public"
```

:::

> {{prisma_ref}}

## {{design_convention_title}}

{{design_convention_intro}}

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
