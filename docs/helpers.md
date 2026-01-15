---
description: {{Reference guide for helper functions available in MBC CQRS Serverless.}}
---

# {{Helper Functions}}

{{The framework provides various helper functions for common operations.}}

## {{Key Helpers}}

{{Functions for working with DynamoDB keys.}}

### `addSortKeyVersion(sk: string, version: number): string`

{{Adds a version suffix to a sort key.}}

```ts
import { addSortKeyVersion } from '@mbc-cqrs-serverless/core';

const versionedSk = addSortKeyVersion('CAT#001', 1);
// {{Result: 'CAT#001@1'}}
```

### `getSortKeyVersion(sk: string): number`

{{Extracts the version number from a sort key. Returns VERSION_LATEST if no version suffix exists.}}

```ts
import { getSortKeyVersion } from '@mbc-cqrs-serverless/core';

const version = getSortKeyVersion('CAT#001@3');
// {{Result: 3}}

const latestVersion = getSortKeyVersion('CAT#001');
// {{Result: VERSION_LATEST (-1)}}
```

### `removeSortKeyVersion(sk: string): string`

{{Removes the version suffix from a sort key.}}

```ts
import { removeSortKeyVersion } from '@mbc-cqrs-serverless/core';

const sk = removeSortKeyVersion('CAT#001@3');
// {{Result: 'CAT#001'}}
```

### `generateId(pk: string, sk: string): string`

{{Generates a unique ID by combining partition key and sort key (without version).}}

```ts
import { generateId } from '@mbc-cqrs-serverless/core';

const id = generateId('TENANT#mbc', 'CAT#001@3');
// {{Result: 'TENANT#mbc#CAT#001'}}
```

### `getTenantCode(pk: string): string | undefined`

{{Extracts the tenant code from a partition key.}}

```ts
import { getTenantCode } from '@mbc-cqrs-serverless/core';

const tenantCode = getTenantCode('TENANT#mbc');
// {{Result: 'mbc'}}
```

### `masterPk(tenantCode?: string): string`

{{Generates a partition key for master data.}}

```ts
import { masterPk } from '@mbc-cqrs-serverless/core';

const pk = masterPk('mbc');
// {{Result: 'MASTER#mbc'}}

const commonPk = masterPk();
// {{Result: 'MASTER#COMMON'}}
```

### `seqPk(tenantCode?: string): string`

{{Generates a partition key for sequences.}}

```ts
import { seqPk } from '@mbc-cqrs-serverless/core';

const pk = seqPk('mbc');
// {{Result: 'SEQ#mbc'}}
```

## {{S3 Attribute Helpers}}

{{Functions for working with S3 URI attributes.}}

### `isS3AttributeKey(attributes: any): boolean`

{{Checks if an attribute value is an S3 URI.}}

```ts
import { isS3AttributeKey } from '@mbc-cqrs-serverless/core';

const isS3 = isS3AttributeKey('s3://my-bucket/path/to/file.pdf');
// {{Result: true}}

const isNotS3 = isS3AttributeKey('regular string');
// {{Result: false}}
```

### `toS3AttributeKey(bucket: string, key: string): string`

{{Creates an S3 URI from bucket and key.}}

```ts
import { toS3AttributeKey } from '@mbc-cqrs-serverless/core';

const s3Uri = toS3AttributeKey('my-bucket', 'path/to/file.pdf');
// {{Result: 's3://my-bucket/path/to/file.pdf'}}
```

### `parseS3AttributeKey(s3Uri: string): { bucket: string; key: string }`

{{Parses an S3 URI into bucket and key components.}}

```ts
import { parseS3AttributeKey } from '@mbc-cqrs-serverless/core';

const { bucket, key } = parseS3AttributeKey('s3://my-bucket/path/to/file.pdf');
// {{bucket: 'my-bucket', key: 'path/to/file.pdf'}}
```

## {{Context Helpers}}

{{Functions for working with invocation context and user information.}}

### `getUserContext(ctx: IInvoke | ExecutionContext): UserContext`

{{Extracts user context from the invocation context. Returns userId, tenantCode, and tenantRole.}}

