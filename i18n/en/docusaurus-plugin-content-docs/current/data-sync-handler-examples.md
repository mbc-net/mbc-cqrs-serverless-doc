---
description: Practical examples of implementing Data Sync Handlers for various use cases.
---

# Data Sync Handler Examples

This guide explains how to implement Data Sync Handlers that automatically synchronize data from DynamoDB (command source) to RDS (query database). This is the core mechanism that enables the CQRS read model.

## When to Use This Guide

Use this guide when you need to:

- Sync entity data from DynamoDB to MySQL/PostgreSQL for complex queries
- Transform nested JSON attributes into relational columns
- Handle different record types within the same DynamoDB table
- Process parent-child relationships (Order, OrderItem) separately

## Problems This Pattern Solves

| Problem | Solution |
|---------|----------|
| DynamoDB cannot do JOINs or complex filters | Sync data to RDS for SQL queries |
| Version suffix in SK causes duplicate records | Use removeSortKeyVersion() before upserting |
| Different record types need different RDS tables | Filter by SK prefix in handler |
| JSON attributes need to be searchable columns | Map attributes to individual RDS columns |

## Basic Structure

All Data Sync Handlers follow this basic structure:

```ts
import { CommandModel, IDataSyncHandler, removeSortKeyVersion } from "@mbc-cqrs-serverless/core";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma";

@Injectable()
export class EntityDataSyncRdsHandler implements IDataSyncHandler {
  private readonly logger = new Logger(EntityDataSyncRdsHandler.name);

  constructor(private readonly prismaService: PrismaService) {}

  async up(cmd: CommandModel): Promise<any> {
    // Sync data to RDS
  }

  async down(cmd: CommandModel): Promise<any> {
    // Optional: Handle rollback (usually just logs)
    this.logger.debug(cmd);
  }
}
```

## Example 1: Simple Entity Sync

### Use Case: Sync Products to Enable Search and Filtering

Scenario: Products stored in DynamoDB need to be searchable by category, price range, and text.

Solution: Sync to RDS and map attributes to indexed columns for efficient queries.

```ts
import {
  CommandModel,
  IDataSyncHandler,
  removeSortKeyVersion
} from "@mbc-cqrs-serverless/core";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma";

interface ProductAttributes {
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
}

@Injectable()
export class ProductDataSyncRdsHandler implements IDataSyncHandler {
  private readonly logger = new Logger(ProductDataSyncRdsHandler.name);

  constructor(private readonly prismaService: PrismaService) {}

  async up(cmd: CommandModel): Promise<any> {
    // Remove version suffix from sort key (e.g., "PROD001@1" -> "PROD001")
    const sk = removeSortKeyVersion(cmd.sk);
    const attrs = cmd.attributes as ProductAttributes;

    await this.prismaService.product.upsert({
      where: { id: cmd.id },
      update: {
        pk: cmd.pk,
        sk: sk,
        name: cmd.name,
        code: cmd.code,
        version: cmd.version,
        tenantCode: cmd.tenantCode,
        // Map attributes to columns
        description: attrs.description,
        price: attrs.price,
        category: attrs.category,
        inStock: attrs.inStock,
        // Audit fields
        isDeleted: cmd.isDeleted ?? false,
        createdAt: cmd.createdAt,
        createdBy: cmd.createdBy,
        updatedAt: cmd.updatedAt,
        updatedBy: cmd.updatedBy,
      },
      create: {
        id: cmd.id,
        pk: cmd.pk,
        sk: sk,
        // Also store original keys with version for reference
        cpk: cmd.pk,
        csk: cmd.sk,
        name: cmd.name,
        code: cmd.code,
        version: cmd.version,
        tenantCode: cmd.tenantCode,
        description: attrs.description,
        price: attrs.price,
        category: attrs.category,
        inStock: attrs.inStock,
        isDeleted: cmd.isDeleted ?? false,
        createdAt: cmd.createdAt,
        createdBy: cmd.createdBy,
        updatedAt: cmd.updatedAt,
        updatedBy: cmd.updatedBy,
      },
    });
  }

  async down(cmd: CommandModel): Promise<any> {
    this.logger.debug(cmd);
  }
}
```

