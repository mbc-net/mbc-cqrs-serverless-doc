---
description: Learn how to configure and utilize the Import module for handling data ingestion from API calls and CSV files.
---

# Import

The Import package provides a comprehensive and extensible framework for managing data import tasks within the MBC CQRS Serverless ecosystem. It enables:

- Unified data processing from multiple sources (API, CSV).

- Fully customizable logic via a two-phase strategy pattern.

- Asynchronous, event-driven execution for scalability.

- Dual processing modes for CSV files (Direct vs. Step Function).

- Auditing and result tracking for all import operations.

## Installation

```bash
npm install @mbc-cqrs-serverless/import
```

## Core concept

The module operates on a two-phase architecture, separating initial data ingestion from the final business logic.

1. Import Phase (`IImportStrategy`): This is the entry point. Its role is to take raw data (from a JSON object or a CSV row), **transform** it into a standardized DTO, and **validate** it.

2. Process Phase (`IProcessStrategy`): This is the business logic core. It takes the validated DTO from the temporary table, **compares** it with existing data, and **maps** it into a final command payload for creation or update.

## Usage

Here is a step-by-step guide to configure the module for a Policy entity.

1. Implement the Import Strategy

This class handles the initial transformation and validation of incoming data.

```ts
// src/policy/strategies/policy.import-strategy.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BaseImportStrategy, IImportStrategy } from '@mbc-cqrs-serverless/import';
import { PolicyCommandDto } from '../dto/policy-command.dto';

@Injectable()
export class PolicyImportStrategy 
  extends BaseImportStrategy<Record<string, any>, PolicyCommandDto> 
  implements IImportStrategy<Record<string, any>, PolicyCommandDto> 
{
  async transform(input: Record<string, any>): Promise<PolicyCommandDto> {
    const attrSource = input.attributes && typeof input.attributes === 'object' ? input.attributes : input;
    const mappedObject = {
      pk: input.pk,
      sk: input.sk,
      attributes: {
        policyType: attrSource.policyType,
        applyDate: new Date(attrSource.applyDate).toISOString(),
      },
    };
    return plainToInstance(PolicyCommandDto, mappedObject);
  }
}
```

2. Implement the Process Strategy

This class contains the core business logic for comparing and mapping the data.

```ts
// src/policy/strategies/policy.process-strategy.ts
import { Injectable } from '@nestjs/common';
import { CommandService, DataService } from '@mbc-cqrs-serverless/core';
import { BaseProcessStrategy, ComparisonResult, ComparisonStatus } from '@mbc-cqrs-serverless/import';
import { PolicyCommandDto } from '../dto/policy-command.dto';
import { PolicyDataEntity } from '../entity/policy-data.entity';

@Injectable()
export class PolicyProcessStrategy 
  extends BaseProcessStrategy<PolicyDataEntity, PolicyCommandDto> 
  implements IProcessStrategy<PolicyDataEntity, PolicyCommandDto> 
{
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
  ) { super(); }

  getCommandService(): CommandService {
    return this.commandService;
  }

  async compare(dto: PolicyCommandDto, tenantCode: string,): Promise<ComparisonResult<PolicyDataEntity>> {
    const existing = await this.dataService.getItem({ pk: dto.pk, sk: dto.sk });
    if (!existing) return { status: ComparisonStatus.NOT_EXIST };
    // Add custom comparison logic here...
    return { status: ComparisonStatus.EQUAL, existingData: existing as PolicyDataEntity };
  }

  async map(status: ComparisonStatus, dto: PolicyCommandDto, tenantCode: string, existingData?: PolicyDataEntity) {
    if (status === ComparisonStatus.NOT_EXIST) return { ...dto, version: 0 };
    if (status === ComparisonStatus.CHANGED) return { pk: dto.pk, sk: dto.sk, attributes: dto.attributes, version: existingData.version };
    throw new Error('Invalid map status');
  }
}
```

3. Create a Domain Module

Create a module to provide and export your strategy classes.