```ts
import { getUserContext } from '@mbc-cqrs-serverless/core';

const userContext = getUserContext(invokeContext);
// {{Returns: { userId: '...', tenantCode: 'mbc', tenantRole: 'admin' }}}
```

### `extractInvokeContext(ctx?: ExecutionContext): IInvoke`

{{Extracts the invocation context from a NestJS execution context. Supports both Lambda and local development environments.}}

```ts
import { extractInvokeContext } from '@mbc-cqrs-serverless/core';

@Get()
async getItem(@Req() request: Request) {
  const ctx = extractInvokeContext(this.executionContext);
  // {{Use ctx for further operations}}
}
```

### `getAuthorizerClaims(ctx: IInvoke): JwtClaims`

{{Extracts JWT claims from the authorizer in the invocation context.}}

```ts
import { getAuthorizerClaims } from '@mbc-cqrs-serverless/core';

const claims = getAuthorizerClaims(invokeContext);
// {{Returns JWT claims including sub, email, custom:tenant, etc.}}
```

## {{UserContext Interface}}

```ts
interface UserContext {
  userId: string;      // {{User's unique identifier (sub claim)}}
  tenantCode: string;  // {{Current tenant code}}
  tenantRole: string;  // {{User's role in the current tenant}}
}
```

## {{JwtClaims Interface}}

```ts
interface JwtClaims {
  sub: string;                     // {{User's unique identifier}}
  email: string;                   // {{User's email address}}
  name: string;                    // {{User's name}}
  'custom:tenant'?: string;        // {{User's default tenant code}}
  'custom:roles'?: string;         // {{JSON array of tenant roles}}
  'cognito:groups'?: string[];     // {{Cognito user groups}}
  'cognito:username': string;      // {{Cognito username}}
  // ... {{other standard JWT claims}}
}
```

## {{DateTime Helpers}}

{{Functions for working with dates and ISO strings.}}

### `toISOString(date: Date): string | undefined`

{{Converts a Date to ISO string format. Returns undefined if date is null/undefined.}}

```ts
import { toISOString } from '@mbc-cqrs-serverless/core';

const isoString = toISOString(new Date('2024-01-15T10:30:00Z'));
// {{Result: '2024-01-15T10:30:00.000Z'}}
```

### `toISOStringWithTimezone(date: Date): string | undefined`

{{Converts a Date to ISO string format with timezone offset. Returns undefined if date is null/undefined.}}

```ts
import { toISOStringWithTimezone } from '@mbc-cqrs-serverless/core';

const isoString = toISOStringWithTimezone(new Date('2024-01-15T10:30:00'));
// {{Result: '2024-01-15T10:30:00+09:00' (in JST timezone)}}
```

### `isISOString(val: string): boolean`

{{Checks if a string is a valid ISO date string.}}

```ts
import { isISOString } from '@mbc-cqrs-serverless/core';

isISOString('2024-01-15T10:30:00.000Z'); // {{true}}
isISOString('2024-01-15');               // {{false}}
isISOString('invalid');                  // {{false}}
```

### `isISOStringWithTimezone(val: string): boolean`

{{Checks if a string is a valid ISO date string with timezone.}}

```ts
import { isISOStringWithTimezone } from '@mbc-cqrs-serverless/core';

isISOStringWithTimezone('2024-01-15T10:30:00+09:00'); // {{true}}
isISOStringWithTimezone('2024-01-15T10:30:00.000Z'); // {{false}}
```

## {{Event-Type Helpers}}

{{Functions for working with AWS event source ARNs.}}

### `getEventTypeFromArn(source: string): string | null`

{{Extracts the event type from an AWS ARN. Returns 'sqs', 'sns', 'dynamodb', 'event-bridge', or null.}}

```ts
import { getEventTypeFromArn } from '@mbc-cqrs-serverless/core';

const eventType = getEventTypeFromArn('arn:aws:dynamodb:ap-northeast-1:123456789:table/my-table/stream/...');
// {{Result: 'dynamodb'}}

const sqsType = getEventTypeFromArn('arn:aws:sqs:ap-northeast-1:123456789:my-queue');
// {{Result: 'sqs'}}
```

### `getResourceNameFromArn(source: string): string`

{{Extracts the resource name from an AWS ARN.}}

