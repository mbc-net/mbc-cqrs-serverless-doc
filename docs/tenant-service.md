# {{translate("tenantService.title")}}

{{translate("tenantService.description")}}

## {{translate("tenantService.overview.title")}}

{{translate("tenantService.overview.description")}}:
- {{translate("tenantService.overview.feature1")}}
- {{translate("tenantService.overview.feature2")}}
- {{translate("tenantService.overview.feature3")}}
- {{translate("tenantService.overview.feature4")}}

## {{translate("tenantService.installation.title")}}

```bash
npm install @mbc-cqrs-serverless/tenant
```

## {{translate("tenantService.basicUsage.title")}}

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

## {{translate("tenantService.apiReference.title")}}

### create(data: CreateTenantDto)

{{translate("tenantService.apiReference.create.description")}}

```typescript
const tenant = await tenantService.create({
  code: 'TENANT001',
  name: 'Example Tenant',
  // ... other tenant properties
});
```

### update(id: string, data: UpdateTenantDto)

{{translate("tenantService.apiReference.update.description")}}

```typescript
await tenantService.update('tenant-id', {
  name: 'Updated Tenant Name',
  // ... other properties to update
});
```

### delete(id: string)

{{translate("tenantService.apiReference.delete.description")}}

```typescript
await tenantService.delete('tenant-id');
```

### findById(id: string)

{{translate("tenantService.apiReference.findById.description")}}

```typescript
const tenant = await tenantService.findById('tenant-id');
```

### validateTenantCode(code: string)

{{translate("tenantService.apiReference.validateTenantCode.description")}}

```typescript
const isValid = await tenantService.validateTenantCode('TENANT001');
```

## {{translate("tenantService.integration.title")}}

{{translate("tenantService.integration.description")}} {{translate("tenantService.integration.seeAlso")}} [{{translate("masterService.title")}}](./master-service.md) {{translate("tenantService.integration.seeAlsoDetails")}}
