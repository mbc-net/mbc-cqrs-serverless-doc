---
description: {{Learn about versioning rules and optimistic locking}}
---

# {{Versioning Rules}}

{{The MBC CQRS Serverless Framework implements optimistic locking using version numbers to ensure data consistency in distributed systems. This guide explains the versioning rules and provides examples of their implementation.}}

## {{Basic Rules}}

1. {{Sequential Versioning for Same PK/SK}}
   - {{Items with the same pk/sk combination must have versions set sequentially starting from 1}}
   - {{Each update increments the version number by 1}}
   - {{Only the first request with a given version will succeed}}
   - {{Subsequent requests with the same version will fail with a conflict error}}

2. {{Independent Version Sequences}}
   - {{Different pk/sk combinations each start their own version sequence from 1}}
   - {{Version sequences are managed independently for each pk/sk combination}}
   - {{This allows parallel operations on different items without version conflicts}}

3. {{Optimistic Locking}}
   - {{Used to prevent concurrent updates to the same item}}
   - {{Version number is automatically incremented with each update}}
   - {{Throws ConditionalCheckFailedException on version conflicts}}
   - {{Ensures data consistency in distributed environments}}

## {{Implementation Examples}}

### {{Basic Version Handling}}

```typescript
describe('Version Handling', () => {
  it('should handle sequential versions correctly', async () => {
    // {{Initial create with version 0}}
    const createPayload = {
      pk: 'TEST#VERSION',
      sk: 'item#1',
      id: 'TEST#VERSION#item#1',
      name: 'Version Test',
      version: 0,
      type: 'TEST',
    }

    const createRes = await request(config.apiBaseUrl)
      .post('/items')
      .send(createPayload)

    expect(createRes.statusCode).toBe(201)
    expect(createRes.body.version).toBe(1)

    // {{Update with correct version}}
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

### {{Version Conflict Handling}}

```typescript
describe('Version Conflicts', () => {
  it('should handle concurrent updates correctly', async () => {
    const payload = {
      pk: 'TEST#VERSION',
      sk: 'conflict#1',
      id: 'TEST#VERSION#conflict#1',
      name: 'Conflict Test',
      version: 1,
      type: 'TEST',
    }

    // {{First update succeeds}}
    const res1 = await request(config.apiBaseUrl)
      .put(`/items/${payload.id}`)
      .send(payload)

    // {{Second update with same version fails}}
    const res2 = await request(config.apiBaseUrl)
      .put(`/items/${payload.id}`)
      .send(payload)

    expect(res1.statusCode).toBe(200)
    expect(res2.statusCode).toBe(409) // {{Conflict}}
  })
})
```

### {{Independent Version Sequences}}

```typescript
describe('Independent Versioning', () => {
  it('should maintain independent version sequences', async () => {
    const item1 = {
      pk: 'TEST#SEQ1',
      sk: 'item#1',
      id: 'TEST#SEQ1#item#1',
      name: 'Sequence 1',
      version: 0,
      type: 'TEST',
    }

    const item2 = {
      pk: 'TEST#SEQ2',
      sk: 'item#1',
      id: 'TEST#SEQ2#item#1',
      name: 'Sequence 2',
      version: 0,
      type: 'TEST',
    }

    // {{Both items start at version 1}}
    const res1 = await request(config.apiBaseUrl)
      .post('/items')
      .send(item1)

    const res2 = await request(config.apiBaseUrl)
      .post('/items')
      .send(item2)

    expect(res1.body.version).toBe(1)
    expect(res2.body.version).toBe(1)

    // {{Update first item}}
    const updateRes = await request(config.apiBaseUrl)
      .put(`/items/${item1.id}`)
      .send({ ...item1, version: 1 })

    expect(updateRes.body.version).toBe(2)

    // {{Second item still at version 1}}
    const getRes = await request(config.apiBaseUrl)
      .get(`/items/${item2.id}`)

    expect(getRes.body.version).toBe(1)
  })
})
```

## {{Best Practices}}

1. {{Always include version number in update operations}}
2. {{Handle version conflict errors gracefully in your application}}
3. {{Use appropriate retry strategies for handling conflicts}}
4. {{Consider implementing exponential backoff for retries}}
5. {{Document version handling in your API documentation}}
