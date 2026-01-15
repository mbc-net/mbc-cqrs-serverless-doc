---
description: {{Common anti-patterns to avoid when developing with MBC CQRS Serverless framework.}}
---

# {{Anti-Patterns Guide}}

{{This guide documents common mistakes and anti-patterns to avoid when developing with the MBC CQRS Serverless framework. Understanding what NOT to do is as important as knowing the best practices.}}

## {{Command Handling Anti-Patterns}}

### {{AP001: Direct Database Writes Bypassing Command Service}}

:::danger {{Anti-Pattern}}
{{Never write directly to DynamoDB tables bypassing the CommandService.}}
:::

```typescript
// ❌ {{Anti-Pattern: Direct DynamoDB write}}
const dynamodb = new DynamoDBClient({});
await dynamodb.send(new PutItemCommand({
  TableName: 'my-table',
  Item: { pk: { S: 'TENANT#mbc' }, sk: { S: 'ITEM#001' }, ... }
}));
```

```typescript
// ✅ {{Correct: Use CommandService}}
await this.commandService.publishAsync(new ItemCommand({
  pk: { S: 'TENANT#mbc' },
  sk: { S: 'ITEM#001' },
  ...
}), context);
```

**{{Why this is problematic:}}**
- {{Bypasses version control and optimistic locking}}
- {{Skips event publishing for downstream sync}}
- {{No audit trail in command table}}
- {{Breaks CQRS pattern consistency}}

---

### {{AP002: Ignoring Version Mismatch Errors}}

:::danger {{Anti-Pattern}}
{{Never catch and ignore VersionMismatchError without proper handling.}}
:::

```typescript
// ❌ {{Anti-Pattern: Silently ignoring version mismatch}}
try {
  await this.commandService.publishAsync(command, context);
} catch (error) {
  if (error.name === 'VersionMismatchError') {
    console.log('Version mismatch, skipping...'); // {{Silent failure!}}
  }
}
```

```typescript
// ✅ {{Correct: Implement retry with fresh data}}
const MAX_RETRIES = 3;
for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  try {
    const latest = await this.dataService.getItem({ pk, sk });
    const command = this.buildCommand(latest);
    await this.commandService.publishAsync(command, context);
    break;
  } catch (error) {
    if (error.name === 'VersionMismatchError' && attempt < MAX_RETRIES - 1) {
      continue; // {{Retry with fresh data}}
    }
    throw error;
  }
}
```

**{{Why this is problematic:}}**
- {{Data loss - changes are silently discarded}}
- {{Inconsistent state between what user sees and database}}
- {{Hard to debug issues in production}}

---

### {{AP003: Using publishSync for Heavy Operations}}

:::danger {{Anti-Pattern}}
{{Avoid publishSync for operations that trigger heavy downstream processing.}}
:::

```typescript
// ❌ {{Anti-Pattern: Sync publish for batch import}}
for (const item of thousandItems) {
  await this.commandService.publishSync(item, context); // {{Blocks until complete!}}
}
```

```typescript
// ✅ {{Correct: Use publishAsync for batch operations}}
const promises = thousandItems.map(item =>
  this.commandService.publishAsync(item, context)
);
await Promise.all(promises);
```

**{{Why this is problematic:}}**
- {{Lambda timeout risk - Step Functions execution adds latency}}
- {{Poor user experience - long wait times}}
- {{Higher costs - Lambda billed by duration}}

---

## {{Data Access Anti-Patterns}}

### {{AP004: N+1 Query Pattern}}

:::danger {{Anti-Pattern}}
{{Avoid fetching related data inside loops.}}
:::

```typescript
// ❌ {{Anti-Pattern: N+1 queries}}
const orders = await this.dataService.listItems({ pk: tenantPk });
for (const order of orders) {
  // {{Each iteration makes a DB call!}}
  const customer = await this.dataService.getItem({
    pk: order.customerPk,
    sk: order.customerSk
  });
  order.customer = customer;
}
```

```typescript
// ✅ {{Correct: Batch fetch or denormalize}}
const orders = await this.dataService.listItems({ pk: tenantPk });
const customerKeys = orders.map(o => ({ pk: o.customerPk, sk: o.customerSk }));
const customers = await this.dataService.batchGetItems(customerKeys);
const customerMap = new Map(customers.map(c => [c.sk, c]));
orders.forEach(order => {
  order.customer = customerMap.get(order.customerSk);
});
```

