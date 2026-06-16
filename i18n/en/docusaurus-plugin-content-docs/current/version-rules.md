---
sidebar_position: 5
description: Understand the optimistic locking strategy using version numbers for concurrent command processing and conflict resolution in MBC CQRS Serverless.
---

# Versioning Rules

The MBC CQRS Serverless Framework implements optimistic locking using version numbers to ensure data consistency in distributed systems. This guide explains the versioning rules and provides examples of their implementation.

## Basic Rules {#basic-rules}

1. Sequential Versioning for Same PK/SK   
   - The first command for a pk/sk is sent with version 0 (`VERSION_FIRST`); the stored item then becomes version 1, and later versions increase sequentially
   - Each update increments the version number by 1
   - Only the first request with a given version will succeed
   - Subsequent requests with the same version will fail with a conflict error

2. Independent Version Sequences
   - Different pk/sk combinations each start their own version sequence from 1
   - Version sequences are managed independently for each pk/sk combination
   - This allows parallel operations on different items without version conflicts

3. Optimistic Locking
   - Used to prevent concurrent updates to the same item
   - Version number is automatically incremented with each update
   - Throws BadRequestException on version conflicts (publishSync)
   - Throws ConditionalCheckFailedException for concurrent duplicate key writes (DynamoDB-level)
   - Ensures data consistency in distributed environments

## VERSION Constants {#version-constants}

### VERSION_FIRST — New Entity

Use `VERSION_FIRST` (= `0`) as the version when creating a new entity. The framework verifies the item does not yet exist, then stores it at version `1`.

```typescript
import { VERSION_FIRST } from '@mbc-cqrs-serverless/core';

await this.commandService.publishAsync(
  {
    pk: 'ORDER#tenant001',
    sk: 'ORD-001',
    version: VERSION_FIRST, // Create new entity — framework stores at version 1
    type: 'ORDER',
    tenantCode: 'tenant001',
    attributes: { total: 150 },
  },
  { invokeContext },
);
```

### VERSION_LATEST — Skip Version Check

Use `VERSION_LATEST` (= `-1`) to instruct the framework to auto-resolve to the latest version, bypassing optimistic locking ("last writer wins"). Use only when concurrent conflicts are acceptable and the latest value always wins.

```typescript
import { VERSION_LATEST } from '@mbc-cqrs-serverless/core';

await this.commandService.publishPartialUpdateAsync(
  {
    pk: 'ORDER#tenant001',
    sk: 'ORD-001',
    version: VERSION_LATEST, // Update without version check — last writer wins
    attributes: { status: 'shipped' },
  },
  { invokeContext },
);
```

:::warning
`VERSION_LATEST` bypasses optimistic locking. If two concurrent requests both use `VERSION_LATEST`, the second write silently overwrites the first. Reserve it for idempotent fields (e.g., status flags) where the latest value is always correct.
:::

## Implementation Examples {#implementation-examples}

### Basic Version Handling

```typescript
describe('Version Handling', () => {
  it('should handle sequential versions correctly', async () => {
    // Initial create with version 0
    const createPayload = {
      pk: 'TEST#tenant001',
      sk: 'TEST#item-1',
      id: 'TEST#tenant001#TEST#item-1',
      name: 'Version Test',
      version: 0,
      type: 'TEST',
    }

    const createRes = await request(config.apiBaseUrl)
      .post('/items')
      .send(createPayload)

    expect(createRes.statusCode).toBe(201)
    expect(createRes.body.version).toBe(1)

    // Update with correct version
    const updatePayload = {
      ...createPayload,
      version: 1,
      name: 'Updated Name',
    }

    const updateRes = await request(config.apiBaseUrl)
      .put(`/items/${createPayload.id}`)
      .send(updatePayload)

    expect(updateRes.statusCode).toBe(200)
    expect(updateRes.body.version).toBe(2)
  })
})
```

### Version Conflict Handling

```typescript
describe('Version Conflicts', () => {
  it('should handle concurrent updates correctly', async () => {
    const createPayload = {
      pk: 'TEST#tenant001',
      sk: 'TEST#conflict-1',
      id: 'TEST#tenant001#TEST#conflict-1',
      name: 'Conflict Test',
      version: 0,
      type: 'TEST',
    }

    // First create the item
    const createRes = await request(config.apiBaseUrl)
      .post('/items')
      .send(createPayload)

    expect(createRes.statusCode).toBe(201)

    const updatePayload = {
      ...createPayload,
      version: 1,
      name: 'Updated Name',
    }

    // First update with version 1 succeeds
    const res1 = await request(config.apiBaseUrl)
      .put(`/items/${createPayload.id}`)
      .send(updatePayload)

    // Second update with same version 1 fails
    const res2 = await request(config.apiBaseUrl)
      .put(`/items/${createPayload.id}`)
      .send(updatePayload)

    expect(res1.statusCode).toBe(200)
    expect(res2.statusCode).toBe(409) // Conflict
  })
})
```

### Independent Version Sequences

```typescript
describe('Independent Versioning', () => {
  it('should maintain independent version sequences', async () => {
    const item1 = {
      pk: 'TEST#seq1',
      sk: 'TEST#item-1',
      id: 'TEST#seq1#TEST#item-1',
      name: 'Sequence 1',
      version: 0,
      type: 'TEST',
    }

    const item2 = {
      pk: 'TEST#seq2',
      sk: 'TEST#item-1',
      id: 'TEST#seq2#TEST#item-1',
      name: 'Sequence 2',
      version: 0,
      type: 'TEST',
    }

    // Both items start at version 1
    const res1 = await request(config.apiBaseUrl)
      .post('/items')
      .send(item1)

    const res2 = await request(config.apiBaseUrl)
      .post('/items')
      .send(item2)

    expect(res1.body.version).toBe(1)
    expect(res2.body.version).toBe(1)

    // Update first item
    const updateRes = await request(config.apiBaseUrl)
      .put(`/items/${item1.id}`)
      .send({ ...item1, version: 1 })

    expect(updateRes.body.version).toBe(2)

    // Second item still at version 1
    const getRes = await request(config.apiBaseUrl)
      .get(`/items/${item2.id}`)

    expect(getRes.body.version).toBe(1)
  })
})
```

## Best Practices {#best-practices}

1. Always include version number in update operations
2. Handle version conflict errors gracefully in your application
3. Use appropriate retry strategies for handling conflicts
4. Consider implementing exponential backoff for retries
5. Document version handling in your API documentation


## Related Documentation

- [Command Service](/docs/command-service) - publishSync with version handling
- [Error Catalog](/docs/error-catalog) - Version conflict errors
- [Version Conflict Guide](/docs/version-conflict-guide) - Retry strategies and recovery patterns
- [Service Patterns](/docs/service-patterns) - Optimistic locking patterns
