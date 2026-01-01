---
description: DynamoDBのパーティションキー（PK）とソートキー（SK）の設計パターンについて学びます。
---

# キー設計パターン

このガイドでは、DynamoDBにおけるエンティティのパーティションキー（PK）とソートキー（SK）の設計方法を説明します。適切なキー設計は、パフォーマンス、スケーラビリティ、クエリ効率にとって重要です。

## このガイドを使用するタイミング

以下が必要な場合にこのガイドを使用してください：

- 新しいエンティティタイプのキーを設計する
- 親子関係をモデル化する（Order → OrderItems）
- マルチテナントデータ分離をサポートする
- 効率的なクエリパターンを有効にする（テナント別リスト、日付フィルター）
- 楽観的ロック用のバージョニングを処理する

## このパターンが解決する問題

| 問題 | 解決策 |
|---------|----------|
| テナントの全アイテムをクエリするのが遅い | パーティションレベルの分離のためにPKにテナントコードを含める |
| すべてのキーを知らないと子アイテムをリストできない | 異なるSKプレフィックスで共有PKを使用する |
| IDが作成時間でソートできない | 一意性と時間ソートの両方を持つULIDを使用する |
| 同時更新でバージョン競合が発生する | SKのバージョンサフィックスで楽観的ロックを有効にする |

## キー構造の概要

フレームワークは一貫したキー構造を使用します：

```
PK = PREFIX#TENANT_CODE
SK = IDENTIFIER[#VERSION]
ID = PK#SK (without version)
```

`KEY_SEPARATOR`定数（`#`）はキーコンポーネントを区切るために使用されます。

## 基本的なキー生成

コアパッケージからユーティリティをインポートします：

```ts
import {
  generateId,
  KEY_SEPARATOR,
  removeSortKeyVersion,
  addSortKeyVersion,
  VERSION_FIRST,
} from "@mbc-cqrs-serverless/core";
import { ulid } from "ulid";
```

### キーの生成

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

### バージョン管理

```ts
// Add version to SK
const skWithVersion = addSortKeyVersion(sk, 3);
// Result: "01HX7MBJK3V9WQBZ7XNDK5ZT2M#v3"

// Remove version from SK
const baseSk = removeSortKeyVersion(skWithVersion);
// Result: "01HX7MBJK3V9WQBZ7XNDK5ZT2M"
```

## 一般的なキーパターン

### パターン1: シンプルなエンティティ

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

### パターン2: 階層エンティティ

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

### パターン3: 複数認証プロバイダーを持つユーザー

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

### パターン4: マルチテナント関連付け

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

### パターン5: カテゴリ付きマスターデータ

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

### パターン6: 時系列データ

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

## キーヘルパー関数

一貫したキー生成のためのヘルパーファイルを作成します：

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

## バージョン管理

フレームワークは楽観的ロックのためにバージョニングを使用します：

```ts
// DynamoDB Tables
// Command table: Stores all versions
// Data table: Stores latest version only
// History table: Stores all versions with @ suffix

// Version in SK
SK: ORDER#01HX7MBJK3V9WQBZ7XNDK5ZT2M#v1  // Version 1
SK: ORDER#01HX7MBJK3V9WQBZ7XNDK5ZT2M#v2  // Version 2
SK: ORDER#01HX7MBJK3V9WQBZ7XNDK5ZT2M#v3  // Version 3

// History table SK (uses @ instead of #)
SK: ORDER#01HX7MBJK3V9WQBZ7XNDK5ZT2M@v1
SK: ORDER#01HX7MBJK3V9WQBZ7XNDK5ZT2M@v2
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
  version: VERSION_FIRST, // 1
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

## クエリパターン

### PKによるクエリ

```ts
// Get all products for a tenant
const items = await dataService.listItemsByPk({
  pk: `PRODUCT${KEY_SEPARATOR}${tenantCode}`,
});
```

### SKプレフィックスによるクエリ

```ts
// Get all order items for a specific order
const items = await dataService.listItemsByPk({
  pk: `ORDER${KEY_SEPARATOR}${tenantCode}`,
  skPrefix: `ORDER_ITEM${KEY_SEPARATOR}${orderId}`,
});
```

### SK範囲によるクエリ

```ts
// Get orders within a date range (if using timestamp in SK)
const items = await dataService.query({
  pk: `ORDER${KEY_SEPARATOR}${tenantCode}`,
  sk: {
    between: [startDate, endDate],
  },
});
```

## ベストプラクティス

### 1. 一貫したプレフィックスを使用する

プレフィックスを定数として定義します：

```ts
// Good
export const PRODUCT_PK_PREFIX = "PRODUCT";
const pk = `${PRODUCT_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`;

// Avoid
const pk = `PRODUCT#${tenantCode}`; // Magic string
```

### 2. ソート可能なIDにはULIDを使用する

ULIDは一意性と時間ベースのソートの両方を提供します：

```ts
import { ulid } from "ulid";

const sk = ulid();
// Result: "01HX7MBJK3V9WQBZ7XNDK5ZT2M"
// Sortable by creation time
```

### 3. クエリパターンに合わせた設計

データのクエリ方法に基づいてキーを構造化します：

```ts
// If you need to query all items for an order:
PK: ORDER#tenant001
SK: ORDER_ITEM#orderId#itemId  // Query by SK prefix

// If you need to query items by product across orders:
// Consider a GSI or separate table
```

### 4. PKのカーディナリティを管理可能に保つ

ホットパーティションを防ぐために、ユニークなPKが多すぎないようにします：

```ts
// Good - bounded by tenants
PK: PRODUCT#tenant001

// Avoid - unbounded by users
PK: USER_ACTIVITY#user123  // Could create millions of partitions
```

### 5. PKにテナントを含める

マルチテナント分離のために、常にPKにテナントコードを含めます：

```ts
// Good
PK: PRODUCT#tenant001

// Avoid
PK: PRODUCT  // No tenant isolation
SK: tenant001#productId  // Tenant in SK is less efficient
```

### 6. 共有データには共通テナントを使用する

テナント間で共有されるデータには共通テナントコードを使用します：

```ts
// User data (shared across tenants)
PK: USER#common
SK: sso#userId

// User-tenant association
PK: USER_TENANT#common
SK: tenant001#userId
```

## 避けるべきアンチパターン

### 1. キーに情報を詰め込みすぎる

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

### 2. キーに可変データを使用する

```ts
// Avoid - status changes
SK: ORDER#pending#01HX7M...  // What happens when status changes?

// Better - use attributes
SK: ORDER#01HX7MBJK3V9WQBZ7XNDK5ZT2M
attributes: { status: "pending" }
```

### 3. 一貫性のないセパレーター

```ts
// Avoid - mixed separators
SK: ORDER-01HX7M_item:001

// Better - consistent separator
SK: ORDER#01HX7M#ITEM#001
```