## Example 2: Conditional Processing with SK Prefix

### Use Case: Order and OrderItem in Same DynamoDB Table

Scenario: Orders and their items share the same PK but have different SK prefixes. Each needs to go to a different RDS table.

Solution: Check SK prefix to route to appropriate sync logic.

```ts
import {
  CommandModel,
  IDataSyncHandler,
  KEY_SEPARATOR,
  removeSortKeyVersion
} from "@mbc-cqrs-serverless/core";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma";

const ORDER_SK_PREFIX = "ORDER";
const ORDER_ITEM_SK_PREFIX = "ORDER_ITEM";

interface OrderAttributes {
  customerId: string;
  status: string;
  totalAmount: number;
  orderDate: string;
}

interface OrderItemAttributes {
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

@Injectable()
export class OrderDataSyncRdsHandler implements IDataSyncHandler {
  private readonly logger = new Logger(OrderDataSyncRdsHandler.name);

  constructor(private readonly prismaService: PrismaService) {}

  async up(cmd: CommandModel): Promise<any> {
    const sk = removeSortKeyVersion(cmd.sk);

    // Process only ORDER records, skip ORDER_ITEM
    if (sk.startsWith(ORDER_SK_PREFIX) && !sk.startsWith(ORDER_ITEM_SK_PREFIX)) {
      await this.syncOrder(cmd, sk);
    } else if (sk.startsWith(ORDER_ITEM_SK_PREFIX)) {
      await this.syncOrderItem(cmd, sk);
    }
    // Skip other record types
  }

  private async syncOrder(cmd: CommandModel, sk: string): Promise<void> {
    const attrs = cmd.attributes as OrderAttributes;

    await this.prismaService.order.upsert({
      where: { id: cmd.id },
      update: {
        pk: cmd.pk,
        sk: sk,
        code: cmd.code,
        version: cmd.version,
        customerId: attrs.customerId,
        status: attrs.status,
        totalAmount: attrs.totalAmount,
        orderDate: new Date(attrs.orderDate),
        isDeleted: cmd.isDeleted ?? false,
        updatedAt: cmd.updatedAt,
        updatedBy: cmd.updatedBy,
      },
      create: {
        id: cmd.id,
        pk: cmd.pk,
        sk: sk,
        cpk: cmd.pk,
        csk: cmd.sk,
        code: cmd.code,
        version: cmd.version,
        tenantCode: cmd.tenantCode,
        customerId: attrs.customerId,
        status: attrs.status,
        totalAmount: attrs.totalAmount,
        orderDate: new Date(attrs.orderDate),
        isDeleted: cmd.isDeleted ?? false,
        createdAt: cmd.createdAt,
        createdBy: cmd.createdBy,
        updatedAt: cmd.updatedAt,
        updatedBy: cmd.updatedBy,
      },
    });
  }

  private async syncOrderItem(cmd: CommandModel, sk: string): Promise<void> {
    const attrs = cmd.attributes as OrderItemAttributes;

    await this.prismaService.orderItem.upsert({
      where: { id: cmd.id },
      update: {
        pk: cmd.pk,
        sk: sk,
        orderId: attrs.orderId,
        productId: attrs.productId,
        quantity: attrs.quantity,
        unitPrice: attrs.unitPrice,
        isDeleted: cmd.isDeleted ?? false,
        updatedAt: cmd.updatedAt,
      },
      create: {
        id: cmd.id,
        pk: cmd.pk,
        sk: sk,
        cpk: cmd.pk,
        csk: cmd.sk,
        tenantCode: cmd.tenantCode,
        orderId: attrs.orderId,
        productId: attrs.productId,
        quantity: attrs.quantity,
        unitPrice: attrs.unitPrice,
        isDeleted: cmd.isDeleted ?? false,
        createdAt: cmd.createdAt,
        updatedAt: cmd.updatedAt,
      },
    });
  }

  async down(cmd: CommandModel): Promise<any> {
    this.logger.debug(cmd);
  }
}
```

