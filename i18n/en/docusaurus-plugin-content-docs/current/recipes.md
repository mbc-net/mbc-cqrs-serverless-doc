---
description: Practical examples and implementation guides for common use cases in MBC CQRS Serverless framework.
---

# Examples

This section provides practical examples and implementation guides for common use cases. Each example demonstrates real-world scenarios with complete, production-ready code.

## Available Examples

| Example | Description | Key Concepts |
|-------------|-----------------|------------------|
| [E-commerce](./ecommerce-example) | Order management with inventory tracking | Optimistic locking, event-driven sync, status transitions |
| [SaaS Application](./saas-example) | Multi-tenant subscription and usage metering | Tenant isolation, quota enforcement, billing integration |
| [Survey Template](./survey-template) | Dynamic form builder with validation | Schema design, versioning, complex attributes |

## Implementation Patterns

Each example follows consistent patterns:

### 1. Entity Design

```typescript
// Define your entity with proper key structure
export class OrderEntity extends BaseEntity {
  pk: string;           // TENANT#tenantCode
  sk: string;           // ORDER#orderId
  id: string;
  tenantCode: string;
  code: string;
  name: string;
  attributes: OrderAttributes;
}
```

### 2. Command Pattern

```typescript
// Create commands for state changes
async createOrder(dto: CreateOrderDto, context: IInvoke) {
  const orderId = await this.sequencesService.generateSequenceItem({
    tenantCode: dto.tenantCode,
    typeCode: 'ORDER',
  });

  return this.commandService.publishAsync(
    {
      pk: `${dto.tenantCode}#ORDER`,
      sk: `ORDER#${orderId.formattedNo}`,
      code: orderId.formattedNo,
      name: dto.name,
      tenantCode: dto.tenantCode,
      attributes: dto.attributes,
    },
    { invokeContext: context },
  );
}
```

### 3. Query Pattern

```typescript
// Query data with proper filtering
async listOrders(tenantCode: string, options: ListOptions) {
  return this.dataService.listItemsByPk(
    `${tenantCode}#ORDER`,
    {
      limit: options.limit,
      startFromSk: options.lastSk,
    },
  );
}
```

### 4. Event Handler

```typescript
// Handle data sync events
@EventHandler(OrderDataSyncEvent)
export class OrderDataSyncHandler implements IEventHandler<OrderDataSyncEvent> {
  async execute(event: OrderDataSyncEvent): Promise<void> {
    // Sync to read model (RDS, OpenSearch, etc.)
    await this.syncToReadModel(event.data);
  }
}
```

## Best Practices

### Key Design

- Use consistent prefix patterns: `TENANT#code`, `ORDER#id`
- Keep partition keys broad enough for even distribution
- Use sort keys for hierarchical data

### Error Handling

```typescript
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { ConflictException } from '@nestjs/common';

try {
  await this.commandService.publishAsync(command, options);
} catch (error) {
  if (error instanceof ConditionalCheckFailedException) {
    // Handle optimistic locking conflict (version mismatch)
    throw new ConflictException('Item was modified by another process');
  }
  throw error;
}
```

### Testing

```typescript
describe('OrderService', () => {
  it('should create order with sequence', async () => {
    const result = await service.createOrder(mockDto, mockContext);
    expect(result.code).toMatch(/^ORD-\d{6}$/);
  });
});
```

## Explore Examples

```mdx-code-block
import DocCardList from '@theme/DocCardList';

<DocCardList />
```
