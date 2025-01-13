---
description: {{Learn about the Tenant Service for managing tenant-level operations in a multi-tenant serverless CQRS architecture.}}
---

# Tenant Service

{{The Tenant Service provides functionality for managing tenant-level operations in a multi-tenant serverless CQRS architecture.}} {{It handles tenant entity management, ensures proper isolation between tenants, and maintains data integrity across the system.}}

## {{Overview}}

{{The Tenant Service is designed to:}}
- {{Manage tenant-level entity operations}}
- {{Implement CRUD operations for tenant entities}}
- {{Ensure proper isolation between different tenants}}
- {{Validate tenant codes and maintain tenant integrity}}

## {{Installation}}

```bash
npm install @mbc-cqrs-serverless/tenant
```

## {{Basic Usage}}

```typescript
import { TenantService } from '@mbc-cqrs-serverless/tenant';

@Injectable()
export class YourService {
  constructor(private readonly tenantService: TenantService) {}

  async createTenant(tenantData: CreateTenantDto) {
    return await this.tenantService.create(tenantData);
  }
}
```

## {{API Reference}}

### create(data: CreateTenantDto)

{{Creates a new tenant entity}}

```typescript
const tenant = await tenantService.create({
  code: 'TENANT001',
  name: 'Example Tenant',
  // ... other tenant properties
});
```

### update(id: string, data: UpdateTenantDto)

{{Updates an existing tenant entity}}

```typescript
await tenantService.update('tenant-id', {
  name: 'Updated Tenant Name',
  // ... other properties to update
});
```

### delete(id: string)

{{Deletes a tenant entity}}

```typescript
await tenantService.delete('tenant-id');
```

### findById(id: string)

{{Retrieves a tenant by ID}}

```typescript
const tenant = await tenantService.findById('tenant-id');
```

### validateTenantCode(code: string)

{{Validates if a tenant code exists and is valid}}

```typescript
const isValid = await tenantService.validateTenantCode('TENANT001');
```

## {{Integration with Master Settings}}

{{The Tenant Service integrates with the Master Settings Service to manage tenant-specific configurations.}} {{See}} [{{Master Service}}](./master-service.md) {{for more details about managing tenant-specific master data and settings.}}