## Example 3: Complex Attribute Transformation

### Use Case: Notifications with Different Content Types

Scenario: Notification entity has different content structures based on type (Alert, Info, Promotion).

Solution: Extract and flatten type-specific fields into common RDS columns.

```ts
import {
  CommandModel,
  IDataSyncHandler,
  removeSortKeyVersion
} from "@mbc-cqrs-serverless/core";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma";

enum NotificationType {
  ALERT = "ALERT",
  INFO = "INFO",
  PROMOTION = "PROMOTION",
}

interface AlertContent {
  title: string;
  message: string;
  severity: string;
}

interface InfoContent {
  headline: string;
  body: string;
}

interface PromotionContent {
  campaignName: string;
  discount: number;
  validUntil: string;
}

interface NotificationAttributes {
  type: NotificationType;
  alertContent?: AlertContent;
  infoContent?: InfoContent;
  promotionContent?: PromotionContent;
  targetUsers: string[];
  tags: string[];
  schedule: {
    startDate: string;
    endDate: string;
  };
}

@Injectable()
export class NotificationDataSyncRdsHandler implements IDataSyncHandler {
  private readonly logger = new Logger(NotificationDataSyncRdsHandler.name);

  constructor(private readonly prismaService: PrismaService) {}

  async up(cmd: CommandModel): Promise<any> {
    const sk = removeSortKeyVersion(cmd.sk);
    const attrs = cmd.attributes as NotificationAttributes;

    // Extract title based on notification type
    const title = this.getTitle(attrs);
    const body = this.getBody(attrs);

    await this.prismaService.notification.upsert({
      where: { id: cmd.id },
      update: {
        pk: cmd.pk,
        sk: sk,
        code: cmd.code,
        version: cmd.version,
        type: attrs.type,
        title: title,
        body: body,
        // Convert arrays to comma-separated strings for RDS
        targetUsers: attrs.targetUsers?.join(",") ?? null,
        tags: attrs.tags?.join(",") ?? null,
        // Handle dates
        startDate: attrs.schedule?.startDate
          ? new Date(attrs.schedule.startDate)
          : null,
        endDate: attrs.schedule?.endDate
          ? new Date(attrs.schedule.endDate)
          : null,
        isDeleted: cmd.isDeleted ?? false,
        updatedAt: cmd.updatedAt,
        updatedBy: cmd.updatedBy,
      },
      create: {
        id: cmd.id,
        pk: cmd.pk,
        sk: sk,
        cpk: cmd.pk,
        csk: cmd.sk,
        code: cmd.code,
        version: cmd.version,
        tenantCode: cmd.tenantCode,
        type: attrs.type,
        title: title,
        body: body,
        targetUsers: attrs.targetUsers?.join(",") ?? null,
        tags: attrs.tags?.join(",") ?? null,
        startDate: attrs.schedule?.startDate
          ? new Date(attrs.schedule.startDate)
          : null,
        endDate: attrs.schedule?.endDate
          ? new Date(attrs.schedule.endDate)
          : null,
        isDeleted: cmd.isDeleted ?? false,
        createdAt: cmd.createdAt,
        createdBy: cmd.createdBy,
        updatedAt: cmd.updatedAt,
        updatedBy: cmd.updatedBy,
      },
    });
  }

  /**
   * Extract title based on notification type
   */
  private getTitle(attrs: NotificationAttributes): string | null {
    switch (attrs.type) {
      case NotificationType.ALERT:
        return attrs.alertContent?.title ?? null;
      case NotificationType.INFO:
        return attrs.infoContent?.headline ?? null;
      case NotificationType.PROMOTION:
        return attrs.promotionContent?.campaignName ?? null;
      default:
        return null;
    }
  }

  /**
   * Extract body/message based on notification type
   */
  private getBody(attrs: NotificationAttributes): string | null {
    switch (attrs.type) {
      case NotificationType.ALERT:
        return attrs.alertContent?.message ?? null;
      case NotificationType.INFO:
        return attrs.infoContent?.body ?? null;
      case NotificationType.PROMOTION:
        return `${attrs.promotionContent?.discount}% off until ${attrs.promotionContent?.validUntil}`;
      default:
        return null;
    }
  }

  async down(cmd: CommandModel): Promise<any> {
    this.logger.debug(cmd);
  }
}
```

