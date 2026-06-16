---
description: MBC CQRS Serverlessで利用可能なヘルパー関数のリファレンスガイド。
---

# ヘルパー関数

フレームワークは一般的な操作のための様々なヘルパー関数を提供します。

## キーヘルパー {#key-helpers}

DynamoDBキーを操作するための関数。

### `addSortKeyVersion(sk: string, version: number): string`

ソートキーにバージョンサフィックスを追加します。

```ts
import { addSortKeyVersion } from '@mbc-cqrs-serverless/core';

const versionedSk = addSortKeyVersion('CAT#001', 1);
// Result: 'CAT#001@1' (結果: 'CAT#001@1')
```

### `getSortKeyVersion(sk: string): number`

ソートキーからバージョン番号を抽出します。バージョンサフィックスがない場合はVERSION_LATESTを返します。

```ts
import { getSortKeyVersion } from '@mbc-cqrs-serverless/core';

const version = getSortKeyVersion('CAT#001@3');
// Result: 3 (結果: 3)

const latestVersion = getSortKeyVersion('CAT#001');
// Result: VERSION_LATEST (-1) (結果: VERSION_LATEST (-1))
```

### `removeSortKeyVersion(sk: string): string`

ソートキーからバージョンサフィックスを削除します。

```ts
import { removeSortKeyVersion } from '@mbc-cqrs-serverless/core';

const sk = removeSortKeyVersion('CAT#001@3');
// Result: 'CAT#001' (結果: 'CAT#001')
```

### `generateId(pk: string, sk: string): string`

パーティションキーとソートキー（バージョンなし）を組み合わせて一意のIDを生成します。

```ts
import { generateId } from '@mbc-cqrs-serverless/core';

const id = generateId('TENANT#mbc', 'CAT#001@3');
// Result: 'TENANT#mbc#CAT#001' (結果: 'TENANT#mbc#CAT#001')
```

### `sortKeyBaseFromId(pk: string, itemId: string): string | undefined`

`generateId` の逆操作: 複合IDからベースとなるソートキーを抽出します。IDが指定したパーティションキーで始まらない場合は `undefined` を返します。

```ts
import { sortKeyBaseFromId } from '@mbc-cqrs-serverless/core';

const skBase = sortKeyBaseFromId('TENANT#mbc', 'TENANT#mbc#CAT#001');
// Result: 'CAT#001' (結果: 'CAT#001')
```

### `parseTwoSegmentPkSkFromId(itemId: string): { pk: string; skBase: string } | undefined`

複合IDをパーティションキーとベースソートキーに分割します。パーティションキーが2セグメント（タイプとテナントコード）であることを前提とします。IDのセグメントが3つ未満の場合は `undefined` を返します。

```ts
import { parseTwoSegmentPkSkFromId } from '@mbc-cqrs-serverless/core';

const result = parseTwoSegmentPkSkFromId('TENANT#mbc#CAT#001');
// result.pk is 'TENANT#mbc' and result.skBase is 'CAT#001' (result.pk は 'TENANT#mbc'、result.skBase は 'CAT#001' になります)
```

### `getTenantCode(pk: string): string | undefined`

パーティションキーからテナントコードを抽出します。

```ts
import { getTenantCode } from '@mbc-cqrs-serverless/core';

const tenantCode = getTenantCode('TENANT#mbc');
// Result: 'mbc' (結果: 'mbc')
```

### `masterPk(tenantCode?: string): string`

マスターデータ用のパーティションキーを生成します。

```ts
import { masterPk } from '@mbc-cqrs-serverless/core';

const pk = masterPk('mbc');
// Result: 'MASTER#mbc' (結果: 'MASTER#mbc')

const commonPk = masterPk();
// Result: 'MASTER#single' (結果: 'MASTER#single') (DEFAULT_TENANT_CODE)
```

### `seqPk(tenantCode?: string): string`

シーケンス用のパーティションキーを生成します。

```ts
import { seqPk } from '@mbc-cqrs-serverless/core';

const pk = seqPk('mbc');
// Result: 'SEQ#mbc' (結果: 'SEQ#mbc')
```

