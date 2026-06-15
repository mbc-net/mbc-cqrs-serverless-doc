---
description: 注文管理、在庫、マルチテナントサポートを備えた完全なEコマース実装例。
---

# Eコマース例

この例では、MBC CQRS Serverlessを使用した注文管理、在庫追跡、マルチテナントサポートを備えた完全なEコマース実装を示します。

## 概要 {#overview}

Eコマースの例では以下をカバーします：

- 注文ライフサイクル管理（作成、更新、キャンセル）
- 楽観的ロックによる在庫追跡
- マルチテナントストアフロントの分離
- イベント駆動の注文処理

## データモデル {#data-model}

### キー構造

```
パーティションキー (pk)           ソートキー (sk)
──────────────────────────────────────────────────
TENANT#shop-a                    ORDER#ORD-000001
TENANT#shop-a                    ORDER#ORD-000002
TENANT#shop-a                    PRODUCT#PRD-001
TENANT#shop-a                    INVENTORY#PRD-001
TENANT#shop-b                    ORDER#ORD-000001
```

### エンティティ定義

```typescript
// Order Entity (注文エンティティ)
export interface OrderAttributes {
  customerId: string;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: string;
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  placedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

// Product Entity (商品エンティティ)
export interface ProductAttributes {
  categoryCode: string;
  sku: string;
  price: number;
  currency: string;
  description: string;
  images: string[];
  isActive: boolean;
}

// Inventory Entity (在庫エンティティ)
export interface InventoryAttributes {
  productCode: string;
  quantity: number;
  reservedQuantity: number;
  warehouseCode: string;
  lastRestockedAt: string;
}
```

## モジュール実装 {#module-implementation}

### 注文モジュール

```typescript
// order.module.ts
import { Module } from '@nestjs/common';
import { CommandModule } from '@mbc-cqrs-serverless/core';
import { SequencesModule } from '@mbc-cqrs-serverless/sequence';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderDataSyncHandler } from './order-data-sync.handler';

@Module({
  imports: [
    CommandModule.register({
      tableName: 'order',
      dataSyncHandlers: [OrderDataSyncHandler],
    }),
    SequencesModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
```

### 注文サービス