## Example 4: PK Prefix Filtering

### Use Case: User Records in Shared Table

Scenario: Multiple entity types share a DynamoDB table. Handler should only process USER records.

Solution: Check PK prefix and skip non-matching records early.

```ts
import {
  CommandModel,
  IDataSyncHandler,
  KEY_SEPARATOR,
  removeSortKeyVersion
} from "@mbc-cqrs-serverless/core";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma";

const USER_PK_PREFIX = "USER";

interface UserAttributes {
  email: string;
  userId: string;
  displayName: string;
  role: string;
  lastLoginAt?: string;
}

@Injectable()
export class UserDataSyncRdsHandler implements IDataSyncHandler {
  private readonly logger = new Logger(UserDataSyncRdsHandler.name);

  constructor(private readonly prismaService: PrismaService) {}

  async up(cmd: CommandModel): Promise<any> {
    // Only process USER records
    if (!cmd.pk.startsWith(USER_PK_PREFIX + KEY_SEPARATOR)) {
      return;
    }

    // Skip temporary or profile records
    if (cmd.sk.startsWith("temp") || cmd.sk.startsWith("profile")) {
      return;
    }

    const sk = removeSortKeyVersion(cmd.sk);
    const attrs = cmd.attributes as UserAttributes;

    await this.prismaService.user.upsert({
      where: { id: cmd.id },
      update: {
        pk: cmd.pk,
        sk: sk,
        code: cmd.code,
        version: cmd.version,
        email: attrs.email,
        userId: attrs.userId,
        displayName: attrs.displayName,
        role: attrs.role,
        lastLoginAt: attrs.lastLoginAt
          ? new Date(attrs.lastLoginAt)
          : null,
        isDeleted: cmd.isDeleted ?? false,
        updatedAt: cmd.updatedAt,
        updatedBy: cmd.updatedBy,
      },
      create: {
        id: cmd.id,
        pk: cmd.pk,
        sk: sk,
        cpk: cmd.pk,
        csk: cmd.sk,
        code: cmd.code,
        version: cmd.version,
        tenantCode: cmd.tenantCode,
        type: cmd.type,
        email: attrs.email,
        userId: attrs.userId,
        displayName: attrs.displayName,
        role: attrs.role,
        lastLoginAt: attrs.lastLoginAt
          ? new Date(attrs.lastLoginAt)
          : null,
        isDeleted: cmd.isDeleted ?? false,
        createdAt: cmd.createdAt,
        createdBy: cmd.createdBy,
        updatedAt: cmd.updatedAt,
        updatedBy: cmd.updatedBy,
      },
    });
  }

  async down(cmd: CommandModel): Promise<any> {
    this.logger.debug(cmd);
  }
}
```

## Example 5: Parsing SK for Derived Data

### Use Case: Master Data with Category Information in SK

Scenario: SK contains structured data like "SETTING#category#code" that should be stored as separate columns.

Solution: Parse SK to extract type, category, and code for querying.

