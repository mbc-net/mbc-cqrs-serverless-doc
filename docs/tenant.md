---
description: {{Learn about the Tenant Service for managing tenant-level operations in a multi-tenant serverless CQRS architecture.}}
---

# {{Tenant}}
{{The Tenant Service provides functionality for managing tenant-level operations in a multi-tenant serverless CQRS architecture}}

## {{Overview}}

{{The Tenant Service is designed to}}:
- {{Manage tenant-level entity operations}}
- {{Implement CRUD operations for tenant entities}}
- {{Ensure proper isolation between different tenants}}
- {{Validate tenant codes and maintain tenant integrity}}
  
## {{Installation}}

```bash
npm install @mbc-cqrs-serverless/tenant
```
 

## {{Basic Usage}}

```ts 
import { TenantModule } from '@mbc-cqrs-serverless/tenant'

@Module({
  imports: [ TenantModule.register({
      enableController: true,
    })],
  controllers: [],
  exports: [],
})
```
## {{API Reference}}


### {{`getTenant(key: DetailKey): Promise<DataModel>`}}
{{Retrieves tenant details based on the given key.}}

``` ts
const tenant = await tenantService.getTenant({
  pk: 'TENANT#mbc',
  sk: 'MASTER',
});
```

### {{`createCommonTenant(dto: CommonTenantCreateDto, context: { invokeContext: IInvoke }):Promise<CommandModel>`}}
{{Creates a common tenant that is shared across the entire system.}}

``` ts
const tenant = await tenantService.createCommonTenant({

  name: "Common",
  description: "describes the tenant "
});
```

### {{` createTenant(dto: TenantCreateDto,context: { invokeContext: IInvoke },): Promise<CommandModel>`}}

{{Creates a tenant for an individual entity.}}

``` ts
const tenant = await tenantService.createTenant({
  name: "MBC tenant",
  code: "mbc",
  description: "describes the tenant "
});
```

### {{` updateTenant(key: DetailKey,dto: TenantUpdateDto,context: { invokeContext: IInvoke }): Promise<CommandModel>`}}

{{Updates an existing tenant's details.}}


{{Creates a tenant for an individual entity.}}

``` ts
const tenant = await tenantService.updateTenant(
  {
    pk: 'TENANT#mbc',
    sk: 'MASTER',
  }
  {
    name: "MBC tenant",
    description: "describes the tenant "
  }
);
```

###  {{`deleteTenant(key: DetailKey,context: { invokeContext: IInvoke }): Promise<CommandModel>`}}
{{Deletes a tenant based on the provided key}}

``` ts
const tenant = await tenantService.deleteTenant(
  {
    pk: 'TENANT#mbc',
    sk: 'MASTER',
  }
);
```
### {{`addTenantGroup(dto: TenantGroupAddDto,context: { invokeContext: IInvoke }): Promise<CommandModel>`}}

{{Adds a group to a specific tenant.}}
``` ts
const tenant = await tenantService.addTenantGroup(
  {
    tenantCode: "abc",
    groupId: "19",
    role: "company"
  }
);
```

### {{`customizeSettingGroups(dto: TenantGroupUpdateDto,context: { invokeContext: IInvoke }): Promise<CommandModel>`}}
{{Customizes the settings of groups associated with a tenant.}}

``` ts
const tenant = await tenantService.customizeSettingGroups(
  {
    tenantCode: "mbc",
    settingGroups: ["19","20"],
    role: "company"
  }
);
```
