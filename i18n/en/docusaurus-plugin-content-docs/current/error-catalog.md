---
sidebar_position: 10
---

# Error Catalog

This catalog describes common errors encountered in MBC CQRS Serverless, their causes, and solutions.

## Command Service Errors

### BadRequestException: "The input is not a valid, item not found or version not match"

**Location**: `packages/core/src/commands/command.service.ts`

**Cause**: Optimistic locking failure. The version number in the request does not match the current version in the database.

**Solution**:
```typescript
// 1. Fetch latest version before update
const latest = await dataService.getItem({ pk, sk });

// 2. Use the current version
await commandService.publishPartialUpdateSync({
  pk,
  sk,
  version: latest.version,
  name: 'Updated Name',
}, options);

// 3. Or use version: -1 for auto-fetch (async mode only)
await commandService.publishPartialUpdateAsync({
  pk,
  sk,
  version: -1,
  name: 'Updated Name',
}, options);
```

---

### BadRequestException: "The input key is not a valid, item not found"

**Location**: `packages/core/src/commands/command.service.ts`

**Cause**: Attempting to update an item that does not exist in the database.

**Solution**:
```typescript
// Check if item exists first
const existing = await dataService.getItem({ pk, sk });
if (!existing) {
  await commandService.publishAsync(newItem, options);
}
```

---

### BadRequestException: "Invalid input version"

**Location**: `packages/core/src/commands/command.service.ts`

**Cause**: Using a version in publishSync that does not match the latest saved version.

**Solution**: Fetch the latest item and use its version, or use version: -1 with async methods.

---

## Tenant Errors

### BadRequestException: "Tenant not found"

**Location**: `packages/tenant/src/services/tenant.service.ts`

**Cause**: The specified tenant does not exist or has been deleted.

**Solution**:
```typescript
const tenants = await tenantService.listTenants();
```

---

### BadRequestException: "Tenant code already existed"

**Location**: `packages/tenant/src/services/tenant.service.ts`

**Cause**: Attempting to create a tenant with an existing code.

**Solution**: Use a different tenant code, or reuse the existing code if recreating after deletion.

---

## Validation Errors

### BadRequestException: "Validation failed"

**Location**: `packages/core/src/pipe/class.validation.pipe.ts`

**Cause**: The request DTO failed class-validator validation.

**Solution**:
```typescript
const dto: CreateOrderDto = {
  name: 'Order Name',
  code: 'ORD001',
};
```

---

## DynamoDB Errors

### ProvisionedThroughputExceededException

**Location**: AWS DynamoDB

**Cause**: Read or write capacity has been exceeded.

**Solution**:
```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.name === 'ProvisionedThroughputExceededException') {
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 100));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

### ConditionalCheckFailedException

**Location**: AWS DynamoDB

**Cause**: Optimistic locking condition failed (version mismatch).

**Solution**: Same as version not match error above - refresh and retry.

---

## HTTP Status Code Reference

| Status | Exception | Meaning |
|--------|-----------|---------|
| 400 | BadRequestException | Invalid input or business rule violation |
| 401 | UnauthorizedException | Authentication missing or invalid |
| 403 | ForbiddenException | Authenticated but not authorized |
| 404 | NotFoundException | Resource not found |
| 409 | ConflictException | Version conflict (optimistic locking) |
| 500 | InternalServerErrorException | Unexpected server error |

---

## Debugging Tips

Tips for effective debugging.

1. **Enable debug logging**:
   ```bash
   DEBUG=* npm run offline
   ```

2. **Check CloudWatch logs for Lambda errors**

3. **Use request IDs for tracing**:
   ```typescript
   console.log('RequestId:', context.awsRequestId);
   ```

4. **Verify environment variables are correctly set**

5. **Confirm DynamoDB tables exist with correct schema**