```ts
import {
  CommandModel,
  IDataSyncHandler,
  KEY_SEPARATOR,
  removeSortKeyVersion
} from "@mbc-cqrs-serverless/core";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma";

const SETTING_SK_PREFIX = "SETTING";
const DATA_SK_PREFIX = "DATA";

interface MasterAttributes {
  value: any;
  displayOrder: number;
  isActive: boolean;
}

@Injectable()
export class MasterDataSyncRdsHandler implements IDataSyncHandler {
  private readonly logger = new Logger(MasterDataSyncRdsHandler.name);

  constructor(private readonly prismaService: PrismaService) {}

  async up(cmd: CommandModel): Promise<any> {
    const sk = removeSortKeyVersion(cmd.sk);
    const attrs = cmd.attributes as MasterAttributes;

    // Parse SK to extract type and code
    // SK format: "SETTING#category#code" or "DATA#category#code"
    const skParts = sk.split(KEY_SEPARATOR);

    let masterType: string;
    let masterCategory: string;
    let masterCode: string;

    if (sk.startsWith(SETTING_SK_PREFIX)) {
      masterType = "SETTING";
      masterCategory = skParts[1] ?? "";
      masterCode = skParts[2] ?? "";
    } else if (sk.startsWith(DATA_SK_PREFIX)) {
      masterType = "DATA";
      masterCategory = skParts[1] ?? "";
      masterCode = skParts[2] ?? "";
    } else {
      // Skip unknown types
      return;
    }

    await this.prismaService.master.upsert({
      where: { id: cmd.id },
      update: {
        pk: cmd.pk,
        sk: sk,
        code: cmd.code,
        version: cmd.version,
        masterType: masterType,
        masterCategory: masterCategory,
        masterCode: masterCode,
        name: cmd.name,
        value: JSON.stringify(attrs.value),
        displayOrder: attrs.displayOrder,
        isActive: attrs.isActive,
        isDeleted: cmd.isDeleted ?? false,
        updatedAt: cmd.updatedAt,
        updatedBy: cmd.updatedBy,
      },
      create: {
        id: cmd.id,
        pk: cmd.pk,
        sk: sk,
        cpk: cmd.pk,
        csk: cmd.sk,
        code: cmd.code,
        version: cmd.version,
        tenantCode: cmd.tenantCode,
        masterType: masterType,
        masterCategory: masterCategory,
        masterCode: masterCode,
        name: cmd.name,
        value: JSON.stringify(attrs.value),
        displayOrder: attrs.displayOrder,
        isActive: attrs.isActive,
        isDeleted: cmd.isDeleted ?? false,
        createdAt: cmd.createdAt,
        createdBy: cmd.createdBy,
        updatedAt: cmd.updatedAt,
        updatedBy: cmd.updatedBy,
      },
    });
  }

  async down(cmd: CommandModel): Promise<any> {
    this.logger.debug(cmd);
  }
}
```

## Registering Multiple Handlers

You can register multiple handlers for the same table to handle different record types:

```ts
import { CommandModule } from "@mbc-cqrs-serverless/core";
import { Module } from "@nestjs/common";

import { OrderDataSyncRdsHandler } from "./handler/order-rds.handler";
import { OrderItemDataSyncRdsHandler } from "./handler/order-item-rds.handler";
import { OrderHistoryDataSyncRdsHandler } from "./handler/order-history-rds.handler";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";

@Module({
  imports: [
    CommandModule.register({
      tableName: "order",
      dataSyncHandlers: [
        OrderDataSyncRdsHandler,
        OrderItemDataSyncRdsHandler,
        OrderHistoryDataSyncRdsHandler,
      ],
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
```

## Best Practices

### 1. Always Remove Version from SK

Use `removeSortKeyVersion()` to get a consistent SK for RDS storage:

```ts
const sk = removeSortKeyVersion(cmd.sk); // "ORDER001@3" -> "ORDER001"
```

### 2. Handle undefined isDeleted

Always provide a default value for `isDeleted`:

```ts
isDeleted: cmd.isDeleted ?? false,
```

### 3. Store Both Original and Cleaned Keys

Store original keys (cpk, csk) in create operations for reference:

```ts
create: {
  pk: cmd.pk,     // Cleaned PK
  sk: sk,         // Cleaned SK (without version)
  cpk: cmd.pk,    // Original PK (same as pk for most cases)
  csk: cmd.sk,    // Original SK (with version)
  // ...
}
```

### 4. Type Your Attributes

Define interfaces for attributes to ensure type safety:

```ts
interface ProductAttributes {
  name: string;
  price: number;
  // ...
}

const attrs = cmd.attributes as ProductAttributes;
```

### 5. Handle Null/Undefined Gracefully

Use nullish coalescing and optional chaining:

```ts
tags: attrs.tags?.join(",") ?? null,
startDate: attrs.schedule?.startDate
  ? new Date(attrs.schedule.startDate)
  : null,
```
