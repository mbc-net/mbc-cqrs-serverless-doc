---
description: Learn about partition key (PK) and sort key (SK) design patterns for DynamoDB.
---

# Key Design Patterns

This guide explains how to design partition keys (PK) and sort keys (SK) for your entities in DynamoDB. Proper key design is critical for performance, scalability, and query efficiency.

## When to Use This Guide

Use this guide when you need to:

- Design keys for a new entity type
- Model parent-child relationships (Order → OrderItems)
- Support multi-tenant data isolation
- Enable efficient query patterns (list by tenant, filter by date)
- Handle versioning for optimistic locking

:::tip Related Documentation
- [Entity Definition Patterns](./entity-patterns.md) - How to define entities that use these key patterns
- [Multi-Tenant Patterns](./multi-tenant-patterns.md) - Tenant isolation and cross-tenant operations
- [Backend Development Guide](./backend-development.md) - Complete module implementation patterns
:::

## Problems This Pattern Solves

| Problem | Solution |
|---------|----------|
| Querying all items for a tenant is slow | Include tenant code in PK for partition-level isolation |
| Can't list child items without knowing all keys | Use shared PK with different SK prefixes |
| IDs are not sortable by creation time | Use ULID which is both unique and time-sortable |
| Version conflicts in concurrent updates | Version suffix in SK enables optimistic locking |

## Pattern Selection Guide {#pattern-selection}

Use this decision tree to choose the right key pattern for your use case:

### Decision Matrix

