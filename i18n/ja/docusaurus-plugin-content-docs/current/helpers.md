---
description: MBC CQRS Serverlessで利用可能なヘルパー関数のリファレンスガイド。
---

# ヘルパー関数

フレームワークは一般的な操作のための様々なヘルパー関数を提供します。

## キーヘルパー

DynamoDBキーを操作するための関数。

### `addSortKeyVersion(sk: string, version: number): string`

ソートキーにバージョンサフィックスを追加します。

```ts
import { addSortKeyVersion } from '@mbc-cqrs-serverless/core';

const versionedSk = addSortKeyVersion('CAT#001', 1);
// 結果: 'CAT#001@1'
```

### `getSortKeyVersion(sk: string): number`

ソートキーからバージョン番号を抽出します。バージョンサフィックスがない場合はVERSION_LATESTを返します。

```ts
import { getSortKeyVersion } from '@mbc-cqrs-serverless/core';

const version = getSortKeyVersion('CAT#001@3');
// 結果: 3

const latestVersion = getSortKeyVersion('CAT#001');
// 結果: VERSION_LATEST (-1)
```

### `removeSortKeyVersion(sk: string): string`

ソートキーからバージョンサフィックスを削除します。

```ts
import { removeSortKeyVersion } from '@mbc-cqrs-serverless/core';

const sk = removeSortKeyVersion('CAT#001@3');
// 結果: 'CAT#001'
```

### `generateId(pk: string, sk: string): string`

パーティションキーとソートキー（バージョンなし）を組み合わせて一意のIDを生成します。

```ts
import { generateId } from '@mbc-cqrs-serverless/core';

const id = generateId('TENANT#mbc', 'CAT#001@3');
// 結果: 'TENANT#mbc#CAT#001'
```

### `getTenantCode(pk: string): string | undefined`

パーティションキーからテナントコードを抽出します。

```ts
import { getTenantCode } from '@mbc-cqrs-serverless/core';

const tenantCode = getTenantCode('TENANT#mbc');
// 結果: 'mbc'
```

### `masterPk(tenantCode?: string): string`

マスターデータ用のパーティションキーを生成します。

```ts
import { masterPk } from '@mbc-cqrs-serverless/core';

const pk = masterPk('mbc');
// 結果: 'MASTER#mbc'

const commonPk = masterPk();
// 結果: 'MASTER#single' (DEFAULT_TENANT_CODE)
```

### `seqPk(tenantCode?: string): string`

シーケンス用のパーティションキーを生成します。

```ts
import { seqPk } from '@mbc-cqrs-serverless/core';

const pk = seqPk('mbc');
// 結果: 'SEQ#mbc'
```

## S3属性ヘルパー

S3 URI属性を操作するための関数。

### `isS3AttributeKey(attributes: any): boolean`

属性値がS3 URIかどうかを確認します。

```ts
import { isS3AttributeKey } from '@mbc-cqrs-serverless/core';

const isS3 = isS3AttributeKey('s3://my-bucket/path/to/file.pdf');
// 結果: true

const isNotS3 = isS3AttributeKey('regular string');
// 結果: false
```

### `toS3AttributeKey(bucket: string, key: string): string`

バケットとキーからS3 URIを作成します。

```ts
import { toS3AttributeKey } from '@mbc-cqrs-serverless/core';

const s3Uri = toS3AttributeKey('my-bucket', 'path/to/file.pdf');
// 結果: 's3://my-bucket/path/to/file.pdf'
```

### `parseS3AttributeKey(s3Uri: string): { bucket: string; key: string }`

S3 URIをバケットとキーのコンポーネントに解析します。

```ts
import { parseS3AttributeKey } from '@mbc-cqrs-serverless/core';

const { bucket, key } = parseS3AttributeKey('s3://my-bucket/path/to/file.pdf');
// bucket: 'my-bucket', key: 'path/to/file.pdf'
```

## コンテキストヘルパー

呼び出しコンテキストとユーザー情報を操作するための関数。

### `getUserContext(ctx: IInvoke | ExecutionContext): UserContext`