```typescript
// order.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  CommandService,
  DataService,
  IInvoke,
  KEY_SEPARATOR,
  VERSION_FIRST,
  getUserContext,
} from '@mbc-cqrs-serverless/core';
import { SequencesService } from '@mbc-cqrs-serverless/sequence';

// Example helper: per-tenant partition key (テナントごとのパーティションキー)
const generatePk = (tenantCode: string): string =>
  `TENANT${KEY_SEPARATOR}${tenantCode}`;


@Injectable()
export class OrderService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
    private readonly sequencesService: SequencesService,
  ) {}

  // Create a new order (新規注文を作成)
  async createOrder(dto: CreateOrderDto, context: IInvoke) {
    const { tenantCode } = getUserContext(context);

    // Generate unique order number (一意の注文番号を生成)
    const sequence = await this.sequencesService.generateSequenceItem(
      { tenantCode, typeCode: 'ORDER' },
      { invokeContext: context },
    );
    const orderCode = sequence.formattedNo;

    // Calculate totals (合計を計算)
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    const command = {
      pk: generatePk(tenantCode),
      sk: `ORDER#${orderCode}`,
      version: VERSION_FIRST,
      code: orderCode,
      name: `Order ${orderCode}`,
      tenantCode,
      attributes: {
        customerId: dto.customerId,
        items: dto.items,
        shippingAddress: dto.shippingAddress,
        paymentMethod: dto.paymentMethod,
        subtotal,
        tax,
        total,
        status: 'pending' as OrderStatus,
        placedAt: new Date().toISOString(),
      },
    };

    return this.commandService.publishAsync(command, { invokeContext: context });
  }

  // Update order status (注文ステータスを更新)
  async updateOrderStatus(
    orderCode: string,
    newStatus: OrderStatus,
    context: IInvoke,
  ) {
    const { tenantCode } = getUserContext(context);
    const pk = generatePk(tenantCode);
    const sk = `ORDER#${orderCode}`;

    // Fetch current order (現在の注文を取得)
    const current = await this.dataService.getItem({ pk, sk });
    if (!current) {
      throw new NotFoundException(`Order ${orderCode} not found`);
    }

    // Validate status transition (ステータス遷移を検証)
    this.validateStatusTransition(current.attributes.status, newStatus);

    // Build update command with version for optimistic locking (楽観的ロック用のバージョン付き更新コマンドを構築)
    const command = {
      ...current,
      version: current.version, // Required for optimistic locking (楽観的ロックに必要)
      attributes: {
        ...current.attributes,
        status: newStatus,
        ...(newStatus === 'shipped' && { shippedAt: new Date().toISOString() }),
        ...(newStatus === 'delivered' && { deliveredAt: new Date().toISOString() }),
      },
    };

    return this.commandService.publishAsync(command, { invokeContext: context });
  }

  // List orders with pagination (ページネーション付きで注文を一覧表示)
  async listOrders(options: ListOrdersDto, context: IInvoke) {
    const { tenantCode } = getUserContext(context);

    return this.dataService.listItemsByPk(generatePk(tenantCode), {
      sk: {
        skExpression: 'begins_with(sk, :prefix)',
        skAttributeValues: { ':prefix': 'ORDER#' },
      },
      limit: options.limit || 20,
      startFromSk: options.cursor,
    });
  }

  // Validate order status transitions (注文ステータス遷移を検証)
  private validateStatusTransition(current: OrderStatus, next: OrderStatus) {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };

    if (!validTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Cannot transition from ${current} to ${next}`
      );
    }
  }
}
```

### 注文コントローラー

```typescript
// order.controller.ts
import { Controller, Get, Post, Patch, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IInvoke } from '@mbc-cqrs-serverless/core';
import { OrderService } from './order.service';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  async create(@Body() dto: CreateOrderDto, @Req() req: IInvoke) {
    return this.orderService.createOrder(dto, req);
  }

  @Get()
  @ApiOperation({ summary: 'List orders' })
  async list(@Query() options: ListOrdersDto, @Req() req: IInvoke) {
    return this.orderService.listOrders(options, req);
  }

  @Patch(':code/status')
  @ApiOperation({ summary: 'Update order status' })
  async updateStatus(
    @Param('code') code: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: IInvoke,
  ) {
    return this.orderService.updateOrderStatus(code, dto.status, req);
  }
}
```

## 在庫管理 {#inventory-management}

### 在庫サービス

```typescript
// inventory.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { CommandService, DataService, KEY_SEPARATOR } from '@mbc-cqrs-serverless/core';

const generatePk = (tenantCode: string): string =>
  `TENANT${KEY_SEPARATOR}${tenantCode}`;

@Injectable()
export class InventoryService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
  ) {}

  // Reserve inventory for order (注文用に在庫を予約)
  // {{tenantCode is passed directly so this method can be called from both}}
  // {{controllers (use getUserContext) and DataSyncHandlers (use cmd.tenantCode)}}
  async reserveInventory(
    items: OrderItem[],
    tenantCode: string,
  ): Promise<void> {
    const pk = generatePk(tenantCode);

    for (const item of items) {
      const sk = `INVENTORY#${item.productCode}`;
      const inventory = await this.dataService.getItem({ pk, sk });

      if (!inventory) {
        throw new NotFoundException(`Product ${item.productCode} not found`);
      }

      const available =
        inventory.attributes.quantity - inventory.attributes.reservedQuantity;

      if (available < item.quantity) {
        throw new ConflictException(
          `Insufficient inventory for ${item.productCode}: ` +
          `requested ${item.quantity}, available ${available}`
        );
      }

      // Update with optimistic locking (楽観的ロックで更新)
      const command = {
        ...inventory,
        version: inventory.version,
        attributes: {
          ...inventory.attributes,
          reservedQuantity:
            inventory.attributes.reservedQuantity + item.quantity,
        },
      };

      try {
        await this.commandService.publishAsync(command, {});
      } catch (error) {
        if (error instanceof ConditionalCheckFailedException) {
          // Retry on concurrent modification (同時変更時にリトライ)
          throw new ConflictException(
            'Inventory was modified, please retry'
          );
        }
        throw error;
      }
    }
  }

  // Release reserved inventory (予約済み在庫を解放)
  async releaseInventory(
    items: OrderItem[],
    tenantCode: string,
  ): Promise<void> {
    const pk = generatePk(tenantCode);

    for (const item of items) {
      const sk = `INVENTORY#${item.productCode}`;
      const inventory = await this.dataService.getItem({ pk, sk });

      if (!inventory) continue;

      const command = {
        ...inventory,
        version: inventory.version,
        attributes: {
          ...inventory.attributes,
          reservedQuantity: Math.max(
            0,
            inventory.attributes.reservedQuantity - item.quantity
          ),
        },
      };

      await this.commandService.publishAsync(command, {});
    }
  }

  // Deduct inventory after shipment (出荷後に在庫を減少)
  async deductInventory(
    items: OrderItem[],
    tenantCode: string,
  ): Promise<void> {
    const pk = generatePk(tenantCode);

    for (const item of items) {
      const sk = `INVENTORY#${item.productCode}`;
      const inventory = await this.dataService.getItem({ pk, sk });

      if (!inventory) continue;

      const command = {
        ...inventory,
        version: inventory.version,
        attributes: {
          ...inventory.attributes,
          quantity: inventory.attributes.quantity - item.quantity,
          reservedQuantity:
            inventory.attributes.reservedQuantity - item.quantity,
        },
      };

      await this.commandService.publishAsync(command, {});
    }
  }
}
```

## イベント駆動処理 {#event-driven-processing}

### 注文データ同期ハンドラー

```typescript
// order-data-sync.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  CommandModel,
  DataSyncHandler,
  IDataSyncHandler,
  VERSION_FIRST,
} from '@mbc-cqrs-serverless/core';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationService } from '../notification/notification.service';

