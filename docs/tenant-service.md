---
description: "Learn about the Tenant Service for managing tenant-level operations in a multi-tenant CQRS architecture."
---

# {{ tenantServiceTitle }}

{{ tenantServiceDescription }}

## {{ overviewTitle }}

{{ tenantServiceOverview }}
- {{ tenantServiceFeature1 }}
- {{ tenantServiceFeature2 }}
- {{ tenantServiceFeature3 }}
- {{ tenantServiceFeature4 }}

## {{ installationTitle }}

```bash
npm install @mbc-cqrs-serverless/tenant
```

## {{ basicUsageTitle }}

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

## {{ apiReferenceTitle }}

### create(data: CreateTenantDto)

{{ createTenantDescription }}

```typescript
const tenant = await tenantService.create({
  code: 'TENANT001',
  name: 'Example Tenant',
  // ... other tenant properties
});
```

### update(id: string, data: UpdateTenantDto)

{{ updateTenantDescription }}

```typescript
await tenantService.update('tenant-id', {
  name: 'Updated Tenant Name',
  // ... other properties to update
});
```

### delete(id: string)

{{ deleteTenantDescription }}

```typescript
await tenantService.delete('tenant-id');
```

### findById(id: string)

{{ findTenantDescription }}

```typescript
const tenant = await tenantService.findById('tenant-id');
```

### validateTenantCode(code: string)

{{ validateTenantCodeDescription }}

```typescript
const isValid = await tenantService.validateTenantCode('TENANT001');
```

## {{ tenantIntegrationTitle }}

{{ tenantIntegrationDescription }} {{ seeAlso }} [{{ masterServiceTitle }}](./master-service.md) {{ tenantIntegrationDetails }}
