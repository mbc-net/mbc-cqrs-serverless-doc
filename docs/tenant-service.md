---
description: Learn about the Tenant Service for managing tenant-level operations in a multi-tenant serverless CQRS architecture.
---

# { { tenantService.title } }

{ { tenantService.description } }

## { { tenantService.overview.title } }

{ { tenantService.overview.description } }
- { { tenantService.overview.feature1 } }
- { { tenantService.overview.feature2 } }
- { { tenantService.overview.feature3 } }
- { { tenantService.overview.feature4 } }

## { { tenantService.installation.title } }

```bash
npm install @mbc-cqrs-serverless/tenant
```

## { { tenantService.basicUsage.title } }

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

## { { tenantService.apiReference.title } }

### create(data: CreateTenantDto)

{ { tenantService.apiReference.create.description } }

```typescript
const tenant = await tenantService.create({
  code: 'TENANT001',
  name: 'Example Tenant',
  // ... other tenant properties
});
```

### update(id: string, data: UpdateTenantDto)

{ { tenantService.apiReference.update.description } }

```typescript
await tenantService.update('tenant-id', {
  name: 'Updated Tenant Name',
  // ... other properties to update
});
```

### delete(id: string)

{ { tenantService.apiReference.delete.description } }

```typescript
await tenantService.delete('tenant-id');
```

### findById(id: string)

{ { tenantService.apiReference.findById.description } }

```typescript
const tenant = await tenantService.findById('tenant-id');
```

### validateTenantCode(code: string)

{ { tenantService.apiReference.validateTenantCode.description } }

```typescript
const isValid = await tenantService.validateTenantCode('TENANT001');
```

## { { tenantService.integration.title } }

{ { tenantService.integration.description } } { { tenantService.integration.seeAlso } } [{ { masterService.title } }](./master-service.md) { { tenantService.integration.seeAlsoDetails } }
