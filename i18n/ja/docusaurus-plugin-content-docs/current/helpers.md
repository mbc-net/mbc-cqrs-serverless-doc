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
// 結果: VERSION_LATEST (Number.MAX_SAFE_INTEGER)
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
// 結果: 'MASTER#COMMON'
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
// 戻り値: { userId: '...', tenantCode: 'mbc', tenantRole: 'admin' }
```

### `extractInvokeContext(ctx?: ExecutionContext): IInvoke`

NestJS実行コンテキストから呼び出しコンテキストを抽出します。LambdaとローカルI開発環境の両方をサポートします。

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
  'custom:tenant'?: string;        // ユーザーのデフォルトテナントコード
  'custom:roles'?: string;         // テナントロールのJSON配列
  'cognito:groups'?: string[];     // Cognitoユーザーグループ
  'cognito:username': string;      // Cognitoユーザー名
  // ... その他の標準JWTクレーム
}
```

## 関連情報

- [コマンドサービス](./command-service.md) - コマンド操作でのヘルパーの使用
- [データサービス](./data-service.md) - データクエリでのヘルパーの使用
