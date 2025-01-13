---
description: Learn about the Master Service for managing master data and settings in a multi-tenant environment.
---

# Master Service

{{The Master Service provides functionality for managing master data and settings in a multi-tenant environment.}} {{It supports hierarchical data management across different levels (user, group, tenant, common) and ensures proper data isolation between tenants.}}

## {{Overview}}

{{The Master Service consists of two main components:}}

### {{Master Data Service}}
- {{Implements CRUD operations for master data entities}}
- {{Provides list and retrieval functionality}}
- {{Includes code validation capabilities}}
- {{Ensures data integrity across tenant boundaries}}

### {{Master Setting Service}}
- {{Implements hierarchical settings management}}
- {{Supports creation of settings at all levels}}
- {{Provides update and delete operations for tenant settings}}
- {{Implements cascading settings retrieval}}

## {{Installation}}

```bash
npm install @mbc-cqrs-serverless/master
```

## {{Basic Usage}}

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

## {{API Reference}}

### {{Master Data Service}}

#### create(data: CreateMasterDataDto)

{{Creates a new master data entity}}

```typescript
const masterData = await masterDataService.create({
  code: 'MASTER001',
  name: 'Example Master Data',
  // ... other properties
});
```

#### update(id: string, data: UpdateMasterDataDto)

{{Updates an existing master data entity}}

```typescript
await masterDataService.update('master-id', {
  name: 'Updated Master Data',
  // ... other properties to update
});
```

### {{Master Setting Service}}

#### createSetting(level: SettingLevel, data: CreateSettingDto)

{{Creates a new setting at the specified level}}

```typescript
await masterSettingService.createSetting('tenant', {
  code: 'SETTING001',
  value: { /* setting value */ },
  // ... other properties
});
```

#### getSettings(userId: string)

{{Retrieves settings for a user, cascading through the hierarchy}}

```typescript
const settings = await masterSettingService.getSettings('user-id');
// {{Returns merged settings from user → group → tenant → common levels}}
```

## {{Hierarchical Settings Management}}

{{Settings are managed in a hierarchical structure with four levels:}}

1. {{User Level: Individual user settings}}
2. {{Group Level: Settings shared by a group of users}}
3. {{Tenant Level: Organization-wide settings}}
4. {{Common Level: System-wide default settings}}

{{Settings are retrieved in a cascading manner, where more specific settings override more general ones}}

```typescript
const settings = await masterSettingService.getSettings('user-id');
// {{Result combines settings from all levels, with user-level settings taking precedence}}
```

## {{Integration with Tenant Service}}

{{The Master Service works in conjunction with the Tenant Service to ensure proper data isolation and access control.}} {{See}} [{{Tenant Service}}](./tenant-service.md) {{for more details about tenant management.}}
