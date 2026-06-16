---
description: Common anti-patterns to avoid when developing with MBC CQRS Serverless framework.
---

# Anti-Patterns Guide

This guide documents common mistakes and anti-patterns to avoid when developing with the MBC CQRS Serverless framework. Understanding what NOT to do is as important as knowing the best practices.

## Command Handling Anti-Patterns {#command-handling}

### AP001: Direct Database Writes Bypassing Command Service

:::danger Anti-Pattern
Never write directly to DynamoDB tables bypassing the CommandService.
:::

```typescript
// ❌ Anti-Pattern: Direct DynamoDB write
const dynamodb = new DynamoDBClient({});
await dynamodb.send(new PutItemCommand({
  TableName: 'my-table',
  Item: { pk: { S: 'TENANT#mbc' }, sk: { S: 'ITEM#001' }, ... }
}));
```

```typescript
// ✅ Correct: Use CommandService
await this.commandService.publishAsync({
  pk: 'TENANT#mbc',
  sk: 'ITEM#001',
  version: 0,
  // ...
}, { invokeContext });
```

**Why this is problematic:**
- Bypasses version control and optimistic locking
- Skips event publishing for downstream sync
- No audit trail in command table
- Breaks CQRS pattern consistency

---

### AP002: Ignoring Version Mismatch Errors

:::danger Anti-Pattern
Never catch and ignore ConditionalCheckFailedException without proper handling.
:::

```typescript
// ❌ Anti-Pattern: Silently ignoring version mismatch
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

try {
  await this.commandService.publishAsync(command, context);
} catch (error) {
  if (error instanceof ConditionalCheckFailedException) {
    console.log('Version mismatch, skipping...'); // Silent failure!
  }
}
```

```typescript
// ✅ Correct: Implement retry with fresh data
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

const MAX_RETRIES = 3;
for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  try {
    const latest = await this.dataService.getItem({ pk, sk });
    const command = this.buildCommand(latest);
    await this.commandService.publishAsync(command, context);
    break;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException && attempt < MAX_RETRIES - 1) {
      continue; // Retry with fresh data
    }
    throw error;
  }
}
```

**Why this is problematic:**
- Data loss - changes are silently discarded
- Inconsistent state between what user sees and database
- Hard to debug issues in production

---

### AP003: Using publishSync for Heavy Operations

:::danger Anti-Pattern
Avoid publishSync for operations that trigger heavy downstream processing.
:::

```typescript
// ❌ Anti-Pattern: Sync publish for batch import
for (const item of thousandItems) {
  await this.commandService.publishSync(item, context); // Blocks until complete!
}
```

```typescript
// ✅ Correct: Use publishAsync for batch operations
const promises = thousandItems.map(item =>
  this.commandService.publishAsync(item, context)
);
await Promise.all(promises);
```

**Why this is problematic:**
- Lambda timeout risk - Step Functions execution adds latency
- Poor user experience - long wait times
- Higher costs - Lambda billed by duration

---

## Data Access Anti-Patterns {#data-access}

### AP004: N+1 Query Pattern

:::danger Anti-Pattern
Avoid fetching related data inside loops.
:::

```typescript
// ❌ Anti-Pattern: N+1 queries
const orders = await this.dataService.listItemsByPk(tenantPk);
for (const order of orders.items) {
  // Each iteration makes a DB call!
  const customer = await this.dataService.getItem({
    pk: order.customerPk,
    sk: order.customerSk
  });
  order.customer = customer;
}
```

```typescript
// ✅ Correct: Batch fetch or denormalize
// Option 1: Denormalize — store customer snapshot inside the order item (recommended for CQRS)
// Option 2: Parallel fetch — use Promise.all to avoid sequential blocking
const orders = await this.dataService.listItemsByPk(tenantPk);
const customers = await Promise.all(
  orders.items.map(o => this.dataService.getItem({ pk: o.customerPk, sk: o.customerSk }))
);
const customerMap = new Map(customers.filter(Boolean).map(c => [c.sk, c]));
orders.items.forEach(order => {
  order.customer = customerMap.get(order.customerSk);
});
```

**Why this is problematic:**
- Performance degradation - 100 orders = 101 DB calls
- Higher DynamoDB costs
- Potential throttling under load