@DataSyncHandler('order')
@Injectable()
export class OrderDataSyncHandler implements IDataSyncHandler {
  private readonly logger = new Logger(OrderDataSyncHandler.name);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly notificationService: NotificationService,
  ) {}

  async up(cmd: CommandModel): Promise<any> {
    // Filter for order events only (注文イベントのみフィルター)
    if (!cmd.sk.startsWith('ORDER#')) {
      return;
    }

    // First write: stored version is VERSION_FIRST + 1 (初回書き込み: 保存されるバージョンはVERSION_FIRST + 1)
    if (cmd.version === VERSION_FIRST + 1) {
      this.logger.log(`New order created: ${cmd.code}`);
      await this.handleNewOrder(cmd);
      return;
    }

    // Later versions are updates such as status changes (バージョン2以降はステータス変更などの更新)
    await this.handleStatusChange(cmd);
  }

  async down(cmd: CommandModel): Promise<any> {
    // Optional rollback logic when a sync step fails (同期ステップ失敗時のロールバック処理・任意)
  }

  private async handleNewOrder(order: CommandModel) {
    // Reserve inventory (在庫を予約)
    try {
      await this.inventoryService.reserveInventory(order.attributes.items, order.tenantCode);
    } catch (error) {
      this.logger.error(`Failed to reserve inventory: ${error.message}`);
      // Send notification to operations team (運用チームに通知を送信)
      await this.notificationService.sendAlert({
        type: 'inventory_reservation_failed',
        orderId: order.code,
        error: error.message,
      });
    }

    // Send order confirmation email (注文確認メールを送信)
    await this.notificationService.sendOrderConfirmation(order);
  }

  private async handleStatusChange(order: CommandModel) {
    const status = order.attributes.status;
    this.logger.log(`Order ${order.code} status changed to: ${status}`);

    switch (status) {
      case 'cancelled':
        // Release reserved inventory (予約済み在庫を解放)
        await this.inventoryService.releaseInventory(order.attributes.items, order.tenantCode);
        await this.notificationService.sendCancellationNotice(order);
        break;

      case 'shipped':
        // Deduct from inventory (在庫から減少)
        await this.inventoryService.deductInventory(order.attributes.items, order.tenantCode);
        await this.notificationService.sendShippingNotification(order);
        break;

      case 'delivered':
        await this.notificationService.sendDeliveryConfirmation(order);
        break;
    }
  }
}
```

## APIエンドポイント {#api-endpoints}

| メソッド | エンドポイント | 説明 |
|------------|--------------|-----------------|
| POST | `/orders` | 新規注文を作成 |
| GET | `/orders` | List orders with pagination (ページネーション付きで注文を一覧表示) |
| GET | `/orders/:code` | 注文詳細を取得 |
| PATCH | `/orders/:code/status` | Update order status (注文ステータスを更新) |
| POST | `/products` | 商品を作成 |
| GET | `/products` | 商品を一覧表示 |
| PATCH | `/inventory/:productCode` | 在庫を更新 |

## リクエスト/レスポンス例 {#request-response-examples}

### 注文作成

```json
// POST /orders（注文作成）
// Request (リクエスト)
{
  "customerId": "CUST-001",
  "items": [
    {
      "productCode": "PRD-001",
      "name": "Wireless Mouse",
      "quantity": 2,
      "price": 29.99
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Tokyo",
    "postalCode": "100-0001",
    "country": "JP"
  },
  "paymentMethod": "credit_card"
}

// Response (レスポンス)
{
  "pk": "TENANT#shop-a",
  "sk": "ORDER#ORD-000001@1",
  "code": "ORD-000001",
  "name": "Order ORD-000001",
  "version": 1,
  "attributes": {
    "customerId": "CUST-001",
    "items": [...],
    "subtotal": 59.98,
    "tax": 6.00,
    "total": 65.98,
    "status": "pending",
    "placedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## ベストプラクティス {#best-practices}

### 1. 在庫の一貫性

オーバーセリングを防ぐため、在庫を変更する際は常に楽観的ロックを使用してください：

```typescript
const command = {
  ...inventory,
  version: inventory.version, // Include current version (現在のバージョンを含める)
  attributes: { ... }
};
```

### 2. ステータス検証

許可された遷移を定義し、更新前に検証してください：

```typescript
const validTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  // ...
};
```

### 3. 冪等性

操作が冪等になるようにシーケンス番号またはUUIDを使用してください：

```typescript
const orderCode = `ORD-${String(sequence.value).padStart(6, '0')}`;
```

## 関連ドキュメント

- [SaaS例](/docs/saas-example) - SaaSアプリケーション例
- [サービスパターン](/docs/service-patterns) - 使用されるCRUDパターン
- [マルチテナントパターン](/docs/multi-tenant-patterns) - マルチテナント設計