| Requirement | Recommended Pattern | PK Structure | SK Structure |
|-----------------|------------------------|------------------|------------------|
| Simple CRUD with tenant isolation | [Simple Entity](#pattern-1-simple-entity) | `ENTITY#tenantCode` | `ulid()` |
| Parent with multiple children | [Hierarchical](#pattern-2-hierarchical-entity) | `PARENT#tenantCode` | `TYPE#parentId[#childId]` |
| Multiple entity variants | [Composite SK](#pattern-3-user-with-multiple-auth-providers) | `ENTITY#tenantCode` | `variant#identifier` |
| Cross-tenant shared data | [Common Tenant](#pattern-4-multi-tenant-association) | `ENTITY#common` | `tenantCode#identifier` |
| Categorized configurations | [Master Data](#pattern-5-master-data-with-categories) | `MASTER#tenantCode` | `TYPE#category#code` |
| Time-based queries | [Time-Series](#pattern-6-time-series-data) | `LOG#tenantCode#YYYY-MM` | `timestamp#eventId` |

### Decision Tree

```
Start: What type of data are you storing?
│
├─ Standalone entity (Product, Customer)
│  └─ Use Simple Entity Pattern
│
├─ Parent-child relationship (Order → Items)
│  └─ Do children need independent access?
│     ├─ Yes → Use separate PK with reference
│     └─ No → Use Hierarchical Pattern (shared PK)
│
├─ Configuration/Master data
│  └─ Use Master Data Pattern
│
├─ Time-based events (logs, audit)
│  └─ Use Time-Series Pattern
│
└─ User/Entity with multiple variants
   └─ Use Composite SK Pattern
```

## Key Structure Overview

The framework uses a consistent key structure:

```
PK = PREFIX#TENANT_CODE
SK = IDENTIFIER[@VERSION]
ID = PK#SK (without version)
```

The `KEY_SEPARATOR` constant (`#`) is used to separate key components.

### Framework Constants {#framework-constants}

The framework provides these constants in `@mbc-cqrs-serverless/core`:

| Constant | Value | Description |
|--------------|-----------|-----------------|
| `KEY_SEPARATOR` | `#` | Separates key components (PK segments, SK segments, ID) |
| `VER_SEPARATOR` | `@` | Separates sort key from version number |
| `VERSION_FIRST` | `0` | Initial version for new entities |
| `VERSION_LATEST` | `-1` | Indicates query for latest version |
| `TENANT_COMMON` | `common` | Tenant code for shared/cross-tenant data |
| `DEFAULT_TENANT_CODE` | `single` | Default tenant for single-tenant mode |

### Built-in Key Generators {#built-in-generators}

The framework provides these pre-built key generators:

```ts
import { masterPk, seqPk, ttlSk } from "@mbc-cqrs-serverless/core";

// Master data partition key
masterPk("tenant001");      // "MASTER#tenant001"
masterPk();                 // "MASTER#single" (default tenant)

// Sequence partition key
seqPk("tenant001");         // "SEQ#tenant001"

// TTL sort key for table-level TTL settings
ttlSk("product");           // "TTL#product"
```

## Basic Key Generation

Import utilities from the core package:

```ts
import {
  generateId,
  getTenantCode,
  KEY_SEPARATOR,
  VER_SEPARATOR,
  removeSortKeyVersion,
  addSortKeyVersion,
  getSortKeyVersion,
  VERSION_FIRST,
  VERSION_LATEST,
  TENANT_COMMON,
} from "@mbc-cqrs-serverless/core";
import { ulid } from "ulid";
```

### Generating Keys

```ts
const PRODUCT_PK_PREFIX = "PRODUCT";

// Generate PK
const pk = `${PRODUCT_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`;
// Result: "PRODUCT#tenant001"

// Generate SK (using ULID for uniqueness and sortability)
const sk = ulid();
// Result: "01HX7MBJK3V9WQBZ7XNDK5ZT2M"

// Generate ID (combination of PK and SK)
const id = generateId(pk, sk);
// Result: "PRODUCT#tenant001#01HX7MBJK3V9WQBZ7XNDK5ZT2M"
```

### Version Handling

```ts
// Add version to SK
const skWithVersion = addSortKeyVersion(sk, 3);
// Result: "01HX7MBJK3V9WQBZ7XNDK5ZT2M@3"

// Remove version from SK
const baseSk = removeSortKeyVersion(skWithVersion);
// Result: "01HX7MBJK3V9WQBZ7XNDK5ZT2M"

// Get version number from SK
const version = getSortKeyVersion(skWithVersion);
// Result: 3

// Get version from SK without version suffix
const latestVersion = getSortKeyVersion(sk);
// Result: -1 (VERSION_LATEST)
```

### Tenant Code Extraction

```ts
import { getTenantCode } from "@mbc-cqrs-serverless/core";

// Extract tenant code from PK
const tenantCode = getTenantCode("PRODUCT#tenant001");
// Result: "tenant001"

// Returns undefined if no separator found
const noTenant = getTenantCode("PRODUCT");
// Result: undefined
```

## Common Key Patterns

### Pattern 1: Simple Entity {#pattern-1-simple-entity}

#### Use Case: Product Catalog

Scenario: Store products that belong to a tenant with unique IDs.

When to use: Standalone entities without parent-child relationships.

```ts
// Key Structure
PK: PRODUCT#<tenantCode>
SK: <ulid>

// Example
PK: PRODUCT#tenant001
SK: 01HX7MBJK3V9WQBZ7XNDK5ZT2M
ID: PRODUCT#tenant001#01HX7MBJK3V9WQBZ7XNDK5ZT2M
```

```ts
const pk = `PRODUCT${KEY_SEPARATOR}${tenantCode}`;
const sk = ulid();
const id = generateId(pk, sk);
```

### Pattern 2: Hierarchical Entity {#pattern-2-hierarchical-entity}

#### Use Case: Order with Line Items

Scenario: An order contains multiple items. Need to query all items for an order efficiently.

Solution: Share PK between parent and children, use SK prefix to distinguish item types.

```ts
// Order Key Structure
PK: ORDER#<tenantCode>
SK: ORDER#<orderId>

// Order Item Key Structure (same PK, different SK prefix)
PK: ORDER#<tenantCode>
SK: ORDER_ITEM#<orderId>#<itemId>

// Example
Order:
  PK: ORDER#tenant001
  SK: ORDER#01HX7MBJK3V9WQBZ7XNDK5ZT2M

Order Items:
  PK: ORDER#tenant001
  SK: ORDER_ITEM#01HX7MBJK3V9WQBZ7XNDK5ZT2M#001
  SK: ORDER_ITEM#01HX7MBJK3V9WQBZ7XNDK5ZT2M#002
```

```ts
const ORDER_SK_PREFIX = "ORDER";
const ORDER_ITEM_SK_PREFIX = "ORDER_ITEM";

// Create order
const orderPk = `ORDER${KEY_SEPARATOR}${tenantCode}`;
const orderId = ulid();
const orderSk = `${ORDER_SK_PREFIX}${KEY_SEPARATOR}${orderId}`;

// Create order item
const itemSk = `${ORDER_ITEM_SK_PREFIX}${KEY_SEPARATOR}${orderId}${KEY_SEPARATOR}${itemId}`;
```

### Pattern 3: User with Multiple Auth Providers {#pattern-3-user-with-multiple-auth-providers}

#### Use Case: Unified User Identity

Scenario: Users can sign in with local password, SSO, or OAuth. Need to link all auth methods to one user.

Solution: Same PK for all user records, SK prefix indicates authentication provider.

```ts
// Key Structure
PK: USER#<tenantCode>
SK: <provider>#<userId>

// Examples
PK: USER#common
SK: local#user123           // Local authentication
SK: sso#abc123def456        // SSO provider
SK: oauth#google789         // OAuth provider
SK: temp#session456         // Temporary session
SK: profile#user123         // User profile data
```

```ts
type AuthProvider = "local" | "sso" | "oauth" | "temp" | "profile";

function generateUserSk(provider: AuthProvider, userId: string): string {
  return `${provider}${KEY_SEPARATOR}${userId}`;
}

const pk = `USER${KEY_SEPARATOR}common`;
const sk = generateUserSk("sso", cognitoSubId);
```

### Pattern 4: Multi-Tenant Association {#pattern-4-multi-tenant-association}

#### Use Case: User Belongs to Multiple Organizations

Scenario: In a SaaS application, one user can belong to multiple tenants/organizations.

Solution: Use a common tenant with SK that combines tenant and user codes.

```ts
// Key Structure
PK: USER_TENANT#<commonTenant>
SK: <tenantCode>#<userCode>

// Example
PK: USER_TENANT#common
SK: tenant001#user123
SK: tenant002#user123   // Same user in different tenant
```

```ts
const pk = `USER_TENANT${KEY_SEPARATOR}common`;
const sk = `${tenantCode}${KEY_SEPARATOR}${userCode}`;
```

### Pattern 5: Master Data with Categories {#pattern-5-master-data-with-categories}

#### Use Case: Application Settings and Configuration

Scenario: Store email templates, product categories, and application settings.

Solution: Use type prefix (SETTING, DATA) in SK to organize different configuration types.

```ts
// Key Structure
PK: MASTER#<tenantCode>
SK: <type>#<category>#<code>

// Types: SETTING, DATA, COPY
// Examples
PK: MASTER#tenant001
SK: SETTING#notification#email_template
SK: DATA#product_category#electronics
SK: DATA#product_category#clothing
SK: COPY#backup#2024-01-01
```

```ts
const SETTING_PREFIX = "SETTING";
const DATA_PREFIX = "DATA";

function generateMasterSk(type: string, category: string, code: string): string {
  return `${type}${KEY_SEPARATOR}${category}${KEY_SEPARATOR}${code}`;
}

const pk = `MASTER${KEY_SEPARATOR}${tenantCode}`;
const sk = generateMasterSk(DATA_PREFIX, "product_category", "electronics");
```

### Pattern 6: Time-Series Data {#pattern-6-time-series-data}

#### Use Case: Activity Logs and Audit Trail

Scenario: Store time-stamped events that need to be queried by date range.

Solution: Include date in PK for time-based partitioning, timestamp in SK for sorting.

```ts
// Key Structure
PK: LOG#<tenantCode>#<year-month>
SK: <timestamp>#<eventId>

// Example
PK: LOG#tenant001#2024-01
SK: 2024-01-15T10:30:00Z#evt001
SK: 2024-01-15T10:31:00Z#evt002
```

```ts
function generateLogKeys(tenantCode: string, timestamp: Date, eventId: string) {
  const yearMonth = timestamp.toISOString().slice(0, 7); // "2024-01"
  const pk = `LOG${KEY_SEPARATOR}${tenantCode}${KEY_SEPARATOR}${yearMonth}`;
  const sk = `${timestamp.toISOString()}${KEY_SEPARATOR}${eventId}`;
  return { pk, sk };
}
```

## Key Helper Functions

Create a helpers file for consistent key generation:

```ts
// helpers/key.ts
import { KEY_SEPARATOR, generateId } from "@mbc-cqrs-serverless/core";
import { ulid } from "ulid";

// Entity prefixes
export const PRODUCT_PK_PREFIX = "PRODUCT";
export const ORDER_PK_PREFIX = "ORDER";
export const ORDER_SK_PREFIX = "ORDER";
export const ORDER_ITEM_SK_PREFIX = "ORDER_ITEM";
export const USER_PK_PREFIX = "USER";
export const MASTER_PK_PREFIX = "MASTER";
export const NOTIFICATION_PK_PREFIX = "NOTIFICATION";

// Key generators
export function generateProductPk(tenantCode: string): string {
  return `${PRODUCT_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`;
}

export function generateOrderPk(tenantCode: string): string {
  return `${ORDER_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`;
}

export function generateOrderSk(orderId?: string): string {
  const id = orderId ?? ulid();
  return `${ORDER_SK_PREFIX}${KEY_SEPARATOR}${id}`;
}

export function generateOrderItemSk(orderId: string, itemId: string): string {
  return `${ORDER_ITEM_SK_PREFIX}${KEY_SEPARATOR}${orderId}${KEY_SEPARATOR}${itemId}`;
}

// Key parsers
export function parseOrderSk(sk: string): { prefix: string; orderId: string } {
  const parts = sk.split(KEY_SEPARATOR);
  return {
    prefix: parts[0],
    orderId: parts[1],
  };
}

export function parseOrderItemSk(sk: string): {
  prefix: string;
  orderId: string;
  itemId: string;
} {
  const parts = sk.split(KEY_SEPARATOR);
  return {
    prefix: parts[0],
    orderId: parts[1],
    itemId: parts[2],
  };
}

// ID generator with entity type
export function generateEntityId(
  prefix: string,
  tenantCode: string,
  sk?: string,
): { pk: string; sk: string; id: string } {
  const pk = `${prefix}${KEY_SEPARATOR}${tenantCode}`;
  const finalSk = sk ?? ulid();
  const id = generateId(pk, finalSk);
  return { pk, sk: finalSk, id };
}
```

## Version Management

The framework uses versioning for optimistic locking:

```ts
// DynamoDB Tables
// Command table: Stores all versions with @version suffix
// Data table: Stores latest version only (no version suffix)

// Version in SK (Command table)
SK: ORDER#01HX7MBJK3V9WQBZ7XNDK5ZT2M@1  // Version 1
SK: ORDER#01HX7MBJK3V9WQBZ7XNDK5ZT2M@2  // Version 2
SK: ORDER#01HX7MBJK3V9WQBZ7XNDK5ZT2M@3  // Version 3

// Data table SK (no version suffix)
SK: ORDER#01HX7MBJK3V9WQBZ7XNDK5ZT2M
```

```ts
import {
  VERSION_FIRST,
  VERSION_LATEST,
  addSortKeyVersion,
  removeSortKeyVersion,
} from "@mbc-cqrs-serverless/core";

// Creating first version
const command = new OrderCommandDto({
  pk,
  sk,
  version: VERSION_FIRST, // 0
  // ...
});

// Reading specific version from history
const skWithVersion = addSortKeyVersion(baseSk, 2);
const historicalItem = await historyService.getItem({ pk, sk: skWithVersion });

// In Data Sync Handler - always remove version for RDS storage
async up(cmd: CommandModel): Promise<any> {
  const sk = removeSortKeyVersion(cmd.sk);
  // Store sk without version in RDS
}
```

## Query Patterns

### Query by PK

```ts
// Get all products for a tenant
const items = await dataService.listItemsByPk(
  `PRODUCT${KEY_SEPARATOR}${tenantCode}`,
);
```

### Query with SK Prefix

```ts
// Get all order items for a specific order
const items = await dataService.listItemsByPk(
  `ORDER${KEY_SEPARATOR}${tenantCode}`,
  {
    sk: {
      skExpession: 'begins_with(sk, :skPrefix)',
      skAttributeValues: { ':skPrefix': `ORDER_ITEM${KEY_SEPARATOR}${orderId}` },
    },
  },
);
```

### Query with SK Range

```ts
// Get orders within a date range (if using timestamp in SK)
const items = await dataService.listItemsByPk(
  `ORDER${KEY_SEPARATOR}${tenantCode}`,
  {
    sk: {
      skExpession: 'sk BETWEEN :start AND :end',
      skAttributeValues: { ':start': startDate, ':end': endDate },
    },
  },
);
```

## Best Practices

### 1. Use Consistent Prefixes

Define prefixes as constants:

```ts
// Good
export const PRODUCT_PK_PREFIX = "PRODUCT";
const pk = `${PRODUCT_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`;

// Avoid
const pk = `PRODUCT#${tenantCode}`; // Magic string
```

### 2. Use ULID for Sortable IDs

ULID provides both uniqueness and time-based sorting:

```ts
import { ulid } from "ulid";

const sk = ulid();
// Result: "01HX7MBJK3V9WQBZ7XNDK5ZT2M"
// Sortable by creation time
```

### 3. Design for Query Patterns

Structure keys based on how you'll query data:

```ts
// If you need to query all items for an order:
PK: ORDER#tenant001
SK: ORDER_ITEM#orderId#itemId  // Query by SK prefix

// If you need to query items by product across orders:
// Consider a GSI or separate table
```

### 4. Keep PK Cardinality Manageable

Avoid too many unique PKs to prevent hot partitions:

```ts
// Good - bounded by tenants
PK: PRODUCT#tenant001

// Avoid - unbounded by users
PK: USER_ACTIVITY#user123  // Could create millions of partitions
```

### 5. Include Tenant in PK

Always include tenant code in PK for multi-tenant isolation:

```ts
// Good
PK: PRODUCT#tenant001

// Avoid
PK: PRODUCT  // No tenant isolation
SK: tenant001#productId  // Tenant in SK is less efficient
```

### 6. Use Common Tenant for Shared Data

Use a common tenant code for data shared across tenants:

```ts
// User data (shared across tenants)
PK: USER#common
SK: sso#userId

// User-tenant association
PK: USER_TENANT#common
SK: tenant001#userId
```

## Anti-Patterns to Avoid

### 1. Embedding Too Much in Keys

```ts
// Avoid - too complex
SK: ORDER#2024-01-15#electronics#high-priority#01HX7M...

// Better - use attributes for filtering
SK: ORDER#01HX7MBJK3V9WQBZ7XNDK5ZT2M
attributes: {
  date: "2024-01-15",
  category: "electronics",
  priority: "high"
}
```

### 2. Using Mutable Data in Keys

```ts
// Avoid - status changes
SK: ORDER#pending#01HX7M...  // What happens when status changes?

// Better - use attributes
SK: ORDER#01HX7MBJK3V9WQBZ7XNDK5ZT2M
attributes: { status: "pending" }
```

### 3. Inconsistent Separators

```ts
// Avoid - mixed separators
SK: ORDER-01HX7M_item:001

// Better - consistent separator
SK: ORDER#01HX7M#ITEM#001
```

### 4. Version Suffix in Data Operations

```ts
// Avoid - including version in data table SK
await dataService.getItem({
  pk: "PRODUCT#tenant001",
  sk: "01HX7MBJK3V9WQBZ7XNDK5ZT2M@3"  // Version should not be here
});

// Better - always use removeSortKeyVersion
const cleanSk = removeSortKeyVersion(skWithVersion);
await dataService.getItem({ pk, sk: cleanSk });
```

## API Reference {#api-reference}

### Key Functions

| Function | Signature | Description |
|--------------|---------------|-----------------|
| `generateId` | `(pk: string, sk: string) => string` | Combines PK and SK into ID, removes version from SK |
| `getTenantCode` | `(pk: string) => string \| undefined` | Extracts tenant code from PK |
| `addSortKeyVersion` | `(sk: string, version: number) => string` | Adds version suffix to SK |
| `removeSortKeyVersion` | `(sk: string) => string` | Removes version suffix from SK |
| `getSortKeyVersion` | `(sk: string) => number` | Gets version number from SK (returns -1 if no version) |
| `masterPk` | `(tenantCode?: string) => string` | Generates MASTER#tenantCode PK |
| `seqPk` | `(tenantCode?: string) => string` | Generates SEQ#tenantCode PK |
| `ttlSk` | `(tableName: string) => string` | Generates TTL#tableName SK |

### Constants

| Constant | Value | Usage |
|--------------|-----------|-----------|
| `KEY_SEPARATOR` | `#` | Use for joining key components |
| `VER_SEPARATOR` | `@` | Used internally for version suffix |
| `VERSION_FIRST` | `0` | Use when creating new entities |
| `VERSION_LATEST` | `-1` | Returned when SK has no version |
| `TENANT_COMMON` | `common` | Use for cross-tenant shared data |
| `DEFAULT_TENANT_CODE` | `single` | Default for single-tenant mode |