呼び出しコンテキストからユーザーコンテキストを抽出します。userId、tenantCode、tenantRoleを返します。

```ts
import { getUserContext } from '@mbc-cqrs-serverless/core';

const userContext = getUserContext(invokeContext);
// {{Returns: { userId: '...', tenantCode: 'mbc', tenantRole: 'admin' }}}
```

### `extractInvokeContext(ctx?: ExecutionContext): IInvoke`

NestJS実行コンテキストから呼び出しコンテキストを抽出します。Lambdaとローカル開発環境の両方をサポートします。

```ts
import { extractInvokeContext } from '@mbc-cqrs-serverless/core';

@Get()
async getItem(@Req() request: Request) {
  const ctx = extractInvokeContext(this.executionContext);
  // ctxを後続の操作に使用
}
```

### `getAuthorizerClaims(ctx: IInvoke): JwtClaims`

呼び出しコンテキストのオーソライザーからJWTクレームを抽出します。

```ts
import { getAuthorizerClaims } from '@mbc-cqrs-serverless/core';

const claims = getAuthorizerClaims(invokeContext);
// sub、email、custom:tenantなどを含むJWTクレームを返します
```

## UserContextインターフェース

```ts
interface UserContext {
  userId: string;      // ユーザーの一意識別子（subクレーム）
  tenantCode: string;  // 現在のテナントコード
  tenantRole: string;  // 現在のテナントでのユーザーの役割
}
```

## JwtClaimsインターフェース

```ts
interface JwtClaims {
  sub: string;                     // ユーザーの一意識別子
  email: string;                   // ユーザーのメールアドレス
  name: string;                    // ユーザー名
  username: string;                // ユーザー名
  'custom:tenant'?: string;        // ユーザーのデフォルトテナントコード
  'custom:roles'?: string;         // テナントロールのJSON配列
  'cognito:groups'?: string[];     // Cognitoユーザーグループ
  'cognito:username': string;      // Cognitoユーザー名
  iss: string;                     // トークン発行者URL
  client_id: string;               // OAuthクライアントID
  origin_jti: string;              // 元のJWT ID
  event_id: string;                // Cognitoイベント ID
  token_use: string;               // トークンタイプ（access/id）
  scope: string;                   // OAuthスコープ
  auth_time: number;               // 認証タイムスタンプ
  exp: number;                     // 有効期限タイムスタンプ
  iat: number;                     // 発行タイムスタンプ
  jti: string;                     // JWT ID
  email_verified?: boolean;        // メール検証ステータス
}
```

## 日時ヘルパー

日付とISO文字列を操作するための関数。

### `toISOString(date: Date): string | undefined`

DateをISO文字列形式に変換します。dateがnull/undefinedの場合はundefinedを返します。

```ts
import { toISOString } from '@mbc-cqrs-serverless/core';

const isoString = toISOString(new Date('2024-01-15T10:30:00Z'));
// 結果: '2024-01-15T10:30:00.000Z'
```

### `toISOStringWithTimezone(date: Date): string | undefined`

Dateをタイムゾーンオフセット付きのISO文字列形式に変換します。dateがnull/undefinedの場合はundefinedを返します。

```ts
import { toISOStringWithTimezone } from '@mbc-cqrs-serverless/core';

const isoString = toISOStringWithTimezone(new Date('2024-01-15T10:30:00'));
// 結果: '2024-01-15T10:30:00+09:00'（JSTタイムゾーンの場合）
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

## イベントタイプヘルパー

AWSイベントソースARNを操作するための関数。

### `getEventTypeFromArn(source: string): string | null`

AWS ARNからイベントタイプを抽出します。'sqs'、'sns'、'dynamodb'、'event-bridge'、またはnullを返します。

```ts
import { getEventTypeFromArn } from '@mbc-cqrs-serverless/core';

const eventType = getEventTypeFromArn('arn:aws:dynamodb:ap-northeast-1:123456789:table/my-table/stream/...');
// 結果: 'dynamodb'

