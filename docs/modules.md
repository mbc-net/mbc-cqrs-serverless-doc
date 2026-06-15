---
description: {{Learn how to create and configure modules in MBC CQRS Serverless.}}
---

# {{Modules}}

## {{Overview}} {#overview}

{{A module is a class annotated with a `@Module()` decorator. The `@Module()` decorator provides metadata that organizes the application structure. Modules encapsulate related functionality and follow the NestJS module pattern.}}

```mermaid
graph TB
    subgraph "{{Your Application}}"
        A["{{AppModule}}"]
        A --> B["{{CatModule}}"]
        A --> C["{{OrderModule}}"]
        A --> D["{{UserModule}}"]
    end

    subgraph "{{Framework Modules}}"
        E["{{CommandModule}}"]
        F["{{SequencesModule}}"]
        G["{{TenantModule}}"]
    end

    B --> E
    C --> E
    C --> F
    D --> G
```

## {{Module Structure}} {#module-structure}

{{A typical module in MBC CQRS Serverless includes:}}

```typescript
import { Module } from '@nestjs/common';
import { CommandModule } from '@mbc-cqrs-serverless/core';

import { CatController } from './cat.controller';
import { CatService } from './cat.service';
import { CatDataSyncRdsHandler } from './handler/cat-rds.handler';

@Module({
  imports: [
    CommandModule.register({
      tableName: 'cat',
      dataSyncHandlers: [CatDataSyncRdsHandler],
    }),
  ],
  controllers: [CatController],
  providers: [CatService],
  exports: [CatService],
})
export class CatModule {}
```

## {{Module Components}} {#module-components}

| {{Component}} | {{Description}} |
|-----------|-------------|
| `imports` | {{List of imported modules that export providers used in this module}} |
| `controllers` | {{Controllers that handle HTTP requests}} |
| `providers` | {{Services and other providers available for injection}} |
| `exports` | {{Providers that should be available in modules that import this module}} |

## {{Framework Modules}} {#framework-modules}

{{MBC CQRS Serverless provides several ready-to-use modules:}}

### {{Core Modules}}

| {{Module}} | {{Package}} | {{Purpose}} |
|--------|---------|---------|
| `CommandModule` | `@mbc-cqrs-serverless/core` | {{CQRS command handling and data sync}} |
| `SequencesModule` | `@mbc-cqrs-serverless/sequence` | {{Sequential ID generation}} |
| `TenantModule` | `@mbc-cqrs-serverless/tenant` | {{Multi-tenant management}} |

### {{Feature Modules}}

| {{Module}} | {{Package}} | {{Purpose}} |
|--------|---------|---------|
| `TaskModule` | `@mbc-cqrs-serverless/task` | {{Async task execution with Step Functions}} |
| `MasterModule` | `@mbc-cqrs-serverless/master` | {{Master data and settings management}} |
| `ImportModule` | `@mbc-cqrs-serverless/import` | {{CSV/API data import}} |
| `DirectoryStorageModule` | `@mbc-cqrs-serverless/directory` | {{File and folder management with S3}} |
| `SurveyTemplateModule` | `@mbc-cqrs-serverless/survey-template` | {{Survey template management}} |

### {{Support Modules}}

| {{Module}} | {{Package}} | {{Purpose}} |
|--------|---------|---------|
| `NotificationModule` | `@mbc-cqrs-serverless/core` | {{Email notifications via SES}} |
| `SettingModule` | `@mbc-cqrs-serverless/ui-setting` | {{User interface settings storage}} |

## {{Dynamic Module Registration}} {#dynamic-registration}

{{Most framework modules are dynamic modules that accept configuration:}}

### {{CommandModule}}

```typescript
CommandModule.register({
  tableName: 'cat',
  dataSyncHandlers: [CatDataSyncRdsHandler],
  skipError: false,
  disableDefaultHandler: false,
})
```

| {{Option}} | {{Type}} | {{Default}} | {{Description}} |
|--------|------|---------|-------------|
| `tableName` | `string` | {{Required}} | {{DynamoDB table name (without postfix)}} |
| `dataSyncHandlers` | `Type[]` | `[]` | {{Data sync handler classes}} |
| `skipError` | `boolean` | `false` | {{Reserved for future use (not yet implemented)}} |
| `disableDefaultHandler` | `boolean` | `false` | {{Disable default DynamoDB data sync handler}} |

### {{SequencesModule}}

```typescript
SequencesModule.register({
  enableController: true, // {{Enable built-in sequence REST endpoints}}
})
```

| {{Option}} | {{Type}} | {{Default}} | {{Description}} |
|--------|------|---------|-------------|
| `enableController` | `boolean` | `false` | {{Enable the built-in sequence generation endpoints}} |

### {{TenantModule}}

