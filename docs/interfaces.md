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

### {{Context Interfaces}}

#### IInvoke

{{Invocation context containing Lambda/Express event and context.}}

```ts
export interface IInvoke {
  event?: IInvokeEvent      // {{Request event (headers, requestContext, etc.)}}
  context?: IInvokeContext  // {{Lambda context (requestId, functionName, etc.)}}
}
```

#### IInvokeEvent

{{HTTP request event structure from API Gateway or Express.}}

```ts
export interface IInvokeEvent {
  version?: string
  routeKey?: string                    // {{e.g., "POST /api/resource"}}
  rawPath?: string
  rawQueryString?: string
  headers?: Record<string, string>
  requestContext?: {
    accountId?: string
    apiId?: string
    domainName?: string
    domainPrefix?: string
    http?: {
      method?: string
      path?: string
      protocol?: string
      sourceIp?: string                // {{Client IP address}}
      userAgent?: string
    }
    requestId?: string
    stage?: string
    time?: string
    timeEpoch?: number
    authorizer?: {
      jwt?: {
        claims?: JwtClaims             // {{Decoded JWT claims}}
        scopes?: string[]
      }
    }
  }
  isBase64Encoded?: boolean
}
```

#### IInvokeContext

{{Lambda execution context information.}}

```ts
export interface IInvokeContext {
  functionName?: string               // {{Lambda function name}}
  functionVersion?: string            // {{Lambda function version}}
  invokedFunctionArn?: string         // {{Lambda ARN}}
  memoryLimitInMB?: string           // {{Memory limit}}
  awsRequestId?: string              // {{AWS request ID for tracing}}
  logGroupName?: string              // {{CloudWatch log group}}
  logStreamName?: string             // {{CloudWatch log stream}}
  identity?: {
    cognitoIdentityId?: string
    cognitoIdentityPoolId?: string
  }
}
```

#### JwtClaims

{{JWT token claims structure from Cognito.}}

```ts
export interface JwtClaims {
  sub: string                        // {{Cognito user ID (UUID)}}
  iss: string                        // {{Token issuer URL}}
  username?: string
  'cognito:groups'?: string[]        // {{Cognito groups the user belongs to}}
  'cognito:username': string         // {{Cognito username}}
  aud: string                        // {{Audience (client ID)}}
  event_id: string
  token_use: string                  // {{Token type (id or access)}}
  auth_time: number                  // {{Authentication timestamp}}
  name: string                       // {{User's display name}}
  'custom:tenant'?: string           // {{Custom claim for tenant code}}
  'custom:roles'?: string            // {{Custom claim for roles JSON array}}
  exp: number                        // {{Token expiration timestamp}}
  email: string
  email_verified?: boolean
  iat: number                        // {{Token issued at timestamp}}
  jti: string                        // {{JWT ID}}
}
```

**{{Custom Claims Example}}**:
```typescript
// {{The custom:roles claim contains a JSON array of role assignments}}
// [{"tenant":"","role":"user"},{"tenant":"9999","role":"admin"}]
// - {{Empty tenant ("") means the role applies globally}}
// - {{Specific tenant means the role applies only to that tenant}}
```

#### UserContext

{{User context class extracted from authentication token.}}

```ts
export class UserContext {
  userId: string      // Cognito user ID (from JWT sub claim)
  tenantRole: string  // User's role within the tenant
  tenantCode: string  // Current tenant code

  constructor(partial: Partial<UserContext>)  // {{Initialize with partial properties}}
}
```

**{{Usage Example}}**:
```typescript
import { getUserContext, IInvoke } from '@mbc-cqrs-serverless/core';

// Extract user context from IInvoke or ExecutionContext
const userContext = getUserContext(invokeContext);
console.log(userContext.userId);      // '92ca4f68-9ac6-4080-9ae2-2f02a86206a4'
console.log(userContext.tenantCode);  // 'tenant001'
console.log(userContext.tenantRole);  // 'admin'
```

## {{Data Interfaces}}

### {{Entity Interfaces}}

#### CommandModel

{{Interface for command entities (write model).}}

```ts
export interface CommandModel extends CommandInputModel {
  status?: string       // {{Processing status (e.g., 'PENDING', 'COMPLETED', 'FAILED')}}
  source?: string       // {{Event source identifier (e.g., 'POST /api/master', 'SQS')}}
  requestId?: string    // {{Unique request ID for tracing and idempotency}}
  createdAt?: Date      // {{Timestamp when the command was created}}
  updatedAt?: Date      // {{Timestamp when the command was last updated}}
  createdBy?: string    // {{User ID who created the command}}
  updatedBy?: string    // {{User ID who last updated the command}}
  createdIp?: string    // {{IP address of the creator}}
  updatedIp?: string    // {{IP address of the last updater}}
  taskToken?: string    // {{Step Functions task token for async workflows}}
}
```