```ts
import { getResourceNameFromArn } from '@mbc-cqrs-serverless/core';

const tableName = getResourceNameFromArn('arn:aws:dynamodb:ap-northeast-1:123456789:table/my-table/stream/...');
// {{Result: 'my-table'}}

const queueName = getResourceNameFromArn('arn:aws:sqs:ap-northeast-1:123456789:my-queue');
// {{Result: 'my-queue'}}
```

## {{Object Helpers}}

{{Functions for working with objects.}}

### `isObject(item: any): boolean`

{{Checks if the value is a plain object (not array, not null).}}

```ts
import { isObject } from '@mbc-cqrs-serverless/core';

isObject({ key: 'value' }); // {{true}}
isObject([1, 2, 3]);        // {{false}}
isObject(null);             // {{false}}
isObject('string');         // {{false}}
```

### `mergeDeep(target: any, ...sources: any[]): any`

{{Deep merges objects without mutating the original objects.}}

```ts
import { mergeDeep } from '@mbc-cqrs-serverless/core';

const result = mergeDeep(
  { a: 1, b: { c: 2 } },
  { b: { d: 3 }, e: 4 }
);
// {{Result: { a: 1, b: { c: 2, d: 3 }, e: 4 }}}
```

### `objectBytes(obj: any): number`

{{Calculates the byte size of a JSON-serialized object.}}

```ts
import { objectBytes } from '@mbc-cqrs-serverless/core';

const size = objectBytes({ name: 'test', value: 123 });
// {{Result: byte size of JSON string}}
```

### `pickKeys(obj: any, keys: string[]): object`

{{Creates a new object with only the specified keys.}}

```ts
import { pickKeys } from '@mbc-cqrs-serverless/core';

const result = pickKeys({ a: 1, b: 2, c: 3 }, ['a', 'c']);
// {{Result: { a: 1, c: 3 }}}
```

### `omitKeys(obj: any, keys: string[]): object`

{{Creates a new object without the specified keys.}}

```ts
import { omitKeys } from '@mbc-cqrs-serverless/core';

const result = omitKeys({ a: 1, b: 2, c: 3 }, ['b']);
// {{Result: { a: 1, c: 3 }}}
```

## {{Serializer Helpers}}

{{Functions for converting between internal DynamoDB structure and external flat structure.}}

### `serializeToExternal<T>(item: T, options?: SerializerOptions): Record<string, any> | null`

{{Converts internal DynamoDB entity to external flat structure. Flattens the attributes object into the root level.}}

```ts
import { serializeToExternal } from '@mbc-cqrs-serverless/core';

const entity = {
  pk: 'TENANT#mbc',
  sk: 'CAT#001',
  name: 'Category 1',
  attributes: { color: 'red', size: 'large' }
};

const external = serializeToExternal(entity);
// {{Result: { id: 'TENANT#mbc#CAT#001', code: 'CAT#001', name: 'Category 1', pk: '...', sk: '...', color: 'red', size: 'large' }}}
```

### `deserializeToInternal<T>(data: Record<string, any>, EntityClass: new () => T): T | null`

{{Converts external flat structure back to internal DynamoDB entity structure.}}

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

## {{Source Helper}}

{{Function for generating command source identifiers.}}

### `getCommandSource(moduleName: string, controllerName: string, method: string): string`

{{Generates a standardized source string for commands.}}

```ts
import { getCommandSource } from '@mbc-cqrs-serverless/core';

const source = getCommandSource('CatalogModule', 'CatalogController', 'create');
// {{Result: '[CatalogModule]:CatalogController.create'}}
```

## {{Constants}}

### `IS_LAMBDA_RUNNING: boolean`

{{A constant that indicates whether the code is running in an AWS Lambda environment.}}

```ts
import { IS_LAMBDA_RUNNING } from '@mbc-cqrs-serverless/core';

if (IS_LAMBDA_RUNNING) {
  // {{Lambda-specific logic}}
} else {
  // {{Local development logic}}
}
```

## {{See Also}}

- [{{Command Service}}](./command-service.md) - {{Using helpers in command operations}}
- [{{Data Service}}](./data-service.md) - {{Using helpers in data queries}}