**{{Why this is problematic:}}**
- {{Performance degradation - 100 orders = 101 DB calls}}
- {{Higher DynamoDB costs}}
- {{Potential throttling under load}}

---

### {{AP005: Scanning Without Filters}}

:::danger {{Anti-Pattern}}
{{Never scan entire tables without proper filtering.}}
:::

```typescript
// ❌ {{Anti-Pattern: Full table scan}}
const allItems = await this.dataService.scan({ TableName: 'data-table' });
const filteredItems = allItems.filter(item => item.status === 'active');
```

```typescript
// ✅ {{Correct: Query with proper key conditions}}
const activeItems = await this.dataService.listItems({
  pk: tenantPk,
  sk: { $beginsWith: 'ITEM#' },
  filter: { status: 'active' }
});
```

**{{Why this is problematic:}}**
- {{Reads entire table consuming massive RCUs}}
- {{Extremely slow for large tables}}
- {{Can cause DynamoDB throttling affecting other operations}}

---

### {{AP006: Storing Large Objects in DynamoDB}}

:::danger {{Anti-Pattern}}
{{Don't store large files or binary data directly in DynamoDB items.}}
:::

```typescript
// ❌ {{Anti-Pattern: Large base64 file in DynamoDB}}
const command = new DocumentCommand({
  pk,
  sk,
  attributes: {
    pdfContent: largeBase64String, // {{Could be megabytes!}}
  }
});
```

```typescript
// ✅ {{Correct: Store in S3, reference in DynamoDB}}
const s3Key = `documents/${tenantCode}/${documentId}.pdf`;
await this.s3Service.upload(s3Key, fileBuffer);

const command = new DocumentCommand({
  pk,
  sk,
  attributes: {
    pdfLocation: toS3Uri(bucket, s3Key), // {{s3://bucket/path}}
  }
});
```

**{{Why this is problematic:}}**
- {{DynamoDB item size limit is 400KB}}
- {{High read/write costs for large items}}
- {{Slower query performance}}

---

## {{Multi-Tenant Anti-Patterns}}

### {{AP007: Hardcoding Tenant Code}}

:::danger {{Anti-Pattern}}
{{Never hardcode tenant codes in application logic.}}
:::

```typescript
// ❌ {{Anti-Pattern: Hardcoded tenant}}
const pk = 'TENANT#default';
const items = await this.dataService.listItems({ pk });
```

```typescript
// ✅ {{Correct: Use context-provided tenant}}
const { tenantCode } = getUserContext(context);
const pk = generatePk(tenantCode);
const items = await this.dataService.listItems({ pk });
```

**{{Why this is problematic:}}**
- {{Cross-tenant data leakage risk}}
- {{Breaks multi-tenant isolation}}
- {{Difficult to debug tenant-specific issues}}

---

### {{AP008: Missing Tenant Validation}}

:::danger {{Anti-Pattern}}
{{Never trust client-provided tenant codes without validation.}}
:::

```typescript
// ❌ {{Anti-Pattern: Trusting client input}}
@Post()
async create(@Body() dto: CreateDto) {
  const pk = `TENANT#${dto.tenantCode}`; // {{Client controls tenant!}}
  // ...
}
```

```typescript
// ✅ {{Correct: Validate against JWT claims}}
@Post()
async create(
  @Body() dto: CreateDto,
  @Req() request: IInvoke
) {
  const { tenantCode } = getUserContext(request);
  const pk = generatePk(tenantCode); // {{From authenticated context}}
  // ...
}
```

**{{Why this is problematic:}}**
- {{Critical security vulnerability}}
- {{Attackers can access other tenants' data}}
- {{Compliance violations (GDPR, SOC2, etc.)}}

---

## {{Event Handling Anti-Patterns}}

### {{AP009: Throwing Errors in Data Sync Handlers}}

:::danger {{Anti-Pattern}}
{{Don't let unhandled exceptions escape from DataSyncHandler.}}
:::

```typescript
// ❌ {{Anti-Pattern: Unhandled exception}}
@DataSyncHandler({ tableName: 'data-table' })
export class MyDataSyncHandler implements IDataSyncHandler {
  async handleSync(event: SyncEvent): Promise<void> {
    const result = await this.externalApi.call(event.data);
    // {{If API fails, entire batch fails and retries!}}
  }
}
```

```typescript
// ✅ {{Correct: Handle errors gracefully}}
@DataSyncHandler({ tableName: 'data-table' })
export class MyDataSyncHandler implements IDataSyncHandler {
  async handleSync(event: SyncEvent): Promise<void> {
    try {
      const result = await this.externalApi.call(event.data);
    } catch (error) {
      this.logger.error('Sync failed', { event, error });
      await this.deadLetterQueue.send(event); // {{DLQ for later processing}}
      // {{Don't rethrow - mark as processed}}
    }
  }
}
```

**{{Why this is problematic:}}**
- {{DynamoDB Streams retries the entire batch}}
- {{Can cause infinite retry loops}}
- {{Blocks processing of subsequent events}}

---

### {{AP010: Long-Running Sync Handlers}}

:::danger {{Anti-Pattern}}
{{Avoid long-running operations in sync handlers.}}
:::

```typescript
// ❌ {{Anti-Pattern: Heavy processing in handler}}
@DataSyncHandler({ tableName: 'data-table' })
export class MyDataSyncHandler implements IDataSyncHandler {
  async handleSync(event: SyncEvent): Promise<void> {
    await this.generatePdfReport(event.data); // {{Takes 30+ seconds}}
    await this.sendEmailWithAttachment(report);
  }
}
```

```typescript
// ✅ {{Correct: Delegate to async processing}}
@DataSyncHandler({ tableName: 'data-table' })
export class MyDataSyncHandler implements IDataSyncHandler {
  async handleSync(event: SyncEvent): Promise<void> {
    // {{Quick enqueue, process asynchronously}}
    await this.taskService.publish('GenerateReport', {
      itemId: event.data.id,
      type: 'pdf'
    });
  }
}
```

**{{Why this is problematic:}}**
- {{Lambda timeout (15 min max)}}
- {{Blocks DynamoDB Stream processing}}
- {{Higher costs and poor scalability}}

---

## {{Quick Reference Card}}

| {{Code}} | {{Anti-Pattern}} | {{Severity}} |
|----------|------------------|--------------|
| AP001 | {{Direct database writes}} | {{Critical}} |
| AP002 | {{Ignoring version mismatch}} | {{High}} |
| AP003 | {{publishSync for heavy ops}} | {{Medium}} |
| AP004 | {{N+1 query pattern}} | {{High}} |
| AP005 | {{Unfiltered table scans}} | {{High}} |
| AP006 | {{Large objects in DynamoDB}} | {{Medium}} |
| AP007 | {{Hardcoded tenant codes}} | {{Critical}} |
| AP008 | {{Missing tenant validation}} | {{Critical}} |
| AP009 | {{Throwing in sync handlers}} | {{High}} |
| AP010 | {{Long-running sync handlers}} | {{Medium}} |

---

## {{Planned Detection (Future Releases)}}

:::info {{Note}}
{{The following anti-patterns are documented for reference but automated detection is not yet implemented in the MCP server. Detection for these patterns is planned for future releases.}}
:::

| {{Code}} | {{Anti-Pattern}} | {{Severity}} | {{Status}} |
|----------|------------------|--------------|------------|
| AP011 | {{No sequence exhaustion handling}} | {{Low}} | {{Planned}} |
| AP012 | {{Sequences for non-sequential IDs}} | {{Low}} | {{Planned}} |
| AP013 | {{Secrets in code}} | {{Critical}} | {{Planned}} |
| AP014 | {{Unvalidated JWT claims}} | {{Critical}} | {{Planned}} |
| AP015 | {{Testing against production}} | {{Critical}} | {{Planned}} |
| AP016 | {{Real AWS calls in tests}} | {{Medium}} | {{Planned}} |
| AP017 | {{Cold start amplification}} | {{Medium}} | {{Planned}} |
| AP018 | {{Unbounded batch operations}} | {{High}} | {{Planned}} |

## {{See Also}}

- [{{Error Catalog}}](./error-catalog) - {{Error codes and solutions}}
- [{{Common Issues}}](./common-issues) - {{Troubleshooting guide}}
- [{{Security Best Practices}}](./security-best-practices) - {{Security guidelines}}
- [{{Service Patterns}}](./service-patterns) - {{Recommended patterns}}