:::tip {{Step Functions Integration}}
{{The `taskToken` field is used when integrating with AWS Step Functions callback patterns. When a Step Functions state machine invokes your application with a task token, store it using [`CommandService.updateTaskToken()`](./command-service.md#updatetasktoken). Later, use the token with AWS SDK's `SendTaskSuccessCommand` or `SendTaskFailureCommand` to signal task completion.}}
:::

#### DataModel

{{Base interface for data entities (read model).}}

```ts
export interface DataModel extends Omit<CommandModel, 'status'> {
  cpk?: string  // {{Command partition key - references source command record}}
  csk?: string  // {{Command sort key with version - references exact command version}}
}
```

### {{Entity Classes}}

#### CommandEntity

{{Class implementing CommandModel for API responses. Includes Swagger decorators.}}

```ts
export class CommandEntity implements CommandModel {
  // {{All properties from CommandModel}}
  pk: string
  sk: string
  // ...

  get key(): DetailKey  // {{Returns { pk, sk } for DynamoDB operations}}
}
```

**{{Usage Example}}**:
```typescript
const command: CommandEntity = await commandService.findOne({
  pk: 'ORDER#tenant001',
  sk: 'ORDER#ORD001',
});

// {{Access the DynamoDB key pair}}
const key = command.key;  // { pk: 'ORDER#tenant001', sk: 'ORDER#ORD001' }
```

#### DataEntity

{{Class implementing DataModel for API responses. Includes Swagger decorators.}}

```ts
export class DataEntity implements DataModel {
  // {{All properties from DataModel}}
  pk: string
  sk: string
  // ...

  constructor(data: Partial<DataEntity>)  // {{Initialize with partial properties}}

  get key(): DetailKey  // {{Returns { pk, sk } for DynamoDB operations}}
}
```

**{{Usage Example}}**:
```typescript
const data: DataEntity = await dataService.findOne({
  pk: 'ORDER#tenant001',
  sk: 'ORDER#ORD001',
});

// {{Access the DynamoDB key pair}}
const key = data.key;  // { pk: 'ORDER#tenant001', sk: 'ORDER#ORD001' }
```

### {{List Response Interfaces}}

#### DataListEntity

{{Paginated list response for data queries.}}

```ts
export class DataListEntity {
  items: DataEntity[]   // Array of entities
  total?: number        // Total count (if available)
  lastSk?: string       // Pagination cursor (last sort key)

  constructor(data: Partial<DataListEntity>)  // {{Initialize with partial properties}}
}
```

**{{Usage Example}}**:
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

## {{Service Interfaces}}

### {{Sync Handler Interfaces}}

#### IDataSyncHandler

{{Interface for implementing data synchronization handlers. Handles both forward (up) and rollback (down) operations.}}

```ts
export interface IDataSyncHandler<TExecuteResult = any, TRollbackResult = any> {
  readonly type?: string  // Optional type identifier

  /**
   * Sync data when a command is executed.
   * Called automatically by the framework during command processing.
   */
  up(cmd: CommandModel): Promise<TExecuteResult>

  /**
   * Reserved for rollback operations.
   * Note: This method is NOT automatically called by the framework.
   * Implement this for manual rollback scenarios in your application.
   */
  down(cmd: CommandModel): Promise<TRollbackResult>
}
```

**{{Implementation Example}}**:
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

## {{Notification Interfaces}}

### EmailNotification

{{Configuration for sending email notifications.}}

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

**{{Usage Example}}**:
```typescript
await emailService.sendEmail({
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
  tableName: string                           // DynamoDB table name
  dataSyncHandlers?: Type<IDataSyncHandler>[] // Custom sync handlers
  skipError?: boolean                         // Reserved for future use (not yet implemented)
  disableDefaultHandler?: boolean             // Disable the default DynamoDB data sync handler
}
```

**{{Usage Example}}**:
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

{{Configuration options for SequenceModule.}}

```ts
export interface SequencesModuleOptions {
  enableController?: boolean  // Enable or disable default sequence controller
}
```

## {{Event Interfaces}}

### StepFunctionsEvent

{{Event structure from AWS Step Functions.}}

```ts
export interface StepFunctionsContextExecution {
  Id: string                    // {{Execution ID}}
  Input: { [id: string]: any }  // {{Input data}}
  Name: string                  // {{Execution name}}
  RoleArn: string               // {{IAM role ARN}}
  StartTime: string             // {{Execution start time}}
}

export interface StepFunctionsContextState {
  EnteredTime: string   // {{State entered time}}
  Name: string          // {{State name}}
  RetryCount: number    // {{Retry count}}
}

export interface StepFunctionsContextStateMachine {
  Id: string    // {{State machine ID}}
  Name: string  // {{State machine name}}
}

export interface StepFunctionsContext {
  Execution: StepFunctionsContextExecution
  State: StepFunctionsContextState
  StateMachine: StepFunctionsContextStateMachine
}

export interface StepFunctionsEvent<TInput> {
  input: TInput                    // {{Input data passed to the state}}
  context: StepFunctionsContext    // {{Step Functions context information}}
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
