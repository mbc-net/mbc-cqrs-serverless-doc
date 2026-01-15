---
description: {{Complete E-commerce implementation example with order management, inventory, and multi-tenant support.}}
---

# {{E-commerce Example}}

{{This example demonstrates a complete e-commerce implementation with order management, inventory tracking, and multi-tenant support using MBC CQRS Serverless.}}

## {{Overview}}

{{The e-commerce example covers:}}

- {{Order lifecycle management (create, update, cancel)}}
- {{Inventory tracking with optimistic locking}}
- {{Multi-tenant storefront isolation}}
- {{Event-driven order processing}}

## {{Data Model}}

### {{Key Structure}}

```
{{Partition Key (pk)}}           {{Sort Key (sk)}}
──────────────────────────────────────────────────
TENANT#shop-a                    ORDER#ORD-000001
TENANT#shop-a                    ORDER#ORD-000002
TENANT#shop-a                    PRODUCT#PRD-001
TENANT#shop-a                    INVENTORY#PRD-001
TENANT#shop-b                    ORDER#ORD-000001
```

### {{Entity Definitions}}

```typescript
// {{Order Entity}}
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

// {{Product Entity}}
export interface ProductAttributes {
  categoryCode: string;
  sku: string;
  price: number;
  currency: string;
  description: string;
  images: string[];
  isActive: boolean;
}

// {{Inventory Entity}}
export interface InventoryAttributes {
  productCode: string;
  quantity: number;
  reservedQuantity: number;
  warehouseCode: string;
  lastRestockedAt: string;
}
```

## {{Module Implementation}}

### {{Order Module}}

```typescript
// order.module.ts
import { Module } from '@nestjs/common';
import { CommandModule, SequenceModule } from '@mbc-cqrs-serverless/core';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderDataSyncHandler } from './order-data-sync.handler';

@Module({
  imports: [CommandModule, SequenceModule],
  controllers: [OrderController],
  providers: [OrderService, OrderDataSyncHandler],
  exports: [OrderService],
})
export class OrderModule {}
```

### {{Order Service}}

```typescript
// order.service.ts
import { Injectable } from '@nestjs/common';
import {
  CommandService,
  DataService,
  SequenceService,
  IInvoke,
  getUserContext,
  generatePk,
} from '@mbc-cqrs-serverless/core';

@Injectable()
export class OrderService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
    private readonly sequenceService: SequenceService,
  ) {}

  // {{Create a new order}}
  async createOrder(dto: CreateOrderDto, context: IInvoke) {
    const { tenantCode } = getUserContext(context);

    // {{Generate unique order number}}
    const sequence = await this.sequenceService.next('ORDER', context);
    const orderCode = `ORD-${String(sequence.value).padStart(6, '0')}`;

    // {{Calculate totals}}
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    const command = {
      pk: generatePk(tenantCode),
      sk: `ORDER#${orderCode}`,
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

  // {{Update order status}}
  async updateOrderStatus(
    orderCode: string,
    newStatus: OrderStatus,
    context: IInvoke,
  ) {
    const { tenantCode } = getUserContext(context);
    const pk = generatePk(tenantCode);
    const sk = `ORDER#${orderCode}`;

    // {{Fetch current order}}
    const current = await this.dataService.getItem({ pk, sk });
    if (!current) {
      throw new NotFoundException(`Order ${orderCode} not found`);
    }

    // {{Validate status transition}}
    this.validateStatusTransition(current.attributes.status, newStatus);

    // {{Build update command with version for optimistic locking}}
    const command = {
      ...current,
      version: current.version, // {{Required for optimistic locking}}
      attributes: {
        ...current.attributes,
        status: newStatus,
        ...(newStatus === 'shipped' && { shippedAt: new Date().toISOString() }),
        ...(newStatus === 'delivered' && { deliveredAt: new Date().toISOString() }),
      },
    };

    return this.commandService.publishAsync(command, { invokeContext: context });
  }

  // {{List orders with pagination}}
  async listOrders(options: ListOrdersDto, context: IInvoke) {
    const { tenantCode } = getUserContext(context);

    return this.dataService.listItemsByPk(generatePk(tenantCode), {
      sk: { $beginsWith: 'ORDER#' },
      limit: options.limit || 20,
      exclusiveStartKey: options.cursor,
      filter: options.status ? { 'attributes.status': options.status } : undefined,
    });
  }

  // {{Validate order status transitions}}
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

### {{Order Controller}}

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

## {{Inventory Management}}

### {{Inventory Service}}