```ts
// policy/policy.module.ts

import { CommandModule } from '@mbc-cqrs-serverless/core'
import { Module } from '@nestjs/common'
import { SeqModule } from 'src/seq/seq.module'

import { PolicyDataSyncRdsHandler } from './handler/policy-rds.handler'
import { PolicyImportStrategy } from './import/policy.import-strategy'
import { PolicyProcessStrategy } from './import/policy.process-strategy'
import { PolicyController } from './policy.controller'
import { PolicyService } from './policy.service'

@Module({
  imports: [
    CommandModule.register({
      tableName: 'policy',
      dataSyncHandlers: [PolicyDataSyncRdsHandler],
    }),
    SeqModule,
  ],
  controllers: [PolicyController],
  providers: [PolicyService, PolicyImportStrategy, PolicyProcessStrategy],
  exports: [
    PolicyService,
    PolicyImportStrategy,
    PolicyProcessStrategy,
  ],
})
export class PolicyModule {}
```

4. Custom event factory

```ts
// src/event-factory.ts
import {
  EventFactory,
  IEvent,
  StepFunctionsEvent,
} from '@mbc-cqrs-serverless/core'
import {
  CsvImportSfnEvent,
  DEFAULT_IMPORT_ACTION_QUEUE,
  ImportEvent,
  ImportQueueEvent,
} from '@mbc-cqrs-serverless/import'
import { EventFactoryAddedTask, TaskEvent } from '@mbc-cqrs-serverless/task'
import { Logger } from '@nestjs/common'
import { DynamoDBStreamEvent, SQSEvent } from 'aws-lambda'

@EventFactory()
export class CustomEventFactory extends EventFactoryAddedTask {
  private readonly logger = new Logger(CustomEventFactory.name)

  async transformDynamodbStream(event: DynamoDBStreamEvent): Promise<IEvent[]> {
    const curEvents = await super.transformDynamodbStream(event)
    const taskEvents = event.Records.map((record) => {
      if (
        record.eventSourceARN.endsWith('tasks') ||
        record.eventSourceARN.includes('tasks' + '/stream/')
      ) {
        if (record.eventName === 'INSERT') {
          return new TaskEvent().fromDynamoDBRecord(record)
        }
      }
      return undefined
    }).filter((event) => !!event)

    const importEvents = event.Records.map((record) => {
      if (
        record.eventSourceARN.endsWith('import_tmp') ||
        record.eventSourceARN.includes('import_tmp' + '/stream/')
      ) {
        if (record.eventName === 'INSERT') {
          return new ImportEvent().fromDynamoDBRecord(record)
        }
      }
      return undefined
    }).filter((event) => !!event)

    return [...curEvents, ...taskEvents, ...importEvents]
  }

  async transformSqs(event: SQSEvent): Promise<IEvent[]> {
    const curEvents = await super.transformSqs(event)
    const importEvents = event.Records.map((record) => {
      if (record.eventSourceARN.endsWith(DEFAULT_IMPORT_ACTION_QUEUE)) {
        return new ImportQueueEvent().fromSqsRecord(record)
      }

      return undefined
    }).filter((event) => !!event)

    return [...importEvents, ...curEvents]
  }

  async transformStepFunction(
    event: StepFunctionsEvent<any>,
  ): Promise<IEvent[]> {
    if (event.context.StateMachine.Name.includes('import-csv')) {
      const csvImportEvent = new CsvImportSfnEvent(event)
      return [csvImportEvent]
    }
    return super.transformStepFunction(event)
  }
}

```


5. Configure the `ImportModule`

In your root `AppModule` or a dedicated feature module, register the `ImportModule` and provide your profiles.


```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ImportModule } from '@mbc-cqrs-serverless/import';
import { PolicyModule } from './policy/policy.module';
import { PolicyImportStrategy } from './policy/strategies/policy.import-strategy';
import { PolicyProcessStrategy } from './policy/strategies/policy.process-strategy';

@Module({
  imports: [
    PolicyModule, // Import the domain module first
    ImportModule.register({
      enableController: true,
      imports: [PolicyModule], // Make providers from PolicyModule available
      profiles: [
        {
          tableName: 'policy',
          importStrategy: PolicyImportStrategy,
          processStrategy: PolicyProcessStrategy,
        },
      ],
    }),
  ],
  providers: [CustomEventFactory],
})
export class AppModule {}
```