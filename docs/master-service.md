---
description: "Learn about the Master Service for managing master data and settings in a multi-tenant environment."
---

# {{ masterServiceTitle }}

{{ masterServiceDescription }}

## {{ overviewTitle }}

{{ masterServiceOverview }}

### {{ masterDataServiceTitle }}
- {{ masterDataServiceFeature1 }}
- {{ masterDataServiceFeature2 }}
- {{ masterDataServiceFeature3 }}
- {{ masterDataServiceFeature4 }}

### {{ masterSettingServiceTitle }}
- {{ masterSettingServiceFeature1 }}
- {{ masterSettingServiceFeature2 }}
- {{ masterSettingServiceFeature3 }}
- {{ masterSettingServiceFeature4 }}

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

## {{ apiReferenceTitle }}

### {{ masterDataServiceTitle }}

#### create(data: CreateMasterDataDto)

{{ createMasterDataDescription }}

```typescript
const masterData = await masterDataService.create({
  code: 'MASTER001',
  name: 'Example Master Data',
  // ... other properties
});
```

#### update(id: string, data: UpdateMasterDataDto)

{{ updateMasterDataDescription }}

```typescript
await masterDataService.update('master-id', {
  name: 'Updated Master Data',
  // ... other properties to update
});
```

### {{ masterSettingServiceTitle }}

#### createSetting(level: SettingLevel, data: CreateSettingDto)

{{ createSettingDescription }}

```typescript
await masterSettingService.createSetting('tenant', {
  code: 'SETTING001',
  value: { /* setting value */ },
  // ... other properties
});
```

#### getSettings(userId: string)

{{ getSettingsDescription }}

```typescript
const settings = await masterSettingService.getSettings('user-id');
// {{ getSettingsComment }}
```

## {{ hierarchicalSettingsTitle }}

{{ hierarchicalSettingsDescription }}

1. {{ userLevelDescription }}
2. {{ groupLevelDescription }}
3. {{ tenantLevelDescription }}
4. {{ commonLevelDescription }}

{{ settingsRetrievalDescription }}

```typescript
const settings = await masterSettingService.getSettings('user-id');
// {{ settingsRetrievalComment }}
```

## {{ integrationTitle }}

{{ integrationDescription }} {{ seeAlso }} [{{ tenantServiceTitle }}](./tenant-service.md) {{ integrationDetails }}
