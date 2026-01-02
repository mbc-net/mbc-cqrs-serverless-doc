---
sidebar_position: 1
description: {{Complete reference of TypeScript interfaces used in MBC CQRS Serverless framework.}}
---

# {{Interfaces}}

{{This document provides a comprehensive reference of all TypeScript interfaces used in the MBC CQRS Serverless framework.}}

## {{Core Interfaces}}

### {{Command Interfaces}}

#### CommandInputModel

{{The primary interface for creating new commands. Used when publishing new entities.}}

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

**{{Usage Example}}**:
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

{{Used for partial updates. Only pk, sk, and version are required.}}

```ts
export interface CommandPartialInputModel extends Partial<CommandInputModel> {
  pk: string       // Required: Partition key
  sk: string       // Required: Sort key
  version: number  // Required: Current version for optimistic locking
}
```

**{{Usage Example}}**:
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

{{Options passed to command publishing methods.}}

```ts
export interface ICommandOptions {
  source?: string        // Source identifier for tracking
  requestId?: string     // Request ID for tracing
  invokeContext: IInvoke // Required: Invocation context
}
```

**{{Usage Example}}**:
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

### {{Key Interfaces}}

#### DetailKey

{{Represents the primary key for DynamoDB items.}}

```ts
export interface DetailKey {
  pk: string  // Partition key
  sk: string  // Sort key
}
```

#### SearchKey

{{Extended key interface for search operations with optional tenant filtering.}}

```ts
export interface SearchKey extends DetailKey {
  tenantCode?: string  // Optional tenant filter
}
```

### {{Context Interfaces}}

#### IInvoke

{{Invocation context containing user and tenant information.}}

```ts
export interface IInvoke {
  userContext: IUserContext  // User information from authentication
  tenantCode?: string        // Current tenant context
  action?: string            // Action being performed
}
```

#### IUserContext

{{User context extracted from authentication token.}}

```ts
export interface IUserContext {
  userId: string           // Cognito user ID
  username: string         // Username
  email?: string           // User email
  groups?: string[]        // Cognito groups
  tenantCodes?: string[]   // Accessible tenants
  attributes?: Record<string, any>  // Custom attributes
}
```

**{{Usage Example}}**:
```typescript
import { getUserContext, IInvoke } from '@mbc-cqrs-serverless/core';

const userContext = getUserContext(event);
const invokeContext: IInvoke = {
  userContext,
  tenantCode: userContext.tenantCodes?.[0],
};
```

## {{Data Interfaces}}

### {{Entity Interfaces}}

#### IDataEntity

{{Base interface for data entities (read model).}}

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

{{Interface for command entities (write model).}}

```ts
export interface ICommandEntity extends IDataEntity {
  cpk: string   // Command partition key
  csk: string   // Command sort key (includes version)
  seq: number   // Sequence number
}
```

### {{List Response Interfaces}}

#### IDataListEntity

{{Paginated list response for data queries.}}

```ts
export interface IDataListEntity<T> {
  items: T[]              // Array of entities
  total?: number          // Total count (if available)
  lastEvaluatedKey?: DetailKey  // Pagination cursor
}
```

**{{Usage Example}}**:
```typescript
const result: IDataListEntity<OrderDataEntity> = await dataService.listItems({
  pk: 'ORDER#tenant001',
  limit: 20,
  lastEvaluatedKey: previousKey,
});

// Pagination
if (result.lastEvaluatedKey) {
  // More items available
}
```

## {{Service Interfaces}}

### {{Query Options}}

#### ListOptions

{{Options for list queries.}}

```ts
export interface ListOptions {
  pk: string                    // Partition key prefix
  sk?: string                   // Sort key prefix (optional)
  limit?: number                // Maximum items to return
  scanIndexForward?: boolean    // Sort order (true = ascending)
  lastEvaluatedKey?: DetailKey  // Pagination cursor
  filter?: FilterExpression     // Additional filters
}
```

#### SearchOptions

{{Options for search operations with full-text search.}}

```ts
export interface SearchOptions extends ListOptions {
  query?: string           // Full-text search query
  fields?: string[]        // Fields to search
  sort?: SortOptions       // Sort configuration
}
```

