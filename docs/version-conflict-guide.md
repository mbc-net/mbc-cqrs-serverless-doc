---
sidebar_position: 6
description: {{Learn how to handle version conflicts and implement concurrency control strategies}}
---

# {{Version Conflict Guide}}

{{This guide explains how version conflicts occur in the MBC CQRS Serverless Framework and provides strategies for prevention and recovery.}}

## {{What Causes Version Conflicts}}

{{Version conflicts occur when two or more operations attempt to update the same item simultaneously. In a distributed system like serverless applications, this is a common scenario that must be handled properly.}}

### {{Conflict Scenario}}

```
{{User A reads item (version 1)}}
{{User B reads item (version 1)}}
{{User A updates item (version 1 -> 2) - Success}}
{{User B updates item (version 1 -> 2) - CONFLICT!}}
```

{{In this scenario, User B's update fails because the item has already been updated by User A. The framework uses DynamoDB's conditional writes to detect this situation.}}

## {{How Optimistic Locking Works}}

{{The framework implements optimistic locking through the `version` field on each item. This approach assumes conflicts are rare and handles them when they occur, rather than locking resources preemptively.}}

### {{Version Constants}}

```typescript
import { VERSION_FIRST, VERSION_LATEST } from '@mbc-cqrs-serverless/core';

// {{VERSION_FIRST = 0: Used when creating new items}}
// {{VERSION_LATEST = -1: Auto-resolve to the latest version}}
```

### {{How It Works Internally}}

{{When publishing a command, the framework:}}

