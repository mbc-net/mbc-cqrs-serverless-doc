---
description: { { Master related recipes. } }
---

# {{Master}}

## 1. {{Purpose}}

{{The **Master** package provides two primary services to manage different aspects of master-related data and settings:}}

- {{**MasterDataService**: Responsible for managing data within the master.}}
- {{**MasterSettingService**: Responsible for managing the settings of the master.}}

## 2. {{Usage}}

{{The solution for customizing the behavior of the `MasterModule` is to pass it an options `object` in the static `register()` method. The options object is only contain one property:}}

- {{`enableController`: enable or disable default master controller.}}


```ts 
import { MasterModule } from '@mbc-cqrs-serverless/master'

@Module({
  imports: [ MasterModule.register({
      enableController: true,
    })],
  controllers: [],
  exports: [],
})
```
###  {{MasterSettingService}}

{{The MasterSettingService interface manages settings at various levels (user, group, tenant, common). It allows retrieving, updating, creating, and deleting settings.}}

#### {{`getSetting(dto: GetSettingDto, context: { invokeContext: IInvoke }): Promise<MasterSettingEntity>`}}
##### {{Descriptions}}
{{Retrieves a specific setting based on the provided setting code.}}

##### {{Parameters}}

- {{`dto`: GetSettingDto}}
  - {{`code`: string}}

#### {{`createCommonTenantSetting(dto: CommonSettingDto, context: { invokeContext: IInvoke }): Promise<CommandModel>`}}
##### {{Descriptions}}
{{Creates a common tenant setting that is shared across the system.}}
##### {{Parameters}}
- {{`dto`: CommonSettingDto}}
  - {{`name`: string}}
  - {{`code`: string}}
  - {{`settingValue`: object}} 

#### {{`createTenantSetting(dto: TenantSettingDto, context: { invokeContext: IInvoke }): Promise<CommandModel>`}}
##### {{Descriptions}}
{{Creates a tenant-specific setting.}}
##### {{Parameters}}
- {{`dto`: TenantSettingDto}}
  - {{`name`: string}}
  - {{`code`: string}}
  - {{`tenantCode`: string}}
  - {{`settingValue`: object}} 

#### {{`createGroupSetting(dto: GroupSettingDto, context: { invokeContext: IInvoke }): Promise<CommandModel>`}}
##### {{Descriptions}}
{{Creates a group-specific setting within a tenant.}}
##### {{Parameters}}
- {{`dto`: TenantSettingDto}}
  - {{`name`: string}}
  - {{`code`: string}}
  - {{`tenantCode`: string}}
  - {{`groupId`: string}}
  - {{`settingValue`: object}} 

#### {{`createUserSetting(dto: UserSettingDto, context: { invokeContext: IInvoke }): Promise<CommandModel>`}}
##### {{Descriptions}}
{{Creates a user-specific setting within a tenant.}}
##### {{Parameters}}
- {{`dto`: TenantSettingDto}}
  - {{`name`: string}}
  - {{`code`: string}}
  - {{`tenantCode`: string}}
  - {{`userId`: string}}
  - {{`settingValue`: object}} 


#### {{`updateSetting(params: DetailKey, dto: UpdateSettingDto, context: { invokeContext: IInvoke }): Promise<CommandModel>`}}
##### {{Descriptions}}
{{Updates an existing setting.}}
##### {{Parameters}}
- {{`key`: DetailKey}}
  - {{`pk`: string}}
  - {{`sk`: string}}

- {{`dto`: UpdateSettingDto}}
  - {{`name`: string}}
  - {{`settingValue`: object}} 

#### {{`deleteSetting(key: DetailKey, context: { invokeContext: IInvoke }): Promise<CommandModel>`}}
##### {{Descriptions}}
{{Deletes a specific setting based on the provided key.}}
##### {{Parameters}}

- {{`key`: DetailKey}}
  - {{`pk`: string}}
  - {{`sk`: string}}


### {{MasterDataService}}
{{The MasterDataService service provides methods to manage master data and operations. This includes listing, retrieving, creating, updating, and deleting data, as well as checking for the existence of specific codes.}}

#### {{`list( searchDto: MasterDataSearchDto): Promise<MasterDataListEntity>`}}
##### {{Descriptions}}
{{Lists master data based on the provided search criteria.}}
##### {{Parameters}}
- {{`searchDto`: `MasterDataSearchDto`}}
 - {{`tenantCode?`: `string`}}
 - {{`settingCode`: `string`}}


#### {{`get(key: DetailDto): Promise<MasterDataEntity>`}}
##### {{Descriptions}}
{{Retrieves specific master data based on the provided key.}}
##### {{Parameters}}
- {{`key`: `DetailDto`}}
  - {{`pk`: `string`}}
  - {{`sk`: `string`}}


#### {{`create(createDto: CreateMasterDataDto, context: { invokeContext: IInvoke })`}}
##### {{Descriptions}}
{{Creates new master data.}}
##### {{Parameters}}
- {{`createDto`:`CreateMasterDataDto`}}
  -  {{`tenantCode`:`string`}}
  -  {{`settingCode`: `string`}}
  -  {{`name`: `string`}}
  -  {{`code`: `string`}}
  -  {{`attributes`?: `object`}}


#### {{`update(key: DetailDto, updateDto: UpdateDataSettingDto, context: { invokeContext: IInvoke })`}}
##### {{Descriptions}}
{{Updates existing master data.}}
##### {{Parameters}}
- {{`key`: `DetailDto`}}
  - {{`pk`: `string`}}
  - {{`sk`: `string`}}


#### {{`delete(key: DetailDto, opts: { invokeContext: IInvoke })`}}
##### {{Descriptions}}
{{Deletes specific master data based on the provided key.}}
##### {{Parameters}}
- {{`key`: `DetailDto`}}
  - {{`pk`: `string`}}
  - {{`sk`: `string`}}

#### {{`checkExistCode(tenantCode: string, type: string, code: string)`}}
##### {{Descriptions}}
{{Checks if a specific code exists within the given tenant and type.}}
##### {{Parameters}}
- {{`tenantCode`:`string`}}
- {{`type`:`string`}}
- {{`code`:`string`}}