### {{Sync Handler Interfaces}}

#### IDataSyncHandler

{{Interface for implementing data synchronization handlers.}}

```ts
export interface IDataSyncHandler {
  handle(event: DataSyncEvent): Promise<void>
}

export interface DataSyncEvent {
  action: 'INSERT' | 'MODIFY' | 'REMOVE'
  oldImage?: IDataEntity    // Previous state (for MODIFY/REMOVE)
  newImage?: IDataEntity    // New state (for INSERT/MODIFY)
  keys: DetailKey           // Primary key
}
```

**{{Implementation Example}}**:
```typescript
@Injectable()
export class OrderRdsSyncHandler implements IDataSyncHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: DataSyncEvent): Promise<void> {
    const { action, newImage, oldImage, keys } = event;

    switch (action) {
      case 'INSERT':
      case 'MODIFY':
        await this.prisma.order.upsert({
          where: { id: newImage.id },
          create: this.toRdsModel(newImage),
          update: this.toRdsModel(newImage),
        });
        break;
      case 'REMOVE':
        await this.prisma.order.delete({
          where: { id: oldImage.id },
        });
        break;
    }
  }
}
```

## {{Notification Interfaces}}

### EmailNotification

{{Configuration for sending email notifications.}}

```ts
export interface EmailNotification {
  fromAddr?: string     // Sender address (uses default if not specified)
  toAddrs: string[]     // Required: Recipient addresses
  ccAddrs?: string[]    // CC addresses
  bccAddrs?: string[]   // BCC addresses
  subject: string       // Required: Email subject
  body: string          // Required: HTML body content
  replyTo?: string      // Reply-to address
  attachments?: EmailAttachment[]  // File attachments
}

export interface EmailAttachment {
  filename: string      // Attachment filename
  content: Buffer | string  // File content
  contentType: string   // MIME type
}
```

**{{Usage Example}}**:
```typescript
await emailService.send({
  toAddrs: ['user@example.com'],
  subject: 'Order Confirmation',
  body: `<h1>Order Confirmed</h1><p>Your order ${orderCode} has been confirmed.</p>`,
});
```

## {{Module Configuration Interfaces}}

### CommandModuleOptions

{{Configuration options for CommandModule.}}

```ts
export interface CommandModuleOptions {
  tableName: string                      // DynamoDB table name
  dataSyncHandlers?: Type<IDataSyncHandler>[]  // Sync handlers
  skipPublish?: boolean                  // Skip event publishing
}
```

**{{Usage Example}}**:
```typescript
@Module({
  imports: [
    CommandModule.register({
      tableName: 'order',
      dataSyncHandlers: [OrderRdsSyncHandler],
    }),
  ],
})
export class OrderModule {}
```

### SequenceModuleOptions

{{Configuration options for SequenceModule.}}

```ts
export interface SequenceModuleOptions {
  tableName?: string    // Table name (default: 'sequence')
  rotateBy?: 'day' | 'month' | 'year' | 'none'  // Rotation strategy
}
```

## {{Event Interfaces}}

### StepFunctionEvent

{{Event structure from AWS Step Functions.}}

```ts
export interface StepFunctionEvent {
  taskToken: string           // Step Functions callback token
  input: Record<string, any>  // Input data from state machine
  executionId: string         // State machine execution ID
}
```

### S3Event

{{S3 event structure for file processing.}}

```ts
export interface S3EventRecord {
  s3: {
    bucket: { name: string }
    object: { key: string; size: number }
  }
  eventName: string  // e.g., "ObjectCreated:Put"
}
```

## {{Error Interfaces}}

### AppException

{{Base exception interface for application errors.}}

```ts
export interface AppException {
  statusCode: number      // HTTP status code
  message: string         // Error message
  code?: string           // Error code for client handling
  details?: any           // Additional error details
}
```

## {{Type Utilities}}

### {{Common Type Helpers}}

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

## {{See Also}}

- {{[Command Service](./command-service) - Using commands with these interfaces}}
- {{[Data Service](./data-service) - Querying data with these interfaces}}
- {{[Entity Patterns](./entity-patterns) - Designing entities}}
- {{[Error Catalog](./error-catalog) - Error handling}}
