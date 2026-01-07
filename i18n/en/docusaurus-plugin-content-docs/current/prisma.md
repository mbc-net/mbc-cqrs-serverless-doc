---
description: Prisma related recipes.
---

# Prisma

In MBC CQRS serverless, we use prisma as an ORM. It helps developers more productive when working with databases.

A common scenario when working with Prisma is needing to make changes to the database, such as creating tables, updating fields in tables, etc. Follow these steps:

1. Update prisma/schema.prisma file.
2. For local development, create and apply migrations with command npm run migrate:dev.

:::warning

For local development, please make sure to set the correct `DATABASE_URL` environment variable.

```bash
# Example
DATABASE_URL="postgresql://root:RootCqrs@localhost:5432/cqrs?schema=public"
```

:::

> You could view [prisma-client documentation](https://www.prisma.io/docs/orm/prisma-client) for more information

## Design table convention

When creating an RDS table that maps to a DynamoDB table, ensure you add the necessary fields and indexes to the RDS table accordingly.

```ts
id         String   @id
cpk        String // Command PK
csk        String // Command SK
pk         String // Data PK
sk         String // Data SK
tenantCode String   @map("tenant_code") // Tenant code
seq        Int      @default(0) // Sort order, uses sequence feature
code       String // Record code
name       String // Record name
version    Int // Version
isDeleted  Boolean  @default(false) @map("is_deleted") // Deleted flag
createdBy  String   @default("") @map("created_by") // Created by
createdIp  String   @default("") @map("created_ip") // Created IP, supports IPv6
createdAt  DateTime @default(now()) @map("created_at") @db.Timestamp(0) // Created at
updatedBy  String   @default("") @map("updated_by") // Updated by
updatedIp  String   @default("") @map("updated_ip") // Updated IP, supports IPv6
updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamp(0) // Updated at

// properties

// relations

// index
@@unique([cpk, csk])
@@unique([pk, sk])
@@unique([tenantCode, code])
@@index([tenantCode, name])
```