```typescript
// inventory.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { CommandService, DataService, IInvoke, getUserContext } from '@mbc-cqrs-serverless/core';

@Injectable()
export class InventoryService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
  ) {}

  // {{Reserve inventory for order}}
  async reserveInventory(
    items: OrderItem[],
    context: IInvoke,
  ): Promise<void> {
    const { tenantCode } = getUserContext(context);
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

      // {{Update with optimistic locking}}
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
        await this.commandService.publishAsync(command, { invokeContext: context });
      } catch (error) {
        if (error.name === 'VersionMismatchError') {
          // {{Retry on concurrent modification}}
          throw new ConflictException(
            'Inventory was modified, please retry'
          );
        }
        throw error;
      }
    }
  }

  // {{Release reserved inventory}}
  async releaseInventory(
    items: OrderItem[],
    context: IInvoke,
  ): Promise<void> {
    const { tenantCode } = getUserContext(context);
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

      await this.commandService.publishAsync(command, { invokeContext: context });
    }
  }

  // {{Deduct inventory after shipment}}
  async deductInventory(
    items: OrderItem[],
    context: IInvoke,
  ): Promise<void> {
    const { tenantCode } = getUserContext(context);
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

      await this.commandService.publishAsync(command, { invokeContext: context });
    }
  }
}
```

## {{Event-Driven Processing}}

### {{Order Data Sync Handler}}

```typescript
// order-data-sync.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { DataSyncHandler, IDataSyncHandler } from '@mbc-cqrs-serverless/core';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationService } from '../notification/notification.service';

@DataSyncHandler({ tableName: 'data-table' })
@Injectable()
export class OrderDataSyncHandler implements IDataSyncHandler {
  private readonly logger = new Logger(OrderDataSyncHandler.name);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly notificationService: NotificationService,
  ) {}

  async handleSync(event: DataSyncEvent): Promise<void> {
    // {{Filter for order events only}}
    if (!event.sk.startsWith('ORDER#')) {
      return;
    }

    const order = event.new;
    const previousOrder = event.old;

    // {{New order created}}
    if (!previousOrder && order) {
      this.logger.log(`New order created: ${order.code}`);
      await this.handleNewOrder(order, event.context);
      return;
    }

    // {{Order status changed}}
    if (
      previousOrder &&
      order &&
      previousOrder.attributes.status !== order.attributes.status
    ) {
      await this.handleStatusChange(
        order,
        previousOrder.attributes.status,
        order.attributes.status,
        event.context,
      );
    }
  }

  private async handleNewOrder(order: any, context: IInvoke) {
    // {{Reserve inventory}}
    try {
      await this.inventoryService.reserveInventory(
        order.attributes.items,
        context,
      );
    } catch (error) {
      this.logger.error(`Failed to reserve inventory: ${error.message}`);
      // {{Send notification to operations team}}
      await this.notificationService.sendAlert({
        type: 'inventory_reservation_failed',
        orderId: order.code,
        error: error.message,
      });
    }

    // {{Send order confirmation email}}
    await this.notificationService.sendOrderConfirmation(order);
  }

  private async handleStatusChange(
    order: any,
    previousStatus: string,
    newStatus: string,
    context: IInvoke,
  ) {
    this.logger.log(
      `Order ${order.code} status: ${previousStatus} -> ${newStatus}`
    );

    switch (newStatus) {
      case 'cancelled':
        // {{Release reserved inventory}}
        await this.inventoryService.releaseInventory(
          order.attributes.items,
          context,
        );
        await this.notificationService.sendCancellationNotice(order);
        break;

      case 'shipped':
        // {{Deduct from inventory}}
        await this.inventoryService.deductInventory(
          order.attributes.items,
          context,
        );
        await this.notificationService.sendShippingNotification(order);
        break;

      case 'delivered':
        await this.notificationService.sendDeliveryConfirmation(order);
        break;
    }
  }
}
```

## {{API Endpoints}}

| {{Method}} | {{Endpoint}} | {{Description}} |
|------------|--------------|-----------------|
| POST | `/orders` | {{Create new order}} |
| GET | `/orders` | {{List orders with pagination}} |
| GET | `/orders/:code` | {{Get order details}} |
| PATCH | `/orders/:code/status` | {{Update order status}} |
| POST | `/products` | {{Create product}} |
| GET | `/products` | {{List products}} |
| PATCH | `/inventory/:productCode` | {{Update inventory}} |

## {{Request/Response Examples}}

### {{Create Order}}

```json
// POST /orders
// {{Request}}
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

// {{Response}}
{
  "pk": "TENANT#shop-a",
  "sk": "ORDER#ORD-000001",
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

## {{Best Practices}}

### {{1. Inventory Consistency}}

{{Always use optimistic locking when modifying inventory to prevent overselling:}}

```typescript
const command = {
  ...inventory,
  version: inventory.version, // {{Include current version}}
  attributes: { ... }
};
```

### {{2. Status Validation}}

{{Define allowed transitions and validate before updating:}}

```typescript
const validTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  // ...
};
```

### {{3. Idempotency}}

{{Use sequence numbers or UUIDs to ensure operations are idempotent:}}

```typescript
const orderCode = `ORD-${String(sequence.value).padStart(6, '0')}`;
```

## {{See Also}}

- [{{Command Service}}](./command-service)
- [{{Sequence Service}}](./sequence)
- [{{Event Handling Patterns}}](./event-handling-patterns)
- [{{Anti-Patterns Guide}}](./anti-patterns)
