# {{translate("masterService.title")}}

{{translate("masterService.description")}}

## {{translate("masterService.overview.title")}}

{{translate("masterService.overview.description")}}

### {{translate("masterService.masterDataService.title")}}
- {{translate("masterService.masterDataService.feature1")}}
- {{translate("masterService.masterDataService.feature2")}}
- {{translate("masterService.masterDataService.feature3")}}
- {{translate("masterService.masterDataService.feature4")}}

### {{translate("masterService.masterSettingService.title")}}
- {{translate("masterService.masterSettingService.feature1")}}
- {{translate("masterService.masterSettingService.feature2")}}
- {{translate("masterService.masterSettingService.feature3")}}
- {{translate("masterService.masterSettingService.feature4")}}

## {{translate("masterService.installation.title")}}

```bash
npm install @mbc-cqrs-serverless/master
```

## {{translate("masterService.basicUsage.title")}}

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

## {{translate("masterService.apiReference.title")}}

### {{translate("masterService.apiReference.masterDataService.title")}}

#### create(data: CreateMasterDataDto)

{{translate("masterService.apiReference.masterDataService.create.description")}}

```typescript
const masterData = await masterDataService.create({
  code: 'MASTER001',
  name: 'Example Master Data',
  // ... other properties
});
```

#### update(id: string, data: UpdateMasterDataDto)

{{translate("masterService.apiReference.masterDataService.update.description")}}

```typescript
await masterDataService.update('master-id', {
  name: 'Updated Master Data',
  // ... other properties to update
});
```

### {{translate("masterService.apiReference.masterSettingService.title")}}

#### createSetting(level: SettingLevel, data: CreateSettingDto)

{{translate("masterService.apiReference.masterSettingService.createSetting.description")}}

```typescript
await masterSettingService.createSetting('tenant', {
  code: 'SETTING001',
  value: { /* setting value */ },
  // ... other properties
});
```

#### getSettings(userId: string)

{{translate("masterService.apiReference.masterSettingService.getSettings.description")}}

```typescript
const settings = await masterSettingService.getSettings('user-id');
// {{translate("masterService.apiReference.masterSettingService.getSettings.comment")}}
```

## {{translate("masterService.hierarchicalSettings.title")}}

{{translate("masterService.hierarchicalSettings.description")}}:

1. {{translate("masterService.hierarchicalSettings.level1")}}
2. {{translate("masterService.hierarchicalSettings.level2")}}
3. {{translate("masterService.hierarchicalSettings.level3")}}
4. {{translate("masterService.hierarchicalSettings.level4")}}

{{translate("masterService.hierarchicalSettings.retrievalDescription")}}:

```typescript
const settings = await masterSettingService.getSettings('user-id');
// {{translate("masterService.hierarchicalSettings.retrievalComment")}}
```

## {{translate("masterService.integration.title")}}

{{translate("masterService.integration.description")}} {{translate("masterService.integration.seeAlso")}} [{{translate("tenantService.title")}}](./tenant-service.md) {{translate("masterService.integration.seeAlsoDetails")}}
