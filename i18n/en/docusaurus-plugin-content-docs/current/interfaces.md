---
sidebar_position: 1
description: Complete reference of TypeScript interfaces used in MBC CQRS Serverless framework.
---

# Interfaces

This document provides a comprehensive reference of all TypeScript interfaces used in the MBC CQRS Serverless framework.

## Core Interfaces

### Command Interfaces

#### CommandInputModel

The primary interface for creating new commands. Used when publishing new entities.

```ts
export interface CommandInputModel {
  pk: string              // Partition key (e.g., "ORDER#tenant001")
  sk: string              // Sort key with version (e.g., "ORDER#ORD001#v0")
  id: string              // Unique identifier (e.g., UUID)
  code: string            // Business code (e.g., "ORD001")
  name: string            // Display name
  version: number         // Version number for optimistic locking
  tenantCode: string      // Tenant identifier
  type: string            // Entity type (e.g., "ORDER")
  isDeleted?: boolean     // Soft delete flag
  seq?: number            // Sequence number (auto-generated)
  ttl?: number            // Time-to-live timestamp (Unix epoch)
  attributes?: Record<string, any>  // Custom domain attributes
}
```

**Usage Example**:
```typescript
const orderInput: CommandInputModel = {
  pk: 'ORDER#tenant001',
  sk: 'ORDER#ORD001#v0',
  id: crypto.randomUUID(),
  code: 'ORD001',
  name: 'Customer Order',
  version: 1,
  tenantCode: 'tenant001',
  type: 'ORDER',
  attributes: {
    customerId: 'CUST001',
    totalAmount: 1500,
    status: 'pending',
  },
};
```

#### CommandPartialInputModel

Used for partial updates. Only pk, sk, and version are required.

```ts
export interface CommandPartialInputModel extends Partial<CommandInputModel> {
  pk: string       // Required: Partition key
  sk: string       // Required: Sort key
  version: number  // Required: Current version for optimistic locking
}
```

**Usage Example**:
```typescript
const partialUpdate: CommandPartialInputModel = {
  pk: 'ORDER#tenant001',
  sk: 'ORDER#ORD001',
  version: 2,  // Must match current version
  name: 'Updated Order Name',
  attributes: {
    status: 'confirmed',
  },
};
```

#### ICommandOptions

Options passed to command publishing methods.

```ts
export interface ICommandOptions {
  source?: string        // Source identifier for tracking
  requestId?: string     // Request ID for tracing
  invokeContext: IInvoke // Required: Invocation context
}
```

**Usage Example**:
```typescript
const options: ICommandOptions = {
  source: 'order-service',
  requestId: context.awsRequestId,
  invokeContext: {
    userContext: getUserContext(event),
    tenantCode: 'tenant001',
  },
};
```

### Key Interfaces

#### DetailKey

Represents the primary key for DynamoDB items.

```ts
export interface DetailKey {
  pk: string  // Partition key
  sk: string  // Sort key
}
```

### Context Interfaces

#### IInvoke

Invocation context containing Lambda/Express event and context.

```ts
export interface IInvoke {
  event?: IInvokeEvent      // Request event (headers, requestContext, etc.)
  context?: IInvokeContext  // Lambda context (requestId, functionName, etc.)
}
```

#### UserContext

User context class extracted from authentication token.

```ts
export class UserContext {
  userId: string      // Cognito user ID (from JWT sub claim)
  tenantRole: string  // User's role within the tenant
  tenantCode: string  // Current tenant code
}
```

**Usage Example**:
```typescript
import { getUserContext, IInvoke } from '@mbc-cqrs-serverless/core';

// Extract user context from IInvoke or ExecutionContext
const userContext = getUserContext(invokeContext);
console.log(userContext.userId);      // '92ca4f68-9ac6-4080-9ae2-2f02a86206a4'
console.log(userContext.tenantCode);  // 'tenant001'
console.log(userContext.tenantRole);  // 'admin'
```

## Data Interfaces

### Entity Interfaces

#### IDataEntity

Base interface for data entities (read model).

```ts
export interface IDataEntity {
  pk: string
  sk: string
  id: string
  code: string
  name: string
  version: number
  tenantCode: string
  type: string
  isDeleted: boolean
  createdAt: string   // ISO 8601 timestamp
  createdBy: string   // User ID
  createdIp?: string  // Client IP
  updatedAt: string   // ISO 8601 timestamp
  updatedBy: string   // User ID
  updatedIp?: string  // Client IP
  attributes?: Record<string, any>
}
```

#### ICommandEntity

Interface for command entities (write model).

```ts
export interface ICommandEntity extends IDataEntity {
  cpk: string   // Command partition key
  csk: string   // Command sort key (includes version)
  seq: number   // Sequence number
}
```

### List Response Interfaces

#### DataListEntity

Paginated list response for data queries.

```ts
export class DataListEntity {
  items: DataEntity[]   // Array of entities
  total?: number        // Total count (if available)
  lastSk?: string       // Pagination cursor (last sort key)
}
```

