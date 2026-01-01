---
description: Learn how to use DataService for querying data from DynamoDB tables.
---

# DataService

## Overview

The `DataService` is the query side of the CQRS pattern, providing efficient read operations for data stored in DynamoDB. It handles all read operations from the data table (the read model) which is optimized for queries.

```mermaid
graph LR
    subgraph "CQRS Query Side"
        A["Application"] --> B["DataService"]
        B --> C["Data Table"]
        C --> D["Query Results"]
    end
```

Before using the DataService, you need to set up the CommandModule as described in [the previous section](./command-module.md).

## メソッド

### *async* `getItem(key: DetailKey)`

`getItem` メソッドは、指定された詳細キー/主キーを持つアイテムの属性のセットを返します。一致するアイテムがない場合、`getItem` はデータを返さず、応答には item 要素がありません。

例

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataService } from '@mbc-cqrs-serverless/core';

@Injectable()
export class CatService {
  constructor(private readonly dataService: DataService) {}

  async getCat(pk: string, sk: string): Promise<CatDataEntity> {
    const item = await this.dataService.getItem({ pk, sk });

    if (!item) {
      throw new NotFoundException('Cat not found');
    }
    return new CatDataEntity(item as CatDataEntity);
  }
}
```

### *async* `listItemsByPk(pk: string, opts?: ListItemsOptions)`

The `listItemsByPk` method returns one or more items matching the partition key. It supports filtering, pagination, and sorting.

#### Basic Usage

List all items by primary key (`pk`):

```ts
const res = await this.dataService.listItemsByPk(pk);
return new CatListEntity(res as CatListEntity);
```

#### With Sort Key Filter

List items by primary key (`pk`) and use a filter expression on the sort key (`sk`). For example, get items where the sort key starts with `CAT#` and limit to 100 items:

```ts
const query = {
  sk: {
    skExpression: 'begins_with(sk, :typeCode)',
    skAttributeValues: {
      ':typeCode': `CAT${KEY_SEPARATOR}`,
    },
  },
  limit: 100,
};
const res = await this.dataService.listItemsByPk(pk, query);
return new CatDataListEntity(res as CatDataListEntity);
```

#### Pagination

Implement pagination using `exclusiveStartKey` and `limit`:

```ts
async listCatsWithPagination(
  tenantCode: string,
  pageSize: number,
  nextToken?: string
): Promise<{ items: CatDataEntity[]; nextToken?: string }> {
  const pk = `${tenantCode}#CAT`;

  const result = await this.dataService.listItemsByPk(pk, {
    limit: pageSize,
    exclusiveStartKey: nextToken
      ? JSON.parse(Buffer.from(nextToken, 'base64').toString())
      : undefined,
  });

  return {
    items: result.items.map(item => new CatDataEntity(item)),
    nextToken: result.lastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64')
      : undefined,
  };
}
```

#### Sort Key Operators

The following sort key expressions are supported:

| Operator | Expression | 説明 |
|-----------|------------|-------------|
| Equals | `sk = :value` | Exact match |
| Begins With | `begins_with(sk, :prefix)` | Prefix match |
| Between | `sk BETWEEN :start AND :end` | Range query |
| Less Than | `sk < :value` | Less than comparison |
| Greater Than | `sk > :value` | Greater than comparison |

Example with range query:

```ts
const query = {
  sk: {
    skExpression: 'sk BETWEEN :start AND :end',
    skAttributeValues: {
      ':start': 'ORDER#2024-01-01',
      ':end': 'ORDER#2024-12-31',
    },
  },
};
const res = await this.dataService.listItemsByPk(pk, query);
```

### *async* `getHistory(key: DetailKey, opts?: HistoryOptions)`

Retrieves the history of changes for a specific item. This is useful for auditing and viewing past versions.

```ts
async getItemHistory(pk: string, sk: string): Promise<HistoryEntity[]> {
  const history = await this.dataService.getHistory({ pk, sk }, {
    limit: 10,
    scanIndexForward: false, // Latest first
  });

  return history.items.map(item => new HistoryEntity(item));
}
```

## Common Patterns

### Search by Code

Find an item by its unique code within a tenant:

```ts
async findByCode(tenantCode: string, code: string): Promise<CatDataEntity | null> {
  const pk = `${tenantCode}#CAT`;
  const sk = `CAT#${code}`;

  const item = await this.dataService.getItem({ pk, sk });
  return item ? new CatDataEntity(item) : null;
}
```

### List with Type Filter

List items filtered by type:

```ts
async listByType(tenantCode: string, type: string): Promise<CatDataEntity[]> {
  const pk = `${tenantCode}#CAT`;

  const result = await this.dataService.listItemsByPk(pk, {
    sk: {
      skExpression: 'begins_with(sk, :type)',
      skAttributeValues: {
        ':type': `${type}#`,
      },
    },
  });

  return result.items.map(item => new CatDataEntity(item));
}
```

### Error Handling

Handle common query errors gracefully:

```ts
async getItemSafely(pk: string, sk: string): Promise<CatDataEntity> {
  try {
    const item = await this.dataService.getItem({ pk, sk });

    if (!item) {
      throw new NotFoundException(`Item not found: ${pk}/${sk}`);
    }

    return new CatDataEntity(item);
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    // Log and rethrow unexpected errors
    console.error('Unexpected error querying item:', error);
    throw new InternalServerErrorException('Failed to retrieve item');
  }
}
```

## Type Definitions

### DetailKey

```ts
interface DetailKey {
  pk: string;  // Partition key
  sk: string;  // Sort key
}
```

### ListItemsOptions

```ts
interface ListItemsOptions {
  sk?: {
    skExpression: string;
    skAttributeValues: Record<string, string>;
  };
  limit?: number;
  exclusiveStartKey?: Record<string, any>;
  scanIndexForward?: boolean; // true = ascending, false = descending
}
```

## Best Practices

1. **Use projection expressions**: Only retrieve the attributes you need to reduce data transfer
2. **Implement pagination**: Always paginate large result sets to avoid memory issues
3. **Cache frequently accessed data**: Consider caching static or slowly changing data
4. **Use appropriate key design**: Design your keys to support your query patterns efficiently
5. **Handle not found cases**: Always check if the item exists before using it