### `ttlSk(tableName: string): string`

テーブル用のTTLソートキーを生成します。TTL関連のレコードを識別するために使用されます。

```ts
import { ttlSk } from '@mbc-cqrs-serverless/core';

const sk = ttlSk('my-table');
// Result: 'TTL#my-table' (結果: 'TTL#my-table')
```

## S3属性ヘルパー {#s3-attribute-helpers}

S3 URI属性を操作するための関数。

### `isS3AttributeKey(attributes: any): boolean`

属性値がS3 URIかどうかを確認します。

```ts
import { isS3AttributeKey } from '@mbc-cqrs-serverless/core';

const isS3 = isS3AttributeKey('s3://my-bucket/path/to/file.pdf');
// Result: true (結果: true)

const isNotS3 = isS3AttributeKey('regular string');
// Result: false (結果: false)
```

### `toS3AttributeKey(bucket: string, key: string): string`

バケットとキーからS3 URIを作成します。

```ts
import { toS3AttributeKey } from '@mbc-cqrs-serverless/core';

const s3Uri = toS3AttributeKey('my-bucket', 'path/to/file.pdf');
// Result: 's3://my-bucket/path/to/file.pdf' (結果: 's3://my-bucket/path/to/file.pdf')
```

### `parseS3AttributeKey(s3Uri: string): { bucket: string; key: string }`

S3 URIをバケットとキーのコンポーネントに解析します。

```ts
import { parseS3AttributeKey } from '@mbc-cqrs-serverless/core';

const { bucket, key } = parseS3AttributeKey('s3://my-bucket/path/to/file.pdf');
// bucket: 'my-bucket', key: 'path/to/file.pdf'
```

## コンテキストヘルパー {#context-helpers}

呼び出しコンテキストとユーザー情報を操作するための関数。

### `getUserContext(ctx: IInvoke | ExecutionContext): UserContext`

呼び出しコンテキストからユーザーコンテキストを抽出します。userId、tenantCode、tenantRole、tenantRoles、tenantGroupIdsを返します。

```ts
import { getUserContext } from '@mbc-cqrs-serverless/core';

const userContext = getUserContext(invokeContext);
// Returns: (戻り値:) { userId: '...', tenantCode: 'mbc', tenantRole: 'admin', tenantRoles: ['admin'], tenantGroupIds: [] }
```

### `extractInvokeContext(ctx?: ExecutionContext): IInvoke`

NestJS実行コンテキストから呼び出しコンテキストを抽出します。Lambdaとローカル開発環境の両方をサポートします。

```ts
import { extractInvokeContext } from '@mbc-cqrs-serverless/core';
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class MyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const invokeContext = extractInvokeContext(ctx);
    // Use ctx for further operations (ctxを後続の操作に使用)
    return true;
  }
}
```

### `getAuthorizerClaims(ctx: IInvoke): JwtClaims`

呼び出しコンテキストのオーソライザーからJWTクレームを抽出します。

```ts
import { getAuthorizerClaims } from '@mbc-cqrs-serverless/core';

const claims = getAuthorizerClaims(invokeContext);
// Returns JWT claims including sub, email, custom:tenant, etc. (sub、email、custom:tenantなどを含むJWTクレームを返します)
```

## UserContextクラス {#usercontext-class}

```ts
class UserContext {
  userId: string;            // User's unique identifier (sub claim) (ユーザーの一意識別子（subクレーム）)
  tenantCode: string;        // Current tenant code (現在のテナントコード)
  tenantRole: string;        // User's role in the current tenant (現在のテナントでのユーザーの役割)
  tenantRoles: string[];     // Direct roles for the active tenant (excludes group-derived roles) (アクティブテナントの直接ロール、グループ由来ロールを除く)
  tenantGroupIds: string[];  // Group IDs from custom:groups for the active tenant (custom:groups由来のグループID)

  constructor(partial: Partial<UserContext>);
}
```

