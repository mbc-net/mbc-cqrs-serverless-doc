---
description: { { Tenant related recipes. } }
---

# {{Tenant}}

## 1. {{Purpose}}

{{The Tenant Package is designed to create and manage multi-tenancy for the system.}}
- {{Current features include:}}
  - {{Creating a **`COMMON`** tenant shared across the entire system}}
  - {{Creating tenants for individual entities}}
  - {{Editing tenants}}
  - {{Deleting tenants}}
  - {{Adding groups to tenants}}
## 2. {{Usage}}

{{The solution for customizing the behavior of the `TenantModule` is to pass it an options `object` in the static `register()` method. The options object is only contain one property:}}

- {{`enableController`: enable or disable default tenant controller.}}


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
## {{The `TenantService` have public methods:}}


### {{`getTenant(key: DetailKey): Promise<DataModel>`}}
#### {{**Description**:}}
{{Retrieves tenant details based on the given key.}}

#### {{**Parameters**}}
- {{`key`: `DetailKey`}}
  - {{`sk`: `string`}}
  - {{`pk`: `string`}}

### {{`createCommonTenant(dto: CommonTenantCreateDto, context: { invokeContext: IInvoke }):Promise<CommandModel>`}}
#### {{**Description**:}}
{{Creates a common tenant that is shared across the entire system.}}

##### {{Parameters}}
- {{`dto`: `CommonTenantCreateDto`}}
  - {{`name`: `string`}}
  - {{`description?`: `string`}} 

### {{` createTenant(dto: TenantCreateDto,context: { invokeContext: IInvoke },): Promise<CommandModel>`}}
#### {{**Description**:}}
{{Creates a tenant for an individual entity.}}

##### {{Parameters}}
- {{`dto`: `TenantCreateDto`}}
  - {{`code`: `string`}}
  - {{`name`: `string`}}
  - {{`description?`: `string`}} 

### {{` updateTenant(key: DetailKey,dto: TenantUpdateDto,context: { invokeContext: IInvoke }): Promise<CommandModel>`}}
#### {{**Description**:}}
{{Updates an existing tenant's details.}}

##### {{Parameters}}
- {{`key`: `DetailKey`}}
  - {{`sk`: `string`}}
  - {{`pk`: `string`}}
- {{`dto`: `TenantUpdateDto`}}
  - {{`code`: `string`}}
  - {{`name`: `string`}}
  - {{`description?`: `string`}} 
  - {{`attributes?`: `object`}}

###  {{`deleteTenant(key: DetailKey,context: { invokeContext: IInvoke }): Promise<CommandModel>`}}
#### {{**Description**:}}
{{Deletes a tenant based on the provided key}}
##### {{Parameters}}
- {{`key`: `DetailKey`}}
  - {{`sk`: `string`}}
  - {{`pk`: `string`}}

### {{` addTenantGroup(dto: TenantGroupAddDto,context: { invokeContext: IInvoke }): Promise<CommandModel>`}}
#### {{**Description**:}}
{{Adds a group to a specific tenant.}}
##### {{Parameters}}
- {{`dto`: `TenantGroupAddDto`}}
  - {{`tenantCode`: `string`}}
  - {{`groupId`: `string`}}
  - {{`role`: `string`}} 

### {{`  customizeSettingGroups(dto: TenantGroupUpdateDto,context: { invokeContext: IInvoke }): Promise<CommandModel>`}}
#### {{**Description**:}}
{{Customizes the settings of groups associated with a tenant.}}
##### {{Parameters}}
- {{`dto`: `TenantGroupUpdateDto`}}
  - {{`tenantCode`: `string`}}
  - {{`settingGroups`: `string[]`}}
  - {{`role`: `string`}} 