const sqsType = getEventTypeFromArn('arn:aws:sqs:ap-northeast-1:123456789:my-queue');
// 結果: 'sqs'
```

### `getResourceNameFromArn(source: string): string`

AWS ARNからリソース名を抽出します。

```ts
import { getResourceNameFromArn } from '@mbc-cqrs-serverless/core';

const tableName = getResourceNameFromArn('arn:aws:dynamodb:ap-northeast-1:123456789:table/my-table/stream/...');
// 結果: 'my-table'

const queueName = getResourceNameFromArn('arn:aws:sqs:ap-northeast-1:123456789:my-queue');
// 結果: 'my-queue'
```

## オブジェクトヘルパー

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
// {{Result: { a: 1, b: { c: 2, d: 3 }, e: 4 }}}
```

### `objectBytes(obj: any): number`

JSONシリアライズされたオブジェクトのバイトサイズを計算します。

```ts
import { objectBytes } from '@mbc-cqrs-serverless/core';

const size = objectBytes({ name: 'test', value: 123 });
// 結果: JSON文字列のバイトサイズ
```

### `pickKeys(obj: any, keys: string[]): object`

指定されたキーのみを含む新しいオブジェクトを作成します。

```ts
import { pickKeys } from '@mbc-cqrs-serverless/core';

const result = pickKeys({ a: 1, b: 2, c: 3 }, ['a', 'c']);
// {{Result: { a: 1, c: 3 }}}
```

### `omitKeys(obj: any, keys: string[]): object`

指定されたキーを除外した新しいオブジェクトを作成します。

```ts
import { omitKeys } from '@mbc-cqrs-serverless/core';

const result = omitKeys({ a: 1, b: 2, c: 3 }, ['b']);
// {{Result: { a: 1, c: 3 }}}
```

## シリアライザーヘルパー

内部DynamoDB構造と外部フラット構造間の変換を行う関数。

### SerializerOptionsインターフェース

```ts
interface SerializerOptions {
  keepAttributes?: boolean;  // フラット化せずにattributesオブジェクトを保持（デフォルト: false）
  flattenDepth?: number;     // ネストされたオブジェクトをフラット化する深さ（デフォルト: 1）
}
```

### `serializeToExternal<T>(item: T, options?: SerializerOptions): Record<string, any> | null`

内部DynamoDBエンティティを外部フラット構造に変換します。attributesオブジェクトをルートレベルにフラット化します。

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
// 結果:
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
//   color: 'red',        // attributesからフラット化
//   size: 'large'        // attributesからフラット化
// }
```

### `deserializeToInternal<T>(data: Record<string, any>, EntityClass: new () => T): T | null`

外部フラット構造を内部DynamoDBエンティティ構造に変換します。

```ts
import { deserializeToInternal, DataEntity } from '@mbc-cqrs-serverless/core';

const external = {
  id: 'TENANT#mbc#CAT#001',
  name: 'Category 1',
  color: 'red',
  size: 'large'
};

const entity = deserializeToInternal(external, DataEntity);
// {{Result: DataEntity with pk, sk, name, and attributes: { color, size }}}
```

## ソースヘルパー

コマンドソース識別子を生成する関数。

### `getCommandSource(moduleName: string, controllerName: string, method: string): string`

コマンド用の標準化されたソース文字列を生成します。

```ts
import { getCommandSource } from '@mbc-cqrs-serverless/core';

const source = getCommandSource('CatalogModule', 'CatalogController', 'create');
// 結果: '[CatalogModule]:CatalogController.create'
```

## 定数

### `IS_LAMBDA_RUNNING: boolean`

コードがAWS Lambda環境で実行されているかどうかを示す定数。

```ts
import { IS_LAMBDA_RUNNING } from '@mbc-cqrs-serverless/core';

if (IS_LAMBDA_RUNNING) {
  // Lambda固有のロジック
} else {
  // ローカル開発ロジック
}
```

## 関連情報

- [コマンドサービス](./command-service) - コマンド操作でのヘルパーの使用
- [データサービス](./data-service) - データクエリでのヘルパーの使用