:::info バージョンノート
[バージョン1.3.1](/docs/changelog#v131)でグループベースのロール認可の一部として `UserContext` に `tenantRoles` と `tenantGroupIds` が追加されました。後方互換性のため `tenantRole`（単数形）は維持されています。使用方法については [認証 — グループベースのロール](/docs/authentication#group-based-roles) を参照してください。
:::

## JwtClaimsインターフェース {#jwt-claims}

```ts
interface JwtClaims {
  sub: string;                     // User's unique identifier (ユーザーの一意識別子)
  iss: string;                     // Token issuer URL (トークン発行者URL)
  username?: string;               // Username (ユーザー名)
  'cognito:groups'?: string[];     // Cognito user groups (Cognitoユーザーグループ)
  'cognito:username': string;      // Cognito username (Cognitoユーザー名)
  origin_jti?: string;             // Original JWT ID (元のJWT ID)
  client_id?: string;              // OAuth client ID (OAuthクライアントID)
  scope?: string;                  // OAuth scopes (OAuthスコープ)
  aud: string;                     // Token audience (トークンオーディエンス)
  event_id: string;                // Cognito event ID (Cognitoイベント ID)
  token_use: string;               // Token type (access/id) (トークンタイプ（access/id）)
  auth_time: number;               // Authentication timestamp (認証タイムスタンプ)
  name: string;                    // User's name (ユーザー名)
  'custom:tenant'?: string;        // User's default tenant code (ユーザーのデフォルトテナントコード)
  'custom:roles'?: string;         // JSON array of tenant roles (テナントロールのJSON配列)
  'custom:groups'?: string;        // JSON array of TenantGroupMembership (TenantGroupMembership のJSON配列)
  exp: number;                     // Expiration timestamp (有効期限タイムスタンプ)
  email: string;                   // User's email address (ユーザーのメールアドレス)
  email_verified?: boolean;        // Email verification status (メール検証ステータス)
  iat: number;                     // Issued at timestamp (発行タイムスタンプ)
  jti: string;                     // JWT ID
}
```

## 日時ヘルパー {#datetime-helpers}

日付とISO文字列を操作するための関数。

### `toISOString(date: Date): string | undefined`

DateをISO文字列形式に変換します。dateがnull/undefinedの場合はundefinedを返します。

```ts
import { toISOString } from '@mbc-cqrs-serverless/core';

const isoString = toISOString(new Date('2024-01-15T10:30:00Z'));
// Result: '2024-01-15T10:30:00.000Z' (結果: '2024-01-15T10:30:00.000Z')
```

### `toISOStringWithTimezone(date: Date): string | undefined`

Dateをタイムゾーンオフセット付きのISO文字列形式に変換します。dateがnull/undefinedの場合はundefinedを返します。

```ts
import { toISOStringWithTimezone } from '@mbc-cqrs-serverless/core';

const isoString = toISOStringWithTimezone(new Date('2024-01-15T10:30:00'));
// Result: '2024-01-15T10:30:00+09:00' (in JST timezone) (結果: '2024-01-15T10:30:00+09:00'（JSTタイムゾーンの場合）)
```

### `isISOString(val: string): boolean`

文字列が有効なISO日付文字列かどうかを確認します。

```ts
import { isISOString } from '@mbc-cqrs-serverless/core';

isISOString('2024-01-15T10:30:00.000Z'); // true
isISOString('2024-01-15');               // false
isISOString('invalid');                  // false
```

### `isISOStringWithTimezone(val: string): boolean`

文字列がタイムゾーン付きの有効なISO日付文字列かどうかを確認します。

```ts
import { isISOStringWithTimezone } from '@mbc-cqrs-serverless/core';

isISOStringWithTimezone('2024-01-15T10:30:00+09:00'); // true
isISOStringWithTimezone('2024-01-15T10:30:00.000Z'); // false
```

## イベントタイプヘルパー {#event-type-helpers}

AWSイベントソースARNを操作するための関数。

### `getEventTypeFromArn(source: string): string | null`

AWS ARNからイベントタイプを抽出します。'sqs'、'sns'、'dynamodb'、'event-bridge'、またはnullを返します。

```ts
import { getEventTypeFromArn } from '@mbc-cqrs-serverless/core';

const eventType = getEventTypeFromArn('arn:aws:dynamodb:ap-northeast-1:123456789:table/my-table/stream/...');
// Result: 'dynamodb' (結果: 'dynamodb')

const sqsType = getEventTypeFromArn('arn:aws:sqs:ap-northeast-1:123456789:my-queue');
// Result: 'sqs' (結果: 'sqs')
```

### `getResourceNameFromArn(source: string): string`

AWS ARNからリソース名を抽出します。

```ts
import { getResourceNameFromArn } from '@mbc-cqrs-serverless/core';

const tableName = getResourceNameFromArn('arn:aws:dynamodb:ap-northeast-1:123456789:table/my-table/stream/...');
// Result: 'my-table' (結果: 'my-table')

const queueName = getResourceNameFromArn('arn:aws:sqs:ap-northeast-1:123456789:my-queue');
// Result: 'my-queue' (結果: 'my-queue')
```

## オブジェクトヘルパー {#object-helpers}

オブジェクトを操作するための関数。

### `isObject(item: any): boolean`

値がプレーンオブジェクト（配列ではなく、nullでもない）かどうかを確認します。

```ts
import { isObject } from '@mbc-cqrs-serverless/core';

isObject({ key: 'value' }); // true
isObject([1, 2, 3]);        // false
isObject(null);             // false
isObject('string');         // false
```

### `mergeDeep(target: any, ...sources: any[]): any`

元のオブジェクトを変更せずにオブジェクトをディープマージします。

```ts
import { mergeDeep } from '@mbc-cqrs-serverless/core';

const result = mergeDeep(
  { a: 1, b: { c: 2 } },
  { b: { d: 3 }, e: 4 }
);
// Result: (結果:) { a: 1, b: { c: 2, d: 3 }, e: 4 }
```

### `objectBytes(obj: any): number`

JSONシリアライズされたオブジェクトのバイトサイズを計算します。

```ts
import { objectBytes } from '@mbc-cqrs-serverless/core';

const size = objectBytes({ name: 'test', value: 123 });
// Result: byte size of JSON string (結果: JSON文字列のバイトサイズ)
```

### `pickKeys(obj: any, keys: string[]): object`

指定されたキーのみを含む新しいオブジェクトを作成します。

```ts
import { pickKeys } from '@mbc-cqrs-serverless/core';

const result = pickKeys({ a: 1, b: 2, c: 3 }, ['a', 'c']);
// Result: (結果:) { a: 1, c: 3 }
```

### `omitKeys(obj: any, keys: string[]): object`

指定されたキーを除外した新しいオブジェクトを作成します。

```ts
import { omitKeys } from '@mbc-cqrs-serverless/core';

const result = omitKeys({ a: 1, b: 2, c: 3 }, ['b']);
// Result: (結果:) { a: 1, c: 3 }
```

## シリアライザーヘルパー {#serializer-helpers}

内部DynamoDB構造と外部フラット構造間の変換を行う関数。

### SerializerOptionsインターフェース

```ts
interface SerializerOptions {
  keepAttributes?: boolean;  // Reserved for future use (将来の使用のために予約)
  flattenDepth?: number;     // Reserved for future use (将来の使用のために予約)
}
```

:::note
`SerializerOptions`インターフェースは将来の拡張性のために定義されていますが、現在この関数では使用されていません。関数は常にattributesをトップレベルにフラット化します。
:::

### `serializeToExternal<T extends CommandEntity | DataEntity>(item: T | null | undefined, options?: SerializerOptions): Record<string, any> | null`

内部DynamoDBエンティティを外部フラット構造に変換します。attributesオブジェクトをルートレベルにフラット化します。入力がnullまたはundefinedの場合はnullを返します。

```ts
import { serializeToExternal } from '@mbc-cqrs-serverless/core';

const entity = {
  pk: 'TENANT#mbc',
  sk: 'CAT#001',
  id: 'TENANT#mbc#CAT#001',
  code: '001',
  name: 'Category 1',
  version: 1,
  tenantCode: 'mbc',
  type: 'CAT',
  isDeleted: false,
  attributes: { color: 'red', size: 'large' }
};

const external = serializeToExternal(entity);
// Result: (結果:)
// {
//   id: 'TENANT#mbc#CAT#001',
//   pk: 'TENANT#mbc',
//   sk: 'CAT#001',
//   code: '001',
//   name: 'Category 1',
//   version: 1,
//   tenantCode: 'mbc',
//   type: 'CAT',
//   isDeleted: false,
//   color: 'red',        // Flattened from attributes (attributesからフラット化)
//   size: 'large'        // Flattened from attributes (attributesからフラット化)
// }
```

### `deserializeToInternal<T extends CommandEntity | DataEntity>(data: Record<string, any> | null | undefined, EntityClass: new () => T): T | null`

外部フラット構造を内部DynamoDBエンティティ構造に変換します。入力がnullまたはundefinedの場合はnullを返します。

```ts
import { deserializeToInternal, DataEntity } from '@mbc-cqrs-serverless/core';

const external = {
  id: 'TENANT#mbc#CAT#001',
  name: 'Category 1',
  color: 'red',
  size: 'large'
};

const entity = deserializeToInternal(external, DataEntity);
// Result: DataEntity with pk, sk, name, and attributes: (結果: DataEntity（pk, sk, name, attributes: \{ color, size \}）) { color, size }
```

## ソースヘルパー {#source-helper}

コマンドソース識別子を生成する関数。

### `getCommandSource(moduleName: string, controllerName: string, method: string): string`

コマンド用の標準化されたソース文字列を生成します。

```ts
import { getCommandSource } from '@mbc-cqrs-serverless/core';

const source = getCommandSource('CatalogModule', 'CatalogController', 'create');
// Result: '[CatalogModule]:CatalogController.create' (結果: '[CatalogModule]:CatalogController.create')
```

## 定数 {#constants}

### `VERSION_FIRST: number`

`0` に等しい定数。新規エンティティを初めて作成する際の `version` フィールドに使用します。

```ts
import { VERSION_FIRST } from '@mbc-cqrs-serverless/core';

const command = {
  pk,
  sk,
  name: dto.name,
  version: VERSION_FIRST, // New entity: version starts at 0 (新規エンティティ: バージョンは0から開始)
};
```

### `VERSION_LATEST: number`

`-1` に等しい定数。楽観的ロックをバイパスする（常に上書き）際の `version` フィールドに使用します。バージョンサフィックスがない場合に `getSortKeyVersion()` が返す値です。

```ts
import { VERSION_LATEST } from '@mbc-cqrs-serverless/core';

const command = {
  pk,
  sk,
  name: dto.name,
  version: VERSION_LATEST, // Bypass optimistic locking (楽観的ロックをバイパス)
};
```

:::caution
`VERSION_LATEST` を使用すると楽観的ロックがバイパスされるため、複数クライアントからの並行書き込みが互いを無音で上書きします。同一エンティティへの並行書き込みが発生しない場合にのみ使用してください（例：システム専用のバックグラウンドジョブ、TTL管理レコード、初期データ投入）。
:::

### `IS_LAMBDA_RUNNING: boolean`

コードがAWS Lambda環境で実行されているかどうかを示す定数。

```ts
import { IS_LAMBDA_RUNNING } from '@mbc-cqrs-serverless/core';

if (IS_LAMBDA_RUNNING) {
  // Lambda-specific logic (Lambda固有のロジック)
} else {
  // Local development logic (ローカル開発ロジック)
}
```

## 関連ドキュメント

- [キーパターン](/docs/key-patterns) - DynamoDBキー設計
- [コマンドサービス](/docs/command-service) - キーヘルパーの使用
- [インターフェース](/docs/interfaces) - UserContextとIInvokeインターフェース
- [認証](/docs/authentication) - UserContextにおけるJWTクレームとロールベースアクセス