---

### AP005: Scanning Without Filters

:::danger Anti-Pattern
Never scan entire tables without proper filtering.
:::

```typescript
// ❌ Anti-Pattern: Full table scan
// Avoid Scan via DynamoDB SDK directly — reads all items regardless of tenant/key
const result = await this.dynamoDbService.client.send(
  new ScanCommand({ TableName: 'data-table' })
);
const filteredItems = result.Items?.filter(item => item.status?.S === 'active');
```

```typescript
// ✅ Correct: Query with proper key conditions
const result = await this.dataService.listItemsByPk(tenantPk, {
  sk: {
    skExpression: 'begins_with(sk, :skPrefix)',
    skAttributeValues: { ':skPrefix': 'ITEM#' },
  },
});
// Filter by non-key attributes in application code after fetching
const activeItems = result.items.filter(item => item.attributes?.status === 'active');
```

**Why this is problematic:**
- Reads entire table consuming massive RCUs
- Extremely slow for large tables
- Can cause DynamoDB throttling affecting other operations

---

### AP006: Storing Large Objects in DynamoDB

:::danger Anti-Pattern
Don't store large files or binary data directly in DynamoDB items.
:::

```typescript
// ❌ Anti-Pattern: Large base64 file in DynamoDB
const command = new DocumentCommand({
  pk,
  sk,
  attributes: {
    pdfContent: largeBase64String, // Could be megabytes!
  }
});
```

```typescript
// ✅ Correct: Store in S3, reference in DynamoDB
import { toS3AttributeKey } from '@mbc-cqrs-serverless/core';

const s3Key = `documents/${tenantCode}/${documentId}.pdf`;
await this.s3Service.upload(s3Key, fileBuffer);

const command = new DocumentCommand({
  pk,
  sk,
  attributes: {
    pdfLocation: toS3AttributeKey(bucket, s3Key), // s3://bucket/path
  }
});
```

**Why this is problematic:**
- DynamoDB item size limit is 400KB
- High read/write costs for large items
- Slower query performance

---

## Multi-Tenant Anti-Patterns {#multi-tenant}

### AP007: Hardcoding Tenant Code

:::danger Anti-Pattern
Never hardcode tenant codes in application logic.
:::

```typescript
// ❌ Anti-Pattern: Hardcoded tenant
const pk = 'TENANT#default';
const items = await this.dataService.listItemsByPk(pk);
```

```typescript
// ✅ Correct: Use context-provided tenant
const { tenantCode } = getUserContext(context);
const pk = generatePk(tenantCode);
const items = await this.dataService.listItemsByPk(pk);
```

**Why this is problematic:**
- Cross-tenant data leakage risk
- Breaks multi-tenant isolation
- Difficult to debug tenant-specific issues

---

### AP008: Missing Tenant Validation

:::danger Anti-Pattern
Never trust client-provided tenant codes without validation.
:::

```typescript
// ❌ Anti-Pattern: Trusting client input
@Post()
async create(@Body() dto: CreateDto) {
  const pk = `TENANT#${dto.tenantCode}`; // Client controls tenant!
  // ...
}
```

```typescript
// ✅ Correct: Validate against JWT claims
import { INVOKE_CONTEXT, IInvoke, getUserContext } from '@mbc-cqrs-serverless/core';

