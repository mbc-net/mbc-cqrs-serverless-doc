---
description: "Learn about the Master Service for managing master data and settings in a multi-tenant environment."
---

# {{master_service_title}}

{{master_service_description}}

## {{overview_title}}

{{master_service_overview}}

### {{master_data_service_title}}
- {{master_data_service_feature_1}}
- {{master_data_service_feature_2}}
- {{master_data_service_feature_3}}
- {{master_data_service_feature_4}}

### {{master_setting_service_title}}
- {{master_setting_service_feature_1}}
- {{master_setting_service_feature_2}}
- {{master_setting_service_feature_3}}
- {{master_setting_service_feature_4}}

## {{installation_title}}

```bash
npm install @mbc-cqrs-serverless/master
```

## {{basic_usage_title}}

```typescript
import { MasterDataService, MasterSettingService } from '@mbc-cqrs-serverless/master';

@Injectable()
export class YourService {
  constructor(
    private readonly masterDataService: MasterDataService,
    private readonly masterSettingService: MasterSettingService
  ) {}

  async getMasterData(code: string) {
    return await this.masterDataService.findByCode(code);
  }

  async getSettings(userId: string) {
    return await this.masterSettingService.getSettings(userId);
  }
}
```

## {{api_reference_title}}

### {{master_data_service_title}}

#### create(data: CreateMasterDataDto)

{{create_master_data_description}}

```typescript
const masterData = await masterDataService.create({
  code: 'MASTER001',
  name: 'Example Master Data',
  // ... other properties
});
```

#### update(id: string, data: UpdateMasterDataDto)

{{update_master_data_description}}

```typescript
await masterDataService.update('master-id', {
  name: 'Updated Master Data',
  // ... other properties to update
});
```

### {{master_setting_service_title}}

#### createSetting(level: SettingLevel, data: CreateSettingDto)

{{create_setting_description}}

```typescript
await masterSettingService.createSetting('tenant', {
  code: 'SETTING001',
  value: { /* setting value */ },
  // ... other properties
});
```

#### getSettings(userId: string)

{{get_settings_description}}

```typescript
const settings = await masterSettingService.getSettings('user-id');
// {{get_settings_comment}}
```

## {{hierarchical_settings_title}}

{{hierarchical_settings_description}}

1. {{user_level_description}}
2. {{group_level_description}}
3. {{tenant_level_description}}
4. {{common_level_description}}

{{settings_retrieval_description}}

```typescript
const settings = await masterSettingService.getSettings('user-id');
// {{settings_retrieval_comment}}
```

## {{integration_title}}

{{integration_description}} {{see_also}} [{{tenant_service_title}}](./tenant-service.md) {{integration_details}}
