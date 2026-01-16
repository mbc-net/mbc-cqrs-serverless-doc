---
description: {{Learn how to use DataService for querying data from DynamoDB tables.}}
---

# {{DataService}}

## {{Overview}}

{{The `DataService` is the query side of the CQRS pattern, providing efficient read operations for data stored in DynamoDB. It handles all read operations from the data table (the read model) which is optimized for queries.}}

```mermaid
graph LR
    subgraph "{{CQRS Query Side}}"
        A["{{Application}}"] --> B["{{DataService}}"]
        B --> C["{{Data Table}}"]
        C --> D["{{Query Results}}"]
    end
```

{{Before using the DataService, you need to set up the CommandModule as described in [the CommandService section](./command-service.md).}}

## {{Methods}}

### {{*async* `getItem(key: DetailKey): Promise<DataModel>`}}

{{The `getItem` method returns a set of attributes for the item with the given detail/primary key. If there is no matching item, `getItem` returns `undefined`.}}

{{Example:}}

```ts
import { DataService, DataModel } from '@mbc-cqrs-serverless/core';
import { Injectable, NotFoundException } from '@nestjs/common';

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

### {{*async* `listItemsByPk(pk: string, opts?: ListItemsOptions): Promise<DataListEntity>`}}

{{The `listItemsByPk` method returns one or more items matching the partition key. It supports filtering, pagination, and sorting.}}

#### {{Basic Usage}}

{{List all items by primary key (`pk`):}}

```ts
const res = await this.dataService.listItemsByPk(pk);
return new CatListEntity(res);
```

#### {{With Sort Key Filter}}

{{List items by primary key (`pk`) and use a filter expression on the sort key (`sk`). For example, get items where the sort key starts with `CAT#` and limit to 100 items:}}

```ts
import { KEY_SEPARATOR } from '@mbc-cqrs-serverless/core';

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
return new CatDataListEntity(res);
```

#### {{Pagination}}

{{Implement pagination using `startFromSk` and `limit`:}}

```ts
async listCatsWithPagination(
  tenantCode: string,
  pageSize: number,
  lastSk?: string
): Promise<{ items: CatDataEntity[]; lastSk?: string }> {
  const pk = `${tenantCode}#CAT`;

  const result = await this.dataService.listItemsByPk(pk, {
    limit: pageSize,
    startFromSk: lastSk,
  });

  return {
    items: result.items.map(item => new CatDataEntity(item)),
    lastSk: result.lastSk,
  };
}
```

#### {{Sort Key Operators}}

{{The following sort key expressions are supported:}}

| {{Operator}} | {{Expression}} | {{Description}} |
|-----------|------------|-------------|
| {{Equals}} | `sk = :value` | {{Exact match}} |
| {{Begins With}} | `begins_with(sk, :prefix)` | {{Prefix match}} |
| {{Between}} | `sk BETWEEN :start AND :end` | {{Range query}} |
| {{Less Than}} | `sk < :value` | {{Less than comparison}} |
| {{Greater Than}} | `sk > :value` | {{Greater than comparison}} |

{{Example with range query:}}

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

### {{*async* `publish(cmd: CommandModel): Promise<DataModel>`}}

{{The `publish` method publishes command data to the data table. This is typically called internally by the framework's data sync handlers, but can be used directly when implementing custom synchronization logic.}}

:::note
{{This method is primarily used internally by the framework. In most cases, you should use `CommandService.publishSync()` or `CommandService.publishAsync()` which automatically handles data synchronization.}}
:::

```ts
import {
  CommandModel,
  DataModel,
  DataService,
  DataSyncHandler,
  IDataSyncHandler,
} from "@mbc-cqrs-serverless/core";
import { Injectable } from "@nestjs/common";

// {{Custom data sync handler example}}
@DataSyncHandler()
@Injectable()
export class CustomDataSyncHandler implements IDataSyncHandler {
  constructor(private readonly dataService: DataService) {}

  async up(cmd: CommandModel): Promise<DataModel> {
    // {{Publish command to data table}}
    const dataModel = await this.dataService.publish(cmd);

    // {{Additional synchronization to external systems}}
    await this.syncToExternalSystem(dataModel);

    return dataModel;
  }

  async down(cmd: CommandModel): Promise<void> {
    // {{Handle rollback if needed}}
  }

  private async syncToExternalSystem(data: DataModel): Promise<void> {
    // {{Custom sync logic}}
  }
}
```

{{The method:}}
- {{Converts CommandModel to DataModel format}}
- {{Removes version suffix from sort key}}
- {{Preserves original creation metadata (createdAt, createdBy, createdIp)}}
- {{Updates modification metadata (updatedAt, updatedBy, updatedIp)}}
- {{Stores the data in the data table}}

## {{Common Patterns}}

### {{Search by Code}}

{{Find an item by its unique code within a tenant:}}

```ts
async findByCode(tenantCode: string, code: string): Promise<CatDataEntity | null> {
  const pk = `${tenantCode}#CAT`;
  const sk = `CAT#${code}`;

  const item = await this.dataService.getItem({ pk, sk });
  return item ? new CatDataEntity(item) : null;
}
```

### {{List with Type Filter}}

{{List items filtered by type:}}

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

### {{Error Handling}}

{{Handle common query errors gracefully:}}

```ts
import {
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

async getItemSafely(pk: string, sk: string): Promise<CatDataEntity> {
  const logger = new Logger('CatService');

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
    // {{Log and rethrow unexpected errors}}
    logger.error('Unexpected error querying item:', error);
    throw new InternalServerErrorException('Failed to retrieve item');
  }
}
```

## {{Type Definitions}}

### {{DetailKey}}

```ts
interface DetailKey {
  pk: string;  // Partition key
  sk: string;  // Sort key
}
```

### {{ListItemsOptions}}

{{`ListItemsOptions` is an inline type definition in the method signature, not a separately exported interface. The type structure is as follows:}}

```ts
{
  sk?: {
    skExpression: string;
    skAttributeValues: Record<string, string>;
    skAttributeNames?: Record<string, string>;
  };
  startFromSk?: string;
  limit?: number;
  order?: 'asc' | 'desc';
}
```

### {{DataListEntity}}

{{`DataListEntity` is a class (not an interface) that wraps list query results. It provides a constructor for easy instantiation:}}

```ts
class DataListEntity {
  items: DataEntity[];   // {{Array of data entities}}
  lastSk?: string;       // {{Sort key for pagination cursor}}
  total?: number;        // {{Total count (if available)}}

  constructor(data: Partial<DataListEntity>);
}
```

{{The constructor accepts a partial object, allowing you to create instances from query results:}}

```ts
const result = await this.dataService.listItemsByPk(pk);
const listEntity = new DataListEntity(result);
```

## {{Best Practices}}

1. **{{Use projection expressions}}**: {{Only retrieve the attributes you need to reduce data transfer}}
2. **{{Implement pagination}}**: {{Always paginate large result sets to avoid memory issues}}
3. **{{Cache frequently accessed data}}**: {{Consider caching static or slowly changing data}}
4. **{{Use appropriate key design}}**: {{Design your keys to support your query patterns efficiently}}
5. **{{Handle not found cases}}**: {{Always check if the item exists before using it}}
