---
description: Learn about the Tenant Service for managing tenant-level operations in a multi-tenant CQRS architecture.
---

# {{ tenant_service_title }}

{{ tenant_service_description }}

## {{ overview_title }}

{{ tenant_service_overview }}
- {{ tenant_service_feature_1 }}
- {{ tenant_service_feature_2 }}
- {{ tenant_service_feature_3 }}
- {{ tenant_service_feature_4 }}

## {{ installation_title }}

```bash
npm install @mbc-cqrs-serverless/tenant
```

## {{ basic_usage_title }}

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

## {{ api_reference_title }}

### create(data: CreateTenantDto)

{{ create_tenant_description }}

```typescript
const tenant = await tenantService.create({
  code: 'TENANT001',
  name: 'Example Tenant',
  // ... other tenant properties
});
```

### update(id: string, data: UpdateTenantDto)

{{ update_tenant_description }}

```typescript
await tenantService.update('tenant-id', {
  name: 'Updated Tenant Name',
  // ... other properties to update
});
```

### delete(id: string)

{{ delete_tenant_description }}

```typescript
await tenantService.delete('tenant-id');
```

### findById(id: string)

{{ find_tenant_description }}

```typescript
const tenant = await tenantService.findById('tenant-id');
```

### validateTenantCode(code: string)

{{ validate_tenant_code_description }}

```typescript
const isValid = await tenantService.validateTenantCode('TENANT001');
```

## {{ tenant_integration_title }}

{{ tenant_integration_description }} {{ see_also }} [{{ master_service_title }}](./master-service.md) {{ tenant_integration_details }}
