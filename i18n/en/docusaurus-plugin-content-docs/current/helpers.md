---
description: Reference guide for helper functions available in MBC CQRS Serverless.
---

# Helper Functions

The framework provides various helper functions for common operations.

## Key Helpers

Functions for working with DynamoDB keys.

### `addSortKeyVersion(sk: string, version: number): string`

Adds a version suffix to a sort key.

```ts
import { addSortKeyVersion } from '@mbc-cqrs-serverless/core';

const versionedSk = addSortKeyVersion('CAT#001', 1);
// Result: 'CAT#001@1'
```

### `getSortKeyVersion(sk: string): number`

Extracts the version number from a sort key. Returns VERSION_LATEST if no version suffix exists.

```ts
import { getSortKeyVersion } from '@mbc-cqrs-serverless/core';

const version = getSortKeyVersion('CAT#001@3');
// Result: 3

const latestVersion = getSortKeyVersion('CAT#001');
// Result: VERSION_LATEST (Number.MAX_SAFE_INTEGER)
```

### `removeSortKeyVersion(sk: string): string`

Removes the version suffix from a sort key.

```ts
import { removeSortKeyVersion } from '@mbc-cqrs-serverless/core';

const sk = removeSortKeyVersion('CAT#001@3');
// Result: 'CAT#001'
```

### `generateId(pk: string, sk: string): string`

Generates a unique ID by combining partition key and sort key (without version).

```ts
import { generateId } from '@mbc-cqrs-serverless/core';

const id = generateId('TENANT#mbc', 'CAT#001@3');
// Result: 'TENANT#mbc#CAT#001'
```

### `getTenantCode(pk: string): string | undefined`

Extracts the tenant code from a partition key.

```ts
import { getTenantCode } from '@mbc-cqrs-serverless/core';

const tenantCode = getTenantCode('TENANT#mbc');
// Result: 'mbc'
```

### `masterPk(tenantCode?: string): string`

Generates a partition key for master data.

```ts
import { masterPk } from '@mbc-cqrs-serverless/core';

const pk = masterPk('mbc');
// Result: 'MASTER#mbc'

const commonPk = masterPk();
// Result: 'MASTER#COMMON'
```

### `seqPk(tenantCode?: string): string`

Generates a partition key for sequences.

```ts
import { seqPk } from '@mbc-cqrs-serverless/core';

const pk = seqPk('mbc');
// Result: 'SEQ#mbc'
```

## S3 Attribute Helpers

Functions for working with S3 URI attributes.

### `isS3AttributeKey(attributes: any): boolean`

Checks if an attribute value is an S3 URI.

```ts
import { isS3AttributeKey } from '@mbc-cqrs-serverless/core';

const isS3 = isS3AttributeKey('s3://my-bucket/path/to/file.pdf');
// Result: true

const isNotS3 = isS3AttributeKey('regular string');
// Result: false
```

### `toS3AttributeKey(bucket: string, key: string): string`

Creates an S3 URI from bucket and key.

```ts
import { toS3AttributeKey } from '@mbc-cqrs-serverless/core';

const s3Uri = toS3AttributeKey('my-bucket', 'path/to/file.pdf');
// Result: 's3://my-bucket/path/to/file.pdf'
```

### `parseS3AttributeKey(s3Uri: string): { bucket: string; key: string }`

Parses an S3 URI into bucket and key components.

```ts
import { parseS3AttributeKey } from '@mbc-cqrs-serverless/core';

const { bucket, key } = parseS3AttributeKey('s3://my-bucket/path/to/file.pdf');
// bucket: 'my-bucket', key: 'path/to/file.pdf'
```

## Context Helpers

Functions for working with invocation context and user information.

### `getUserContext(ctx: IInvoke | ExecutionContext): UserContext`

Extracts user context from the invocation context. Returns userId, tenantCode, and tenantRole.

```ts
import { getUserContext } from '@mbc-cqrs-serverless/core';

const userContext = getUserContext(invokeContext);
// Returns: { userId: '...', tenantCode: 'mbc', tenantRole: 'admin' }
```

### `extractInvokeContext(ctx?: ExecutionContext): IInvoke`

Extracts the invocation context from a NestJS execution context. Supports both Lambda and local development environments.

```ts
import { extractInvokeContext } from '@mbc-cqrs-serverless/core';

@Get()
async getItem(@Req() request: Request) {
  const ctx = extractInvokeContext(this.executionContext);
  // Use ctx for further operations
}
```

### `getAuthorizerClaims(ctx: IInvoke): JwtClaims`

Extracts JWT claims from the authorizer in the invocation context.

```ts
import { getAuthorizerClaims } from '@mbc-cqrs-serverless/core';

const claims = getAuthorizerClaims(invokeContext);
// Returns JWT claims including sub, email, custom:tenant, etc.
```

## UserContext Interface

```ts
interface UserContext {
  userId: string;      // User's unique identifier (sub claim)
  tenantCode: string;  // Current tenant code
  tenantRole: string;  // User's role in the current tenant
}
```

## JwtClaims Interface

```ts
interface JwtClaims {
  sub: string;                     // User's unique identifier
  email: string;                   // User's email address
  name: string;                    // User's name
  'custom:tenant'?: string;        // User's default tenant code
  'custom:roles'?: string;         // JSON array of tenant roles
  'cognito:groups'?: string[];     // Cognito user groups
  'cognito:username': string;      // Cognito username
  // ... other standard JWT claims
}
```

## See Also

- [Command Service](./command-service.md) - Using helpers in command operations
- [Data Service](./data-service.md) - Using helpers in data queries
