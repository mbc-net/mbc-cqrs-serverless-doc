---
description: APIコールとCSVファイルからのデータ取り込みを扱う、Importモジュールの設定と利用方法を学びます。
---

# インポート

Importパッケージは、MBC CQRS Serverlessエコシステム内でデータインポートタスクを管理するための、包括的で拡張可能なフレームワークを提供します。これにより、以下のことが可能になります：:

- 複数のソース（API、CSV）からの一元的なデータ処理。

- 2フェーズのストラテジーパターンによる、完全にカスタマイズ可能なロジック。

- スケーラビリティのための非同期・イベント駆動型の実行。

- CSVファイルに対する2つの処理モード（Direct vs. Step Function）。

- すべてのインポート操作に対する監査と結果の追跡。

## インストール

```bash
npm install @mbc-cqrs-serverless/import
```

## コアコンセプト

このモジュールは、初期のデータ取り込みと最終的なビジネスロジックを分離する、2フェーズのアーキテクチャで動作します。

1. インポートフェーズ (`IImportStrategy`): これはエントリーポイントです。その役割は、生データ（JSONオブジェクトまたはCSVの行から）を受け取り、それを標準化されたDTOに**変換**し、**検証**することです。

2. プロセスフェーズ (`IProcessStrategy`): これはビジネスロジックの中核です。一時テーブルから検証済みのDTOを受け取り、既存のデータと**比較**し、作成または更新のための最終的なコマンドペイロードに**マッピング**します。

## 使用方法

Policyエンティティ用にモジュールを設定するためのステップバイステップガイドです。

1. インポートストラテジーの実装

このクラスは、入力データの初期変換と検証を処理します。

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

2. プロセスストラテジーの実装

このクラスは、データを比較およびマッピングするためのコアビジネスロジックを含みます。

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

3. ドメインモジュールの作成

ストラテジークラスを提供およびエクスポートするためのモジュールを作成します。

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

4. カスタムイベントファクトリ

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


5. `ImportModule`の設定

ルートの`AppModule`または専用のフィーチャーモジュールで、`ImportModule`を登録し、プロファイルを提供します。


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