1. {{Checks the input version against the current item's version}}
2. {{Increments the version number by 1}}
3. {{Uses DynamoDB conditional expression `attribute_not_exists(pk) AND attribute_not_exists(sk)` to ensure uniqueness}}
4. {{If another update occurred first, DynamoDB throws `ConditionalCheckFailedException`}}
5. {{The framework converts this to HTTP 409 Conflict response}}

```typescript
// {{Internal implementation (simplified)}}
await this.dynamoDbService.putItem(
  this.tableName,
  command,
  'attribute_not_exists(pk) AND attribute_not_exists(sk)', // {{Conditional write}}
);
```

## {{Prevention Strategies}}

### {{1. Always Include Version in Updates}}

{{When updating an item, always include the current version number:}}

```typescript
import { CommandPartialInputModel } from '@mbc-cqrs-serverless/core';

// {{First, get the current item to know its version}}
const currentItem = await this.dataService.getItem({ pk, sk });

const updateCommand: CommandPartialInputModel = {
  pk: currentItem.pk,
  sk: currentItem.sk,
  version: currentItem.version, // {{Include current version}}
  name: 'Updated Name',
};

await this.commandService.publishPartialUpdateAsync(updateCommand, {
  source: 'updateItem',
  invokeContext,
});
```

### {{2. Use VERSION_LATEST for Auto-Resolution}}

{{When you want to always update the latest version without worrying about the exact version number:}}

```typescript
import { VERSION_LATEST, CommandInputModel } from '@mbc-cqrs-serverless/core';

const command: CommandInputModel = {
  pk: catPk,
  sk: catSk,
  id: generateId(catPk, catSk),
  code,
  type: 'CAT',
  name: 'Updated Name',
  version: VERSION_LATEST, // {{Auto-resolve to latest version}}
  attributes,
};

await this.commandService.publishAsync(command, {
  source: 'updateCat',
  invokeContext,
});
```

### {{3. Use VERSION_FIRST for New Items}}

{{When creating new items, use VERSION_FIRST (0) to indicate this is the first version:}}

```typescript
import { VERSION_FIRST, CommandDto } from '@mbc-cqrs-serverless/core';

const newCatCommand = new CatCommandDto({
  pk: catPk,
  sk: catSk,
  id: generateId(catPk, catSk),
  code,
  type: 'CAT',
  name: 'New Cat',
  version: VERSION_FIRST, // {{0 - indicates new item}}
  attributes,
});

await this.commandService.publishAsync(newCatCommand, {
  source: 'createCat',
  invokeContext,
});
```

## {{Recovery Patterns}}

### {{Basic Retry Logic}}

{{Implement retry logic to handle transient conflicts:}}

```typescript
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

async function updateWithRetry(
  commandService: CommandService,
  dataService: DataService,
  pk: string,
  sk: string,
  updateData: Partial<CommandInputModel>,
  invokeContext: IInvoke,
  maxRetries = 3,
): Promise<CommandModel> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // {{Get latest version}}
      const currentItem = await dataService.getItem({ pk, sk });

      const command: CommandPartialInputModel = {
        pk,
        sk,
        version: currentItem?.version || VERSION_FIRST,
        ...updateData,
      };

      return await commandService.publishPartialUpdateAsync(command, {
        source: 'updateWithRetry',
        invokeContext,
      });
    } catch (error) {
      if (
        error instanceof ConditionalCheckFailedException ||
        error.statusCode === 409
      ) {
        if (attempt === maxRetries) {
          throw new Error(
            `Failed to update after ${maxRetries} attempts due to version conflicts`,
          );
        }
        // {{Wait before retry (exponential backoff)}}
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 100),
        );
        continue;
      }
      throw error;
    }
  }
}
```

### {{Exponential Backoff Pattern}}

{{For high-contention scenarios, use exponential backoff with jitter:}}

```typescript
async function exponentialBackoff(attempt: number): Promise<void> {
  const baseDelay = 100; // {{Base delay in milliseconds}}
  const maxDelay = 5000; // {{Maximum delay}}

  // {{Calculate delay with exponential backoff}}
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

  // {{Add random jitter to prevent thundering herd}}
  const jitter = Math.random() * delay * 0.1;

  await new Promise((resolve) => setTimeout(resolve, delay + jitter));
}
```

### {{Handling Conflicts in Controllers}}

{{Handle version conflicts gracefully in your API controllers:}}

```typescript
import {
  Controller,
  Put,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Controller('cats')
export class CatController {
  constructor(private readonly catService: CatService) {}

  @Put(':id')
  async updateCat(
    @Param('id') id: string,
    @Body() updateDto: UpdateCatDto,
    @InvokeContext() invokeContext: IInvoke,
  ) {
    try {
      return await this.catService.update(id, updateDto, invokeContext);
    } catch (error) {
      if (error.statusCode === 409) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            message: 'Version conflict. Please refresh and try again.',
            error: 'Conflict',
          },
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }
}
```

## {{When to Use VERSION_FIRST vs VERSION_LATEST}}

| {{Scenario}} | {{Use}} | {{Reason}} |
|---|---|---|
| {{Creating new item}} | `VERSION_FIRST` (0) | {{Indicates this is the first version of the item}} |
| {{Updating with known version}} | {{Actual version number}} | {{Ensures you're updating the expected version}} |
| {{Updating to latest (no conflict check)}} | `VERSION_LATEST` (-1) | {{Auto-resolves to latest, but may overwrite concurrent changes}} |
| {{Partial update}} | {{Current item's version}} | {{Ensures update is based on current state}} |

### {{VERSION_FIRST (0)}}

{{Use when:}}
- {{Creating a new item that doesn't exist yet}}
- {{The item should have version 1 after creation}}

```typescript
const newCommand = {
  pk: 'CAT#tenant1',
  sk: 'cat#001',
  version: VERSION_FIRST, // {{version 0}}
  // ... {{other fields}}
};
```

### {{VERSION_LATEST (-1)}}

{{Use when:}}
- {{You want to update regardless of current version}}
- {{Conflicts are acceptable and the latest data should win}}
- {{Implementing "last writer wins" semantics}}

```typescript
const updateCommand = {
  pk: 'CAT#tenant1',
  sk: 'cat#001',
  version: VERSION_LATEST, // {{-1, auto-resolves}}
  // ... {{other fields}}
};
```

:::warning {{Caution with VERSION_LATEST}}
{{Using `VERSION_LATEST` bypasses conflict detection. Only use it when you intentionally want to overwrite any concurrent changes. For most use cases, you should use the actual version number from the current item.}}
:::

## {{Best Practices}}

### {{1. Design for Concurrency}}

- {{Keep transactions short and focused}}
- {{Minimize the time between reading and writing}}
- {{Avoid long-running operations between read and update}}

### {{2. Handle Conflicts Gracefully}}

- {{Always catch and handle version conflict errors}}
- {{Provide clear error messages to users}}
- {{Implement appropriate retry strategies}}

### {{3. Use Appropriate Version Strategy}}

- {{Use explicit version numbers for strict concurrency control}}
- {{Use VERSION_LATEST only when "last writer wins" is acceptable}}
- {{Always validate version in partial updates}}

### {{4. Client-Side Considerations}}

- {{Store the version number when fetching data}}
- {{Include version in update requests}}
- {{Handle 409 Conflict responses by refreshing data and retrying}}

```typescript
// {{Frontend example}}
async function updateItem(item, changes) {
  try {
    const response = await fetch(`/api/items/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...changes,
        version: item.version, // {{Include version}}
      }),
    });

    if (response.status === 409) {
      // {{Handle conflict - refresh and show user the changes}}
      const latestItem = await fetchItem(item.id);
      throw new ConflictError('Item was modified. Please review changes.', latestItem);
    }

    return response.json();
  } catch (error) {
    // {{Handle other errors}}
    throw error;
  }
}
```

### {{5. Monitoring and Alerting}}

- {{Monitor conflict rates in your application}}
- {{High conflict rates may indicate design issues}}
- {{Consider restructuring data or reducing contention}}

## {{Related Documentation}}

- [{{Versioning Rules}}](./version-rules.md)
- [{{CommandService}}](./command-service.md)
- [{{Error Catalog}}](./error-catalog.md)
