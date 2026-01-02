---
description: 様々なユースケースにおけるData Sync Handlerの実装例。
---

# Data Sync Handlerの実装例

このガイドでは、DynamoDB（コマンドソース）からRDS（クエリデータベース）にデータを自動的に同期するData Sync Handlerの実装方法を説明します。これはCQRS読み取りモデルを可能にする中核的なメカニズムです。

## このガイドを使用するタイミング

以下の場合にこのガイドを使用してください：

- 複雑なクエリのためにエンティティデータをDynamoDBからMySQL/PostgreSQLに同期する
- ネストされたJSON属性をリレーショナルカラムに変換する
- 同じDynamoDBテーブル内の異なるレコードタイプを処理する
- 親子関係（Order、OrderItem）を個別に処理する

## このパターンが解決する問題

| 問題 | 解決策 |
|---------|----------|
| DynamoDBはJOINや複雑なフィルターができない | SQLクエリのためにデータをRDSに同期 |
| SKのバージョンサフィックスが重複レコードを引き起こす | upsert前にremoveSortKeyVersion()を使用 |
| 異なるレコードタイプは異なるRDSテーブルが必要 | ハンドラーでSKプレフィックスによりフィルター |
| JSON属性を検索可能なカラムにする必要がある | 属性を個別のRDSカラムにマッピング |

## 基本構造

すべてのData Sync Handlerは以下の基本構造に従います：

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

## 例1: シンプルなエンティティ同期

### ユースケース: 検索とフィルタリングを可能にする製品同期

シナリオ: DynamoDBに保存された製品をカテゴリ、価格帯、テキストで検索可能にする必要がある。

解決策: RDSに同期し、効率的なクエリのために属性をインデックス付きカラムにマッピングする。

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

## 例2: SKプレフィックスによる条件処理

### ユースケース: 同じDynamoDBテーブル内のOrderとOrderItem

シナリオ: OrderとそのアイテムはPKを共有するがSKプレフィックスが異なる。それぞれ異なるRDSテーブルに保存する必要がある。

解決策: SKプレフィックスをチェックして適切な同期ロジックにルーティングする。

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

## 例3: 複雑な属性変換

### ユースケース: 異なるコンテンツタイプを持つ通知

シナリオ: 通知エンティティはタイプ（Alert、Info、Promotion）に基づいて異なるコンテンツ構造を持つ。

解決策: タイプ固有のフィールドを抽出し、共通のRDSカラムにフラット化する。

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

## 例4: PKプレフィックスフィルタリング

### ユースケース: 共有テーブル内のユーザーレコード

シナリオ: 複数のエンティティタイプがDynamoDBテーブルを共有。ハンドラーはUSERレコードのみを処理する必要がある。

解決策: PKプレフィックスをチェックし、一致しないレコードを早期にスキップする。

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

## 例5: SKからのデータ抽出

### ユースケース: SKにカテゴリ情報を持つマスターデータ

シナリオ: SKには"SETTING#category#code"のような構造化データが含まれ、個別のカラムとして保存する必要がある。

解決策: SKを解析してタイプ、カテゴリ、コードを抽出してクエリに使用する。

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

## 複数ハンドラーの登録

異なるレコードタイプを処理するために、同じテーブルに複数のハンドラーを登録できます：

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

## ベストプラクティス

### 1. SKからバージョンを必ず削除する

`removeSortKeyVersion()`を使用してRDSストレージ用の一貫したSKを取得します：

```ts
const sk = removeSortKeyVersion(cmd.sk); // "ORDER001@3" -> "ORDER001"
```

### 2. undefined isDeletedを処理する

`isDeleted`には常にデフォルト値を提供します：

```ts
isDeleted: cmd.isDeleted ?? false,
```

### 3. オリジナルとクリーンなキーの両方を保存する

create操作で参照用にオリジナルキー（cpk, csk）を保存します：

```ts
create: {
  pk: cmd.pk,     // Cleaned PK
  sk: sk,         // Cleaned SK (without version)
  cpk: cmd.pk,    // Original PK (same as pk for most cases)
  csk: cmd.sk,    // Original SK (with version)
  // ...
}
```

### 4. 属性に型を定義する

型安全性を確保するために属性にインターフェースを定義します：

```ts
interface ProductAttributes {
  name: string;
  price: number;
  // ...
}

const attrs = cmd.attributes as ProductAttributes;
```

### 5. Null/Undefinedを適切に処理する

nullish coalescing演算子とオプショナルチェーンを使用します：

```ts
tags: attrs.tags?.join(",") ?? null,
startDate: attrs.schedule?.startDate
  ? new Date(attrs.schedule.startDate)
  : null,
```
