---
description: Common anti-patterns to avoid when developing with MBC CQRS Serverless framework.
---

# Anti-Patterns Guide

This guide documents common mistakes and anti-patterns to avoid when developing with the MBC CQRS Serverless framework. Understanding what NOT to do is as important as knowing the best practices.

## Command Handling Anti-Patterns

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
await this.commandService.publishAsync(new ItemCommand({
  pk: { S: 'TENANT#mbc' },
  sk: { S: 'ITEM#001' },
  ...
}), context);
```

**Why this is problematic:**
- Bypasses version control and optimistic locking
- Skips event publishing for downstream sync
- No audit trail in command table
- Breaks CQRS pattern consistency

---

### AP002: Ignoring Version Mismatch Errors

:::danger Anti-Pattern
Never catch and ignore VersionMismatchError without proper handling.
:::

```typescript
// ❌ Anti-Pattern: Silently ignoring version mismatch
try {
  await this.commandService.publishAsync(command, context);
} catch (error) {
  if (error.name === 'VersionMismatchError') {
    console.log('Version mismatch, skipping...'); // Silent failure!
  }
}
```

```typescript
// ✅ Correct: Implement retry with fresh data
const MAX_RETRIES = 3;
for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  try {
    const latest = await this.dataService.getItem({ pk, sk });
    const command = this.buildCommand(latest);
    await this.commandService.publishAsync(command, context);
    break;
  } catch (error) {
    if (error.name === 'VersionMismatchError' && attempt < MAX_RETRIES - 1) {
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

## Data Access Anti-Patterns

### AP004: N+1 Query Pattern

:::danger Anti-Pattern
Avoid fetching related data inside loops.
:::

```typescript
// ❌ Anti-Pattern: N+1 queries
const orders = await this.dataService.listItems({ pk: tenantPk });
for (const order of orders) {
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
const orders = await this.dataService.listItems({ pk: tenantPk });
const customerKeys = orders.map(o => ({ pk: o.customerPk, sk: o.customerSk }));
const customers = await this.dataService.batchGetItems(customerKeys);
const customerMap = new Map(customers.map(c => [c.sk, c]));
orders.forEach(order => {
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
const allItems = await this.dataService.scan({ TableName: 'data-table' });
const filteredItems = allItems.filter(item => item.status === 'active');
```

```typescript
// ✅ Correct: Query with proper key conditions
const activeItems = await this.dataService.listItems({
  pk: tenantPk,
  sk: { $beginsWith: 'ITEM#' },
  filter: { status: 'active' }
});
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
const s3Key = `documents/${tenantCode}/${documentId}.pdf`;
await this.s3Service.upload(s3Key, fileBuffer);

const command = new DocumentCommand({
  pk,
  sk,
  attributes: {
    pdfLocation: toS3Uri(bucket, s3Key), // s3://bucket/path
  }
});
```

**Why this is problematic:**
- DynamoDB item size limit is 400KB
- High read/write costs for large items
- Slower query performance

---

## Multi-Tenant Anti-Patterns

### AP007: Hardcoding Tenant Code

:::danger Anti-Pattern
Never hardcode tenant codes in application logic.
:::

```typescript
// ❌ Anti-Pattern: Hardcoded tenant
const pk = 'TENANT#default';
const items = await this.dataService.listItems({ pk });
```

```typescript
// ✅ Correct: Use context-provided tenant
const { tenantCode } = getUserContext(context);
const pk = generatePk(tenantCode);
const items = await this.dataService.listItems({ pk });
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
@Post()
async create(
  @Body() dto: CreateDto,
  @Req() request: IInvoke
) {
  const { tenantCode } = getUserContext(request);
  const pk = generatePk(tenantCode); // From authenticated context
  // ...
}
```

**Why this is problematic:**
- Critical security vulnerability
- Attackers can access other tenants' data
- Compliance violations (GDPR, SOC2, etc.)

---

## Event Handling Anti-Patterns

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

## Quick Reference Card

The MCP server currently detects the following anti-patterns automatically. For full details on each code, see [MCP Server Anti-Pattern Detection](/docs/mcp-server#anti-pattern-detection).

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
| AP014 | Deprecated `genNewSequence` (v1.2.0) | High |
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

## Related Documentation

- [Service Patterns](/docs/service-patterns) - Recommended patterns
- [Security Best Practices](/docs/security-best-practices) - Security guidelines
- [Common Issues](/docs/common-issues) - Troubleshooting guide
- [MCP Server](/docs/mcp-server) - Anti-pattern detection tools