{{The TenantModule provides multi-tenant management. It can expose REST endpoints for creating and updating tenants and their group configurations.}}

```typescript
import { TenantModule } from '@mbc-cqrs-serverless/tenant';

TenantModule.register({
  enableController: true, // {{Enable built-in tenant REST endpoints}}
  dataSyncHandlers: [TenantRdsSyncHandler], // {{Optional: Data sync handlers for RDS synchronization}}
})
```

| {{Option}} | {{Type}} | {{Default}} | {{Description}} |
|--------|------|---------|-------------|
| `enableController` | `boolean` | `false` | {{Enable the built-in TenantController endpoints}} |
| `dataSyncHandlers` | `Type[]` | `[]` | {{Data sync handler classes}} |

{{See}} [{{Tenant}}](/docs/tenant) {{for the full API reference.}}

### {{MasterModule}}

```typescript
MasterModule.register({
  enableController: true,
  prismaService: PrismaService,
})
```

:::warning {{MasterModule Configuration Note}}
{{When `enableController: true`, the `prismaService` parameter is **required**. You must provide your application's PrismaService class. The framework will throw an error if `prismaService` is not provided when controllers are enabled.}}
:::

### {{TaskModule}}

{{TaskModule handles asynchronous task execution using AWS Step Functions. It requires a custom event factory that implements `ITaskQueueEventFactory`.}}

```typescript
import { TaskModule } from '@mbc-cqrs-serverless/task';
import { MyTaskQueueEventFactory } from './my-task-queue-event.factory';

TaskModule.register({
  taskQueueEventFactory: MyTaskQueueEventFactory,
  enableController: true,
})
```

| {{Option}} | {{Type}} | {{Default}} | {{Description}} |
|--------|------|---------|-------------|
| `taskQueueEventFactory` | `Type<ITaskQueueEventFactory>` | {{Required}} | {{Factory class for transforming task queue events}} |
| `enableController` | `boolean` | `false` | {{Enable built-in task REST endpoints}} |

{{The `taskQueueEventFactory` must implement the `ITaskQueueEventFactory` interface. Both methods are optional - implement only what you need:}}

```typescript
import { ITaskQueueEventFactory, TaskQueueEvent, StepFunctionTaskEvent } from '@mbc-cqrs-serverless/task';
import { IEvent } from '@mbc-cqrs-serverless/core';
import { MyTaskEvent } from './my-task.event';
import { MyStepFunctionTaskEvent } from './my-sfn-task.event';

export class MyTaskQueueEventFactory implements ITaskQueueEventFactory {
  // {{Optional: Transform SQS task queue events into domain events}}
  async transformTask(event: TaskQueueEvent): Promise<IEvent[]> {
    // {{Create domain-specific events from task queue events}}
    return [new MyTaskEvent().fromSqsRecord(event)];
  }

  // {{Optional: Transform Step Function task events into domain events}}
  async transformStepFunctionTask(event: StepFunctionTaskEvent): Promise<IEvent[]> {
    // {{Check taskKey.sk to determine which event type to create}}
    if (event.taskKey.sk.startsWith('MY_TASK')) {
      return [new MyStepFunctionTaskEvent(event)];
    }
    return [];
  }
}
```

### {{ImportModule}}

{{The ImportModule provides CSV and API data import functionality. It requires defining import profiles that specify how data should be imported and processed for each entity type.}}

```typescript
import { ImportModule } from '@mbc-cqrs-serverless/import';
import { PolicyImportStrategy } from './strategies/policy-import.strategy';
import { PolicyProcessStrategy } from './strategies/policy-process.strategy';
import { PolicyModule } from './policy.module';

@Module({
  imports: [
    ImportModule.register({
      profiles: [
        {
          tableName: 'policy',
          importStrategy: PolicyImportStrategy,
          processStrategy: PolicyProcessStrategy,
        },
      ],
      imports: [PolicyModule], // {{Modules that export providers needed by strategies}}
      enableController: true,
    }),
  ],
})
export class AppModule {}
```

| {{Option}} | {{Type}} | {{Default}} | {{Description}} |
|--------|------|---------|-------------|
| `profiles` | `ImportEntityProfile[]` | {{Required}} | {{Array of import profiles for each entity type}} |
| `imports` | `ModuleMetadata['imports']` | `[]` | {{Modules that export providers needed by strategy classes}} |
| `enableController` | `boolean` | `false` | {{Enable built-in `/imports`, `/imports/csv`, and `/imports/zip` endpoints}} |

{{Each `ImportEntityProfile` requires:}}

| {{Property}} | {{Type}} | {{Description}} |
|----------|------|-------------|
| `tableName` | `string` | {{Unique identifier for the data type (e.g., 'policy', 'user')}} |
| `importStrategy` | `Type<IImportStrategy>` | {{Class implementing import logic (transform & validate)}} |
| `processStrategy` | `Type<IProcessStrategy>` | {{Class implementing business processing logic (compare & map)}} |

### {{DirectoryStorageModule}}

{{The DirectoryStorageModule provides S3-backed file and folder management with permissions, version history, and presigned URL generation.}}

```typescript
import { DirectoryStorageModule } from '@mbc-cqrs-serverless/directory';
import { PrismaService } from './prisma.service';

DirectoryStorageModule.register({
  enableController: true,
  prismaService: PrismaService,
  dataSyncHandlers: [],
})
```

| {{Option}} | {{Type}} | {{Default}} | {{Description}} |
|--------|------|---------|-------------|
| `enableController` | `boolean` | `false` | {{Enable built-in directory REST endpoints}} |
| `prismaService` | `Type<PrismaService>` | {{Required when enableController is true}} | {{Application PrismaService class}} |
| `dataSyncHandlers` | `Type[]` | `[]` | {{Data sync handler classes}} |

### {{SurveyTemplateModule}}

{{The SurveyTemplateModule provides survey template management with support for multiple question types including text, radio, checkbox, and rating questions.}}

```typescript
import { SurveyTemplateModule } from '@mbc-cqrs-serverless/survey-template';
import { PrismaService } from './prisma.service';

SurveyTemplateModule.register({
  enableController: true,
  prismaService: PrismaService,
})
```

| {{Option}} | {{Type}} | {{Default}} | {{Description}} |
|--------|------|---------|-------------|
| `enableController` | `boolean` | `false` | {{Enable built-in survey template REST endpoints}} |
| `prismaService` | `Type<PrismaService>` | {{Required when enableController is true}} | {{Application PrismaService class}} |

### {{SettingModule}}

{{The SettingModule manages user interface settings. It can optionally expose REST endpoints for managing settings.}}

```typescript
import { SettingModule } from '@mbc-cqrs-serverless/ui-setting';

@Module({
  imports: [
    SettingModule.register({
      enableSettingController: true,
      enableDataController: true,
    }),
  ],
})
export class AppModule {}
```

| {{Option}} | {{Type}} | {{Default}} | {{Description}} |
|--------|------|---------|-------------|
| `enableSettingController` | `boolean` | `false` | {{Enable the setting controller for UI settings management}} |
| `enableDataController` | `boolean` | `false` | {{Enable the data setting controller for data-related settings}} |

### {{NotificationModule (Static)}}

{{The NotificationModule is a static (not dynamic) module that provides email notifications via SES and real-time updates via AppSync. It is automatically registered as a global module, so you only need to import it once in your AppModule.}}

```typescript
import { NotificationModule } from '@mbc-cqrs-serverless/core';

@Module({
  imports: [
    NotificationModule, // {{No configuration needed - static module}}
  ],
})
export class AppModule {}
```

{{This module exports:}}
- `EmailService` - {{Send emails via Amazon SES}}
- `AppSyncService` - {{Send real-time notifications via AppSync (GraphQL Subscriptions)}}
- `AppSyncEventsService` - {{Send real-time notifications via AppSync Events API (opt-in, added in v1.3.0)}} → [{{Notification Module}}](/docs/notification-module#appsync-events-service)

## {{Creating Custom Modules}} {#custom-modules}

### {{Step 1: Create Module File}}

```typescript
// src/order/order.module.ts
import { Module } from '@nestjs/common';
import { CommandModule } from '@mbc-cqrs-serverless/core';
import { SequencesModule } from '@mbc-cqrs-serverless/sequence';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderDataSyncHandler } from './handlers/order-data-sync.handler';

@Module({
  imports: [
    CommandModule.register({
      tableName: 'order',
      dataSyncHandlers: [OrderDataSyncHandler],
    }),
    SequencesModule.register({
      enableController: false,
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
```

### {{Step 2: Register in AppModule}}

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { OrderModule } from './order/order.module';

@Module({
  imports: [OrderModule],
})
export class AppModule {}
```

## {{Best Practices}} {#best-practices}

1. **{{One module per entity}}**: {{Create a dedicated module for each business entity}}
2. **{{Export services, not controllers}}**: {{Only export providers that other modules need}}
3. **{{Use forRoot for global modules}}**: {{Register global configuration once in AppModule}}
4. **{{Keep modules focused}}**: {{Each module should have a single responsibility}}

## {{Related Documentation}}

- [{{NestJS Modules}}](https://docs.nestjs.com/modules): {{Official NestJS module documentation}}
- [{{CommandService}}](/docs/command-service): {{Detailed CommandModule configuration}}
- [{{Event Handling Patterns}}](/docs/event-handling-patterns): {{Creating data sync handlers}}
- [{{Notification Module}}](/docs/notification-module): {{Real-time notifications and email via AppSync and SES}}
