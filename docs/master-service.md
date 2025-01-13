---
description: "Learn about the Master Service for managing master data and settings in a multi-tenant environment."
---

# {{masterService.title}}

{{masterService.description}}

## {{masterService.overview.title}}

{{masterService.overview.description}}

### {{masterService.masterDataService.title}}
- {{masterService.masterDataService.feature1}}
- {{masterService.masterDataService.feature2}}
- {{masterService.masterDataService.feature3}}
- {{masterService.masterDataService.feature4}}

### {{masterService.masterSettingService.title}}
- {{masterService.masterSettingService.feature1}}
- {{masterService.masterSettingService.feature2}}
- {{masterService.masterSettingService.feature3}}
- {{masterService.masterSettingService.feature4}}

## {{masterService.installation.title}}

```bash
npm install @mbc-cqrs-serverless/master
```

## {{masterService.basicUsage.title}}

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

## {{masterService.apiReference.title}}

### {{masterService.apiReference.masterDataService.title}}

#### create(data: CreateMasterDataDto)

{{masterService.apiReference.masterDataService.create.description}}

```typescript
const masterData = await masterDataService.create({
  code: 'MASTER001',
  name: 'Example Master Data',
  // ... other properties
});
```

#### update(id: string, data: UpdateMasterDataDto)

{{masterService.apiReference.masterDataService.update.description}}

```typescript
await masterDataService.update('master-id', {
  name: 'Updated Master Data',
  // ... other properties to update
});
```

### {{masterService.apiReference.masterSettingService.title}}

#### createSetting(level: SettingLevel, data: CreateSettingDto)

{{masterService.apiReference.masterSettingService.createSetting.description}}

```typescript
await masterSettingService.createSetting('tenant', {
  code: 'SETTING001',
  value: { /* setting value */ },
  // ... other properties
});
```

#### getSettings(userId: string)

{{masterService.apiReference.masterSettingService.getSettings.description}}

```typescript
const settings = await masterSettingService.getSettings('user-id');
// {{masterService.apiReference.masterSettingService.getSettings.comment}}
```

## {{masterService.hierarchicalSettings.title}}

{{masterService.hierarchicalSettings.description}}

1. {{masterService.hierarchicalSettings.level1}}
2. {{masterService.hierarchicalSettings.level2}}
3. {{masterService.hierarchicalSettings.level3}}
4. {{masterService.hierarchicalSettings.level4}}

{{masterService.hierarchicalSettings.retrievalDescription}}

```typescript
const settings = await masterSettingService.getSettings('user-id');
// {{masterService.hierarchicalSettings.retrievalComment}}
```

## {{masterService.integration.title}}

{{masterService.integration.description}} {{masterService.integration.seeAlso}} [{{tenantService.title}}](./tenant-service.md) {{masterService.integration.seeAlsoDetails}}
