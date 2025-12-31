---
description: {{Learn how to manage UI settings and data configurations with the UI Setting module.}}
---

# {{UI Setting}}

{{The UI Setting package provides a flexible framework for managing dynamic application settings without code changes. It enables administrators to define custom fields and users to store data conforming to those schemas.}}

## {{When to Use This Package}}

{{Use this package when you need to:}}

- {{Allow admins to define custom forms without developer intervention}}
- {{Store tenant-specific configuration (themes, preferences, limits)}}
- {{Create user-editable notification or email template settings}}
- {{Build configurable dropdown lists or master data tables}}

## {{Problems This Package Solves}}

| {{Problem}} | {{Solution}} |
|---------|----------|
| {{Every new setting requires code deployment}} | {{Define schemas dynamically via API}} |
| {{Settings structure differs between tenants}} | {{Multi-tenant schema support}} |
| {{No validation for user-entered settings}} | {{Field definitions enforce data types and constraints}} |
| {{Hard to build admin UI for settings}} | {{REST API with schema introspection}} |

## {{Core Concepts}}

{{The module operates with two main components:}}

1. **{{Settings}}**: {{Define the schema/structure for data entries. Each setting has a code, name, and a list of fields that describe the data structure.}}

2. **{{Data Settings}}**: {{Actual data entries that conform to a setting's schema. Each data setting belongs to a specific setting code.}}

## {{Installation}}

```bash
npm install @mbc-cqrs-serverless/ui-setting
```

## {{Core Concepts}}

{{The module operates with two main components:}}

1. **{{Settings}}**: {{Define the schema/structure for data entries. Each setting has a code, name, and a list of fields that describe the data structure.}}

2. **{{Data Settings}}**: {{Actual data entries that conform to a setting's schema. Each data setting belongs to a specific setting code.}}

## {{Module Configuration}}

{{Register the `SettingModule` in your application:}}

```typescript
import { Module } from '@nestjs/common';
import { SettingModule } from '@mbc-cqrs-serverless/ui-setting';

@Module({
  imports: [
    SettingModule.register({
      enableSettingController: true,  // Enable REST API for settings
      enableDataController: true,     // Enable REST API for data settings
    }),
  ],
})
export class AppModule {}
```

### {{Configuration Options}}

| {{Option}} | {{Type}} | {{Description}} |
|--------|------|-------------|
| `enableSettingController` | boolean | {{Enable the settings REST API controller}} |
| `enableDataController` | boolean | {{Enable the data settings REST API controller}} |

## {{Setting Service}}

{{The `SettingService` manages setting definitions.}}

### {{Available Methods}}

```typescript
import { SettingService } from '@mbc-cqrs-serverless/ui-setting';

@Injectable()
export class MyService {
  constructor(private readonly settingService: SettingService) {}

  async example() {
    // List all settings for a tenant
    const settings = await this.settingService.list(tenantCode);

    // Get a specific setting
    const setting = await this.settingService.get({ pk, sk });

    // Create a new setting
    const newSetting = await this.settingService.create(
      tenantCode,
      createDto,
      { invokeContext }
    );

    // Update a setting
    const updated = await this.settingService.update(
      { pk, sk },
      updateDto,
      { invokeContext }
    );

    // Delete a setting
    const deleted = await this.settingService.delete(
      { pk, sk },
      { invokeContext }
    );

    // Check if a setting code exists
    const exists = await this.settingService.checkExistSettingCode(
      tenantCode,
      code
    );
  }
}
```

### {{Creating a Setting}}

```typescript
const createDto: CreateSettingDto = {
  code: 'user-preferences',
  name: 'User Preferences',
  attributes: {
    description: 'User preference settings',
    fields: [
      {
        physicalName: 'theme',
        name: 'Theme',
        dataType: 'string',
        isRequired: true,
        isShowedOnList: true,
        defaultValue: 'light',
      },
      {
        physicalName: 'language',
        name: 'Language',
        dataType: 'string',
        isRequired: true,
        isShowedOnList: true,
        defaultValue: 'en',
      },
      {
        physicalName: 'pageSize',
        name: 'Page Size',
        dataType: 'number',
        isRequired: false,
        isShowedOnList: false,
        min: '10',
        max: '100',
        defaultValue: '20',
      },
    ],
  },
};
```

### {{Field Definition}}

{{Each field in a setting can have the following properties:}}

| {{Property}} | {{Type}} | {{Required}} | {{Description}} |
|----------|------|----------|-------------|
| `physicalName` | string | {{Yes}} | {{Unique identifier for the field}} |
| `name` | string | {{Yes}} | {{Display name}} |
| `description` | string | {{No}} | {{Field description}} |
| `dataType` | string | {{Yes}} | {{Data type (string, number, boolean, etc.)}} |
| `min` | string | {{No}} | {{Minimum value for numeric fields}} |
| `max` | string | {{No}} | {{Maximum value for numeric fields}} |
| `length` | string | {{No}} | {{Maximum length for string fields}} |
| `maxRow` | number | {{No}} | {{Maximum rows for multi-line text}} |
| `defaultValue` | string | {{No}} | {{Default value for the field}} |
| `isRequired` | boolean | {{Yes}} | {{Whether the field is required}} |
| `isShowedOnList` | boolean | {{Yes}} | {{Whether to display in list views}} |
| `dataFormat` | string | {{No}} | {{Format specification for the data}} |

## {{Data Setting Service}}

{{The `DataSettingService` manages data entries for defined settings.}}

### {{Available Methods}}

```typescript
import { DataSettingService } from '@mbc-cqrs-serverless/ui-setting';

@Injectable()
export class MyService {
  constructor(private readonly dataSettingService: DataSettingService) {}

  async example() {
    // List data settings (optionally filter by setting code)
    const dataList = await this.dataSettingService.list(
      tenantCode,
      { settingCode: 'user-preferences' }
    );

    // Get a specific data setting
    const data = await this.dataSettingService.get({ pk, sk });

    // Create a new data setting
    const newData = await this.dataSettingService.create(
      tenantCode,
      createDto,
      { invokeContext }
    );

    // Update a data setting
    const updated = await this.dataSettingService.update(
      { pk, sk },
      updateDto,
      { invokeContext }
    );

    // Delete a data setting
    const deleted = await this.dataSettingService.delete(
      { pk, sk },
      { invokeContext }
    );

    // Check if a data code exists
    const exists = await this.dataSettingService.checkExistCode(
      tenantCode,
      settingCode,
      code
    );
  }
}
```

### {{Creating Data Setting}}

```typescript
const createDto: CreateDataSettingDto = {
  settingCode: 'user-preferences',
  code: 'user-001',
  name: 'User 001 Preferences',
  attributes: {
    theme: 'dark',
    language: 'ja',
    pageSize: 50,
  },
};
```

## {{REST API Endpoints}}

{{When controllers are enabled, the following endpoints are available:}}

### {{Setting Endpoints}}

| {{Method}} | {{Endpoint}} | {{Description}} |
|--------|----------|-------------|
| GET | `/settings` | {{List all settings}} |
| GET | `/settings/:pk/:sk` | {{Get a specific setting}} |
| POST | `/settings` | {{Create a new setting}} |
| PUT | `/settings/:pk/:sk` | {{Update a setting}} |
| DELETE | `/settings/:pk/:sk` | {{Delete a setting}} |

### {{Data Setting Endpoints}}

| {{Method}} | {{Endpoint}} | {{Description}} |
|--------|----------|-------------|
| GET | `/data-settings` | {{List all data settings}} |
| GET | `/data-settings/:pk/:sk` | {{Get a specific data setting}} |
| POST | `/data-settings` | {{Create a new data setting}} |
| PUT | `/data-settings/:pk/:sk` | {{Update a data setting}} |
| DELETE | `/data-settings/:pk/:sk` | {{Delete a data setting}} |

## {{Multi-Tenant Support}}

{{The module automatically handles multi-tenant data isolation. Each tenant's settings and data are stored with tenant-specific keys:}}

```typescript
// Settings are stored with tenant-prefixed keys
// pk: MASTER#<tenantCode>
// sk: SETTING#<code>

// Data settings are stored with setting-prefixed keys
// pk: MASTER#<tenantCode>
// sk: <settingCode>#<code>
```

## {{Example Use Cases}}

### {{Use Case 1: User Notification Preferences}}

{{Scenario: Each user can configure their notification preferences (email on/off, SMS on/off).}}

{{Implementation: Create a "notification-settings" schema, then store each user's preferences as data entries.}}

```typescript
@Injectable()
export class AppConfigService {
  constructor(
    private readonly settingService: SettingService,
    private readonly dataSettingService: DataSettingService,
  ) {}

  async initializeDefaultSettings(tenantCode: string, invokeContext: IInvoke) {
    // Create a setting schema for notification preferences
    const settingDto: CreateSettingDto = {
      code: 'notification-settings',
      name: 'Notification Settings',
      attributes: {
        description: 'Configure notification preferences',
        fields: [
          {
            physicalName: 'emailEnabled',
            name: 'Email Notifications',
            dataType: 'boolean',
            isRequired: true,
            isShowedOnList: true,
            defaultValue: 'true',
          },
          {
            physicalName: 'smsEnabled',
            name: 'SMS Notifications',
            dataType: 'boolean',
            isRequired: true,
            isShowedOnList: true,
            defaultValue: 'false',
          },
        ],
      },
    };

    await this.settingService.create(tenantCode, settingDto, { invokeContext });
  }

  async getUserNotificationSettings(
    tenantCode: string,
    userId: string,
  ) {
    const { items } = await this.dataSettingService.list(tenantCode, {
      settingCode: 'notification-settings',
    });

    return items.find(item => item.code === userId);
  }
}
```