**Usage Example**:
```typescript
const result = await dataService.listItemsByPk('ORDER#tenant001', {
  limit: 20,
  startFromSk: previousLastSk,
});

// Pagination
if (result.lastSk) {
  // More items available - use result.lastSk for next page
}
```

## Service Interfaces

### Sync Handler Interfaces

#### IDataSyncHandler

Interface for implementing data synchronization handlers. Handles both forward (up) and rollback (down) operations.

```ts
export interface IDataSyncHandler<TExecuteResult = any, TRollbackResult = any> {
  readonly type?: string  // Optional type identifier

  /**
   * Upgrade/sync data when a command is executed
   */
  up(cmd: CommandModel): Promise<TExecuteResult>

  /**
   * Rollback/undo data when a command needs to be reverted
   */
  down(cmd: CommandModel): Promise<TRollbackResult>
}
```

**Implementation Example**:
```typescript
@Injectable()
export class OrderRdsSyncHandler implements IDataSyncHandler {
  readonly type = 'ORDER';

  constructor(private readonly prisma: PrismaService) {}

  async up(cmd: CommandModel): Promise<void> {
    if (cmd.isDeleted) {
      await this.prisma.order.delete({
        where: { id: cmd.id },
      });
    } else {
      await this.prisma.order.upsert({
        where: { id: cmd.id },
        create: this.toRdsModel(cmd),
        update: this.toRdsModel(cmd),
      });
    }
  }

  async down(cmd: CommandModel): Promise<void> {
    // Rollback logic - restore previous state
    await this.prisma.order.delete({
      where: { id: cmd.id },
    });
  }

  private toRdsModel(cmd: CommandModel) {
    return {
      id: cmd.id,
      code: cmd.code,
      name: cmd.name,
      ...cmd.attributes,
    };
  }
}
```

## Notification Interfaces

### EmailNotification

Configuration for sending email notifications.

```ts
export interface EmailNotification {
  fromAddr?: string       // Sender address (uses default if not specified)
  toAddrs: string[]       // Required: Recipient addresses
  ccAddrs?: string[]      // CC addresses
  bccAddrs?: string[]     // BCC addresses
  subject: string         // Required: Email subject
  body: string            // Required: HTML body content
  replyToAddrs?: string[] // Reply-to addresses
  attachments?: Attachment[]  // File attachments
}

export interface Attachment {
  filename: string      // Attachment filename
  content: Buffer       // File content as Buffer
  contentType?: string  // MIME type (e.g., 'application/pdf')
}
```

**Usage Example**:
```typescript
await emailService.sendEmail({
  toAddrs: ['user@example.com'],
  subject: 'Order Confirmation',
  body: `<h1>Order Confirmed</h1><p>Your order ${orderCode} has been confirmed.</p>`,
});
```

## Module Configuration Interfaces

### CommandModuleOptions

Configuration options for CommandModule.

```ts
export interface CommandModuleOptions {
  tableName: string                           // DynamoDB table name
  dataSyncHandlers?: Type<IDataSyncHandler>[] // Custom sync handlers
  skipError?: boolean                         // Skip errors from previous command versions
  disableDefaultHandler?: boolean             // Disable the default data sync handler
}
```

**Usage Example**:
```typescript
@Module({
  imports: [
    CommandModule.register({
      tableName: 'order',
      dataSyncHandlers: [OrderRdsSyncHandler],
      disableDefaultHandler: false,
    }),
  ],
})
export class OrderModule {}
```

### SequencesModuleOptions

Configuration options for SequenceModule.

```ts
export interface SequencesModuleOptions {
  enableController?: boolean  // Enable or disable default sequence controller
}
```

## Event Interfaces

### StepFunctionEvent

Event structure from AWS Step Functions.

```ts
export interface StepFunctionEvent {
  taskToken: string           // Step Functions callback token
  input: Record<string, any>  // Input data from state machine
  executionId: string         // State machine execution ID
}
```

### S3Event

S3 event structure for file processing.

```ts
export interface S3EventRecord {
  s3: {
    bucket: { name: string }
    object: { key: string; size: number }
  }
  eventName: string  // e.g., "ObjectCreated:Put"
}
```

## Error Interfaces

### AppException

Base exception interface for application errors.

```ts
export interface AppException {
  statusCode: number      // HTTP status code
  message: string         // Error message
  code?: string           // Error code for client handling
  details?: any           // Additional error details
}
```

## Type Utilities

### Common Type Helpers

```ts
// Partial type that requires specific keys
type RequiredPick<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// Deep partial type
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Entity without audit fields
type EntityInput<T> = Omit<T, 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>;
```

## See Also

- [Command Service](./command-service) - Using commands with these interfaces
- [Data Service](./data-service) - Querying data with these interfaces
- [Entity Patterns](./entity-patterns) - Designing entities
- [Error Catalog](./error-catalog) - Error handling
