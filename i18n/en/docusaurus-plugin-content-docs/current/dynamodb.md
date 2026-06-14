---
description: Learn about DynamoDB table design and management in MBC CQRS Serverless.
---

# DynamoDB

## Overview

MBC CQRS Serverless uses DynamoDB as its primary data store, implementing CQRS and Event Sourcing patterns through a structured table design. Understanding the table structure is essential for building efficient applications.

## Table Architecture

```mermaid
graph TB
    subgraph "Table Types"
        A["Command Table<br/>entity-command"]
        B["Data Table<br/>entity-data"]
        C["History Table<br/>entity-history"]
    end

    subgraph "System Tables"
        D["tasks"]
        E["sequences"]
        F["import_tmp"]
    end

    A -->|"DynamoDB Streams"| B
    A -->|"Event Sourcing"| C
```

In the MBC CQRS Serverless, DynamoDB tables are organized into the following types:

### Entity Tables

| Table Type | Naming Convention | Purpose |
|------------|-------------------|---------|
| Command Table | `entity-command` | Stores write commands (write model) |
| Data Table | `entity-data` | Stores current state (read model) |
| History Table | `entity-history` | Stores all versions for event sourcing |

:::info Deployed Table Names
The actual table names are prefixed with the environment and application name: `{NODE_ENV}-{APP_NAME}-{entity}-{type}` (for example `dev-myapp-order-command`). The names above are the logical suffixes used by `CommandModule.register({ tableName })`.
:::

### System Tables

| Table | Purpose |
|--------|---------|
| `tasks` | Stores information about long-running asynchronous tasks |
| `sequences` | Holds sequence data for ID generation |
| `import_tmp` | Stores temporary data for import operations via Step Functions |
| `session` | Tracks Read-Your-Writes sessions (v1.2.0+) |

## Table Definition

Table definitions are stored in the `prisma/dynamodbs` folder. To add a new entity table:

### Step 1: Define Table in Configuration

Add the table name to `prisma/dynamodbs/cqrs.json`:

```json
["cat", "dog", "order"]
```

### Step 2: Run Migration

For local development:

```bash
# Migrate DynamoDB tables only
npm run migrate:ddb

# Migrate both DynamoDB and RDS
npm run migrate
```

### System Table Definitions {#system-table-definitions}

System tables (`tasks`, `sequences`, `import_tmp`, `session`) have their own JSON definition files in the `prisma/dynamodbs/` folder. These are automatically created during migration:

| File | Table | Purpose |
|------|---------|---------|
| `tasks.json` | `tasks` | Task management with DynamoDB Streams |
| `sequences.json` | `sequences` | Sequence ID generation |
| `import_tmp.json` | `import_tmp` | Temporary import data with DynamoDB Streams for [ImportModule](/docs/import) |
| `session.json` | `session` | Read-Your-Writes session tracking (v1.2.0+), see [Command Service](/docs/command-service#read-your-writes) |

:::info Version Note
The `import_tmp.json` template was added in [version 1.1.1](/docs/changelog#v111). If you created your project with an earlier version and use the ImportModule, you need to add this file manually. See [Common Issues](/docs/common-issues#missing-import-tmp-table) for details.
:::

## Key Design Patterns

### Standard Key Structure

All entity tables use a composite primary key. The DATA table and COMMAND table use the same `pk` format but differ in `sk`:

| Table | Key | Format | Example |
|-------|-----|--------|---------|
| DATA / HISTORY | `pk` | `tenantCode#TYPE` | `ACME#ORDER` |
| DATA / HISTORY | `sk` | `TYPE#code` | `ORDER#ORD-000001` |
| COMMAND | `pk` | `tenantCode#TYPE` | `ACME#ORDER` |
| COMMAND | `sk` | `TYPE#code@version` | `ORDER#ORD-000001@1` |

The COMMAND table sort key includes an `@{version}` suffix appended by the framework. Use `removeSortKeyVersion(sk)` to strip it when querying the DATA table.

### Entity Key Examples

```typescript
// Order entity
const orderKey = {
  pk: `${tenantCode}#ORDER`,
  sk: `ORDER#${orderId}`,
};

// User entity
const userKey = {
  pk: `${tenantCode}#USER`,
  sk: `USER#${userId}`,
};

// Hierarchical data (e.g., organization)
const departmentKey = {
  pk: `${tenantCode}#ORG`,
  sk: `DEPT#${parentId}#${deptId}`,
};
```

## Table Attributes

### Common Attributes

All entity tables share these common attributes:

| Attribute | Type | Description |
|-----------|------|-------------|
| `pk` | String | Partition key |
| `sk` | String | Sort key |
| `id` | String | Unique identifier (`pk#sk`, @version stripped from sk) |
| `code` | String | Business code |
| `name` | String | Display name |
| `tenantCode` | String | Tenant identifier |
| `type` | String | Entity type |
| `version` | Number | Version for optimistic locking |
| `attributes` | Map | Custom entity attributes |
| `createdBy` | String | Creator user ID |
| `createdIp` | String | Creator IP address |
| `createdAt` | String | Creation timestamp (ISO 8601) |
| `updatedBy` | String | Last modifier user ID |
| `updatedIp` | String | Last modifier IP address |
| `updatedAt` | String | Last update timestamp (ISO 8601) |

### Command-Specific Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `source` | String | Command source identifier |
| `requestId` | String | Request tracking ID |

### History-Specific Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `seq` | Number | Sequence number in history |

## Secondary Indexes

### Adding Global Secondary Indexes

The default table configuration does not include GSIs. You can add them based on your query patterns. A common pattern is adding a code-index for fast lookups by business code:

Example GSI definition (add to your table configuration):

```json
{
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "code-index",
      "KeySchema": [
        { "AttributeName": "tenantCode", "KeyType": "HASH" },
        { "AttributeName": "code", "KeyType": "RANGE" }
      ],
      "Projection": { "ProjectionType": "ALL" }
    }
  ]
}
```

Example usage with custom GSI:

```typescript
// Find entity by code (requires code-index GSI)
const params = {
  TableName: 'entity-data',
  IndexName: 'code-index',
  KeyConditionExpression: 'tenantCode = :tenant AND code = :code',
  ExpressionAttributeValues: {
    ':tenant': tenantCode,
    ':code': entityCode,
  },
};
```

## Best Practices

### Key Design

1. **Keep partition keys broad**: Distribute data evenly across partitions
2. **Use hierarchical sort keys**: Enable efficient range queries
3. **Include tenant in partition key**: Ensure data isolation

### Query Optimization

1. **Use Query over Scan**: Always use partition key in queries
2. **Limit result sets**: Use pagination for large datasets
3. **Project needed attributes**: Only retrieve required fields

### Capacity Planning

1. **Use on-demand capacity**: Recommended for unpredictable workloads
2. **Monitor consumed capacity**: Set up CloudWatch alarms
3. **Consider DAX**: For read-heavy workloads requiring microsecond latency

## Local Development

### DynamoDB Local

The framework includes DynamoDB Local for development:

```bash
# Start DynamoDB Local (included in docker-compose)
docker-compose up -d dynamodb-local

# Access DynamoDB Local Admin UI
open http://localhost:8001
```

### Environment Variables

```bash
# Local DynamoDB endpoint
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_REGION=ap-northeast-1
```

## Related Documentation

- [Key Patterns](/docs/key-patterns): Detailed key design strategies
- [Entity Patterns](/docs/entity-patterns): Entity modeling guidelines
- [Sequence](/docs/sequence): Sequence ID generation
- [CommandService](/docs/command-service): Command handling and data sync