@Post()
async create(
  @Body() dto: CreateDto,
  @INVOKE_CONTEXT() invokeContext: IInvoke
) {
  const { tenantCode } = getUserContext(invokeContext);
  const pk = generatePk(tenantCode); // From authenticated context
  // ...
}
```

**Why this is problematic:**
- Critical security vulnerability
- Attackers can access other tenants' data
- Compliance violations (GDPR, SOC2, etc.)

---

## Event Handling Anti-Patterns {#event-handling}

### AP009: Throwing Errors in Data Sync Handlers

:::danger Anti-Pattern
Don't let unhandled exceptions escape from DataSyncHandler.
:::

```typescript
// ❌ Anti-Pattern: Unhandled exception
@DataSyncHandler('sample')
export class MyDataSyncHandler implements IDataSyncHandler {
  async up(cmd: CommandModel): Promise<any> {
    const result = await this.externalApi.call(cmd.attributes);
    // If API fails, entire batch fails and retries!
  }
}
```

```typescript
// ✅ Correct: Handle errors gracefully
@DataSyncHandler('sample')
export class MyDataSyncHandler implements IDataSyncHandler {
  async up(cmd: CommandModel): Promise<any> {
    try {
      const result = await this.externalApi.call(cmd.attributes);
    } catch (error) {
      this.logger.error('Sync failed', { cmd, error });
      await this.deadLetterQueue.send(cmd); // DLQ for later processing
      // Don't rethrow - mark as processed
    }
  }
}
```

**Why this is problematic:**
- DynamoDB Streams retries the entire batch
- Can cause infinite retry loops
- Blocks processing of subsequent events

---

### AP010: Long-Running Sync Handlers

:::danger Anti-Pattern
Avoid long-running operations in sync handlers.
:::

```typescript
// ❌ Anti-Pattern: Heavy processing in handler
@DataSyncHandler('sample')
export class MyDataSyncHandler implements IDataSyncHandler {
  async up(cmd: CommandModel): Promise<any> {
    await this.generatePdfReport(cmd.attributes); // Takes 30+ seconds
    await this.sendEmailWithAttachment(report);
  }
}
```

```typescript
// ✅ Correct: Delegate to async processing
@DataSyncHandler('sample')
export class MyDataSyncHandler implements IDataSyncHandler {
  async up(cmd: CommandModel): Promise<any> {
    // Quick enqueue, process asynchronously
    await this.taskService.publish('GenerateReport', {
      itemId: cmd.id,
      type: 'pdf'
    });
  }
}
```

**Why this is problematic:**
- Lambda timeout (15 min max)
- Blocks DynamoDB Stream processing
- Higher costs and poor scalability

---

## Quick Reference Card {#quick-reference}

AP001–AP010 correspond to the sections above (guide codes). AP011–AP027 are detector codes emitted by the `mbc_check_anti_patterns` tool — the tool uses a separate numbering system, so AP003–AP010 detector codes differ from guide codes. See [Anti-Pattern Detection](/docs/mcp-server#anti-pattern-detection) for the full detector→guide mapping.

| Code | Anti-Pattern | Severity |
|----------|------------------|--------------|
| AP001 | Direct database writes | Critical |
| AP002 | Ignoring version mismatch | High |
| AP003 | publishSync for heavy ops | Medium |
| AP004 | N+1 query pattern | High |
| AP005 | Unfiltered table scans | High |
| AP006 | Large objects in DynamoDB | Medium |
| AP007 | Hardcoded tenant codes | Critical |
| AP008 | Missing tenant validation | Critical |
| AP009 | Throwing in sync handlers | High |
| AP010 | Long-running sync handlers | Medium |
| AP011 | Deprecated `publish()` method | High |
| AP012 | Uppercase COMMON tenant key (pre-v1.1.0) | Critical |
| AP013 | `publishSync` null return unchecked (v1.2.0+) | High |
| AP014 | Removed `genNewSequence()` call (removed in v1.1.0) | High |
| AP015 | Duplicate `TaskModule.register()` | High |
| AP016 | Missing error logging before rethrow | High |
| AP017 | Incorrect attribute merging on partial update | High |
| AP018 | Missing Swagger documentation | Low |
| AP019 | Missing pagination in list queries | High |
| AP020 | Missing `getCommandSource` for tracing | Low |
| AP021 | Event emit directly after publishAsync | High |
| AP022 | Use of `eval()` or `Function()` constructor | Critical |
| AP023 | Shell command built from string concatenation | Critical |
| AP024 | HTTP request without timeout | Medium |
| AP025 | Logging `process.env` or full request object | High |
| AP026 | `@NotificationTransport` class also annotated with `@Injectable` | High |
| AP027 | `@GroupRoleResolver` class also annotated with `@Injectable` | High |

## Related Documentation

- [Service Patterns](/docs/service-patterns) - Recommended patterns
- [Security Best Practices](/docs/security-best-practices) - Security guidelines
- [Common Issues](/docs/common-issues) - Troubleshooting guide
- [MCP Server](/docs/mcp-server) - Anti-pattern detection tools
