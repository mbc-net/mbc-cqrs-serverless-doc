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

:::tip 関連ドキュメント
- [エンティティ定義パターン](./entity-patterns.md) - これらのキーパターンを使用するエンティティの定義方法
- [マルチテナントパターン](./multi-tenant-patterns.md) - テナント分離とクロステナント操作
- [バックエンド開発ガイド](./backend-development.md) - 完全なモジュール実装パターン
:::

## このパターンが解決する問題

| 問題 | 解決策 |
|---------|----------|
| テナントの全アイテムをクエリするのが遅い | パーティションレベルの分離のためにPKにテナントコードを含める |
| すべてのキーを知らないと子アイテムをリストできない | 異なるSKプレフィックスで共有PKを使用する |
| IDが作成時間でソートできない | 一意性と時間ソートの両方を持つULIDを使用する |
| 同時更新でバージョン競合が発生する | SKのバージョンサフィックスで楽観的ロックを有効にする |

## パターン選択ガイド {#pattern-selection}

このデシジョンツリーを使用して、ユースケースに適したキーパターンを選択してください：

### デシジョンマトリックス

| 要件 | 推奨パターン | PK構造 | SK構造 |
|-----------------|------------------------|------------------|------------------|
| テナント分離を伴うシンプルなCRUD | [シンプルエンティティ](#pattern-1-simple-entity) | `ENTITY#tenantCode` | `ulid()` |
| 複数の子を持つ親 | [階層構造](#pattern-2-hierarchical-entity) | `PARENT#tenantCode` | `TYPE#parentId[#childId]` |
| 複数のエンティティバリアント | [複合SK](#pattern-3-user-with-multiple-auth-providers) | `ENTITY#tenantCode` | `variant#identifier` |
| クロステナント共有データ | [共通テナント](#pattern-4-multi-tenant-association) | `ENTITY#common` | `tenantCode#identifier` |
| カテゴリ別設定 | [マスターデータ](#pattern-5-master-data-with-categories) | `MASTER#tenantCode` | `TYPE#category#code` |
| 時間ベースのクエリ | [時系列](#pattern-6-time-series-data) | `LOG#tenantCode#YYYY-MM` | `timestamp#eventId` |

### デシジョンツリー

```
開始: どのような種類のデータを保存しますか？
│
├─ スタンドアロンエンティティ（商品、顧客）
│  └─ シンプルエンティティパターンを使用
│
├─ 親子関係（注文 → 明細）
│  └─ 子は独立したアクセスが必要ですか？
│     ├─ はい → 参照付きの別PKを使用
│     └─ いいえ → 階層パターン（共有PK）を使用
│
├─ 設定/マスターデータ
│  └─ マスターデータパターンを使用
│
├─ 時間ベースのイベント（ログ、監査）
│  └─ 時系列パターンを使用
│
└─ 複数のバリアントを持つユーザー/エンティティ
   └─ 複合SKパターンを使用
```

## キー構造の概要

フレームワークは一貫したキー構造を使用します：

```
PK = PREFIX#TENANT_CODE
SK = IDENTIFIER[@VERSION]
ID = PK#SK (without version)
```

`KEY_SEPARATOR`定数（`#`）はキーコンポーネントを区切るために使用されます。

### フレームワーク定数 {#framework-constants}

フレームワークは`@mbc-cqrs-serverless/core`で以下の定数を提供します：

| 定数 | 値 | 説明 |
|--------------|-----------|-----------------|
| `KEY_SEPARATOR` | `#` | キーコンポーネントを区切る（PKセグメント、SKセグメント、ID） |
| `VER_SEPARATOR` | `@` | ソートキーとバージョン番号を区切る |
| `VERSION_FIRST` | `0` | 新しいエンティティの初期バージョン |
| `VERSION_LATEST` | `-1` | 最新バージョンのクエリを示す |
| `TENANT_COMMON` | `common` | 共有/クロステナントデータ用のテナントコード |
| `DEFAULT_TENANT_CODE` | `single` | シングルテナントモードのデフォルトテナント |

:::tip 一貫したテナントコード形式
`@mbc-cqrs-serverless/master`と`@mbc-cqrs-serverless/tenant`パッケージは`SettingTypeEnum.TENANT_COMMON = 'common'`（小文字）を使用しており、`getUserContext()`のテナントコード正規化と一貫しています。これにより、`createCommonTenantSetting()`や`createCommonTenant()`メソッドで保存されたデータを正しくクエリできます。
:::

### 組み込みキージェネレーター {#built-in-generators}

フレームワークは以下の組み込みキージェネレーターを提供します：

```ts
import { masterPk, seqPk, ttlSk } from "@mbc-cqrs-serverless/core";

// マスターデータパーティションキー
masterPk("tenant001");      // "MASTER#tenant001"
masterPk();                 // "MASTER#single" (default tenant)

// シーケンスパーティションキー
seqPk("tenant001");         // "SEQ#tenant001"

// テーブルレベルTTL設定用のTTLソートキー
ttlSk("product");           // "TTL#product"
```

## 基本的なキー生成

コアパッケージからユーティリティをインポートします：

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
// SKにバージョンを追加
const skWithVersion = addSortKeyVersion(sk, 3);
// Result: "01HX7MBJK3V9WQBZ7XNDK5ZT2M@3"

// SKからバージョンを削除
const baseSk = removeSortKeyVersion(skWithVersion);
// Result: "01HX7MBJK3V9WQBZ7XNDK5ZT2M"

// SKからバージョン番号を取得
const version = getSortKeyVersion(skWithVersion);
// Result: 3

// バージョンサフィックスなしのSKからバージョンを取得
const latestVersion = getSortKeyVersion(sk);
// Result: -1 (VERSION_LATEST)
```

### テナントコード抽出

```ts
import { getTenantCode } from "@mbc-cqrs-serverless/core";

// PKからテナントコードを抽出
const tenantCode = getTenantCode("PRODUCT#tenant001");
// Result: "tenant001"

// セパレーターが見つからない場合はundefinedを返す
const noTenant = getTenantCode("PRODUCT");
// Result: undefined
```

## 一般的なキーパターン

### パターン1: シンプルなエンティティ {#pattern-1-simple-entity}

#### ユースケース: 商品カタログ

シナリオ: テナントに属する商品を一意のIDで保存します。

使用タイミング: 親子関係のないスタンドアロンエンティティ。

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

### パターン2: 階層エンティティ {#pattern-2-hierarchical-entity}

#### ユースケース: 明細付き注文

シナリオ: 注文には複数のアイテムが含まれます。注文のすべてのアイテムを効率的にクエリする必要があります。

解決策: 親と子の間でPKを共有し、SKプレフィックスでアイテムタイプを区別します。

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

### パターン3: 複数認証プロバイダーを持つユーザー {#pattern-3-user-with-multiple-auth-providers}

#### ユースケース: 統合ユーザーアイデンティティ

シナリオ: ユーザーはローカルパスワード、SSO、またはOAuthでサインインできます。すべての認証方法を1人のユーザーにリンクする必要があります。

解決策: すべてのユーザーレコードに同じPKを使用し、SKプレフィックスで認証プロバイダーを示します。

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

### パターン4: マルチテナント関連付け {#pattern-4-multi-tenant-association}

#### ユースケース: ユーザーが複数の組織に所属

シナリオ: SaaSアプリケーションでは、1人のユーザーが複数のテナント/組織に所属できます。

解決策: テナントコードとユーザーコードを組み合わせたSKを持つ共通テナントを使用します。

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

### パターン5: カテゴリ付きマスターデータ {#pattern-5-master-data-with-categories}

#### ユースケース: アプリケーション設定と構成

シナリオ: メールテンプレート、商品カテゴリ、アプリケーション設定を保存します。

解決策: SKにタイププレフィックス（SETTING、DATA）を使用して、異なる設定タイプを整理します。

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

### パターン6: 時系列データ {#pattern-6-time-series-data}

#### ユースケース: アクティビティログと監査証跡

シナリオ: 日付範囲でクエリする必要があるタイムスタンプ付きイベントを保存します。

解決策: 時間ベースのパーティショニングのためにPKに日付を含め、ソートのためにSKにタイムスタンプを含めます。

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

## クエリパターン

### PKによるクエリ

```ts
// Get all products for a tenant
const items = await dataService.listItemsByPk(
  `PRODUCT${KEY_SEPARATOR}${tenantCode}`,
);
```

### SKプレフィックスによるクエリ

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

### SK範囲によるクエリ

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

:::danger テナントコード正規化 - 破壊的変更
`getUserContext()`関数は`tenantCode`を小文字に正規化します。これはパーティションキー生成に影響します：

```ts
// ユーザーのCognitoには大文字のテナントがある
custom:tenant = "MY_TENANT"

// getUserContext()は小文字を返す
tenantCode = "my_tenant"

// 生成されたPKは小文字を使用
PK: PRODUCT#my_tenant
```

**既存データへの影響:** 既存のデータが大文字のテナントコードでPKに保存されている場合（例：`PRODUCT#MY_TENANT`）、正規化されたテナントコードを使用したクエリではそのデータを見つけることができません。

**マイグレーションが必要:** マイグレーション戦略については[テナントコード正規化マイグレーション](./data-migration-patterns#tenant-code-normalization-migration)を参照してください。
:::

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
// 避ける - 混在したセパレーター
SK: ORDER-01HX7M_item:001

// 良い - 一貫したセパレーター
SK: ORDER#01HX7M#ITEM#001
```

### 4. データ操作でのバージョンサフィックス

```ts
// 避ける - データテーブルSKにバージョンを含める
await dataService.getItem({
  pk: "PRODUCT#tenant001",
  sk: "01HX7MBJK3V9WQBZ7XNDK5ZT2M@3"  // バージョンはここにあるべきではない
});

// 良い - 常にremoveSortKeyVersionを使用
const cleanSk = removeSortKeyVersion(skWithVersion);
await dataService.getItem({ pk, sk: cleanSk });
```

## APIリファレンス {#api-reference}

### キー関数

| 関数 | シグネチャ | 説明 |
|--------------|---------------|-----------------|
| `generateId` | `(pk: string, sk: string) => string` | PKとSKをIDに結合し、SKからバージョンを削除 |
| `getTenantCode` | `(pk: string) => string \| undefined` | PKからテナントコードを抽出 |
| `addSortKeyVersion` | `(sk: string, version: number) => string` | SKにバージョンサフィックスを追加 |
| `removeSortKeyVersion` | `(sk: string) => string` | SKからバージョンサフィックスを削除 |
| `getSortKeyVersion` | `(sk: string) => number` | SKからバージョン番号を取得（バージョンがない場合は-1を返す） |
| `masterPk` | `(tenantCode?: string) => string` | MASTER#tenantCode PKを生成 |
| `seqPk` | `(tenantCode?: string) => string` | SEQ#tenantCode PKを生成 |
| `ttlSk` | `(tableName: string) => string` | TTL#tableName SKを生成 |

### 定数

| 定数 | 値 | 使用方法 |
|--------------|-----------|-----------|
| `KEY_SEPARATOR` | `#` | キーコンポーネントの結合に使用 |
| `VER_SEPARATOR` | `@` | バージョンサフィックスに内部的に使用 |
| `VERSION_FIRST` | `0` | 新しいエンティティ作成時に使用 |
| `VERSION_LATEST` | `-1` | SKにバージョンがない場合に返される |
| `TENANT_COMMON` | `common` | クロステナント共有データに使用 |
| `DEFAULT_TENANT_CODE` | `single` | シングルテナントモードのデフォルト |
