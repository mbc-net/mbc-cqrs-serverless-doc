---
sidebar_position: 18
description: MBC CQRS ServerlessでS3、Step Functions、SQS、DynamoDBストリームからのイベントを処理するパターンを学びます。
---

# イベント処理パターン

このガイドでは、S3、Step Functions、SQS、DynamoDBストリームを含む様々なAWSイベントソースを使用したイベント駆動アーキテクチャの実装パターンについて説明します。

## このガイドを使用するタイミング

以下の場合にこのガイドを使用してください：

- S3からのファイルアップロードを処理する
- Step Functionsでワークフローを調整する
- SQSからの非同期メッセージを処理する
- DynamoDBストリームを介したデータ変更に対応する
- エラーハンドリングとリトライロジックを実装する
- 通知とアラームを送信する

## イベントアーキテクチャの概要

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│     S3      │────>│             │     │   Event     │
│   Events    │     │             │────>│  Handler 1  │
└─────────────┘     │             │     └─────────────┘
                    │             │
┌─────────────┐     │    Event    │     ┌─────────────┐
│    Step     │────>│   Factory   │────>│   Event     │
│  Functions  │     │             │     │  Handler 2  │
└─────────────┘     │             │     └─────────────┘
                    │             │
┌─────────────┐     │             │     ┌─────────────┐
│     SQS     │────>│             │────>│   Event     │
│   Events    │     │             │     │  Handler 3  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## イベントファクトリー

### カスタムイベントファクトリー

イベントファクトリーは受信イベントを適切なハンドラーにルーティングします：

```typescript
// event-factory.ts
import { Injectable } from '@nestjs/common';
import {
  EventFactory,
  DefaultEventFactory,
  IEvent,
} from '@mbc-cqrs-serverless/core';
import { S3Event } from 'aws-lambda';
import { StepFunctionsEvent, SQSEvent, DynamoDBStreamEvent } from './types';

// Import event classes
import { CsvImportEvent } from './csv-import/event/csv-import.event';
import { FileProcessEvent } from './file/event/file-process.event';
import { OrderCreatedEvent } from './order/event/order-created.event';
import { SendNotificationEvent } from './notification/event/send-notification.event';

@EventFactory()
@Injectable()
export class CustomEventFactory extends DefaultEventFactory {
  /**
   * Transform S3 events to domain events (S3イベントをドメインイベントに変換)
   */
  async transformS3(event: S3Event): Promise<IEvent[]> {
    const events: IEvent[] = [];

    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      // Route based on S3 key pattern (S3キーパターンに基づいてルーティング)
      if (key.startsWith('imports/csv/')) {
        events.push(new CsvImportEvent({
          bucket,
          key,
          eventType: record.eventName,
          size: record.s3.object.size,
        }));
      } else if (key.startsWith('uploads/')) {
        events.push(new FileProcessEvent({
          bucket,
          key,
          eventType: record.eventName,
        }));
      }
    }

    return events;
  }

  /**
   * Transform Step Functions events to domain events (Step Functionsイベントをドメインイベントに変換)
   */
  async transformStepFunction(event: StepFunctionsEvent): Promise<IEvent[]> {
    const { type, payload, taskToken } = event;

    switch (type) {
      case 'CSV_IMPORT':
        return [new CsvImportEvent({
          ...payload,
          taskToken,
        })];

      case 'ORDER_PROCESS':
        return [new OrderCreatedEvent({
          ...payload,
          taskToken,
        })];

      default:
        console.warn(`Unknown Step Function event type: ${type}`);
        return [];
    }
  }

  /**
   * Transform SQS events to domain events (SQSイベントをドメインイベントに変換)
   */
  async transformSqs(event: SQSEvent): Promise<IEvent[]> {
    const events: IEvent[] = [];

    for (const record of event.Records) {
      const body = JSON.parse(record.body);

      switch (body.type) {
        case 'SEND_NOTIFICATION':
          events.push(new SendNotificationEvent(body));
          break;
        // Add more event types as needed (必要に応じてイベントタイプを追加)
      }
    }

    return events;
  }

  /**
   * Transform DynamoDB stream events to domain events (DynamoDBストリームイベントをドメインイベントに変換)
   */
  async transformDynamodbStream(event: DynamoDBStreamEvent): Promise<IEvent[]> {
    const events: IEvent[] = [];

    for (const record of event.Records) {
      if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
        const newImage = record.dynamodb?.NewImage;
        if (newImage) {
          // Route based on entity type (エンティティタイプに基づいてルーティング)
          const pk = newImage.pk?.S || '';
          if (pk.startsWith('ORDER#')) {
            events.push(new OrderCreatedEvent({
              pk,
              sk: newImage.sk?.S,
              data: newImage,
            }));
          }
        }
      }
    }

    return events;
  }
}
```

### イベントファクトリーの登録

```typescript
// main.module.ts
import { Module } from '@nestjs/common';
import { CustomEventFactory } from './event-factory';

@Module({
  providers: [CustomEventFactory],
  // ... other configuration
})
export class MainModule {}
```

## イベントハンドラーパターン

### 基本イベントハンドラー

```typescript
// order/event/order-created.event.ts
export class OrderCreatedEvent {
  pk: string;
  sk: string;
  orderId: string;
  tenantCode: string;
  taskToken?: string;

  constructor(data: Partial<OrderCreatedEvent>) {
    Object.assign(this, data);
  }
}

// order/event/order-created.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventHandler, IEventHandler } from '@mbc-cqrs-serverless/core';
import { OrderCreatedEvent } from './order-created.event';
import { NotificationService } from '../../notification/notification.service';
import { InventoryService } from '../../inventory/inventory.service';

interface OrderProcessingResult {
  success: boolean;
  orderId: string;
}

@EventHandler(OrderCreatedEvent)
@Injectable()
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent, OrderProcessingResult> {
  private readonly logger = new Logger(OrderCreatedHandler.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Handle order created event (注文作成イベントを処理)
   */
  async execute(event: OrderCreatedEvent): Promise<OrderProcessingResult> {
    this.logger.log(`Processing order: ${event.orderId}`);

    try {
      // Process order-related tasks (注文関連タスクを処理)
      await Promise.all([
        this.updateInventory(event),
        this.sendNotification(event),
        this.triggerWorkflow(event),
      ]);

      return {
        success: true,
        orderId: event.orderId,
      };
    } catch (error) {
      this.logger.error(`Failed to process order ${event.orderId}:`, error);
      throw error;
    }
  }

  private async updateInventory(event: OrderCreatedEvent): Promise<void> {
    await this.inventoryService.reserveItems(event.orderId);
  }

  private async sendNotification(event: OrderCreatedEvent): Promise<void> {
    await this.notificationService.sendOrderConfirmation(event.orderId);
  }

  private async triggerWorkflow(event: OrderCreatedEvent): Promise<void> {
    // Trigger additional workflows if needed (必要に応じて追加ワークフローをトリガー)
  }
}
```

### Step Functionsイベントハンドラー

タスクトークンサポートを使用してStep Functionsからのイベントを処理します：

```typescript
// import/event/import-process.event.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  EventHandler,
  IEventHandler,
  StepFunctionService,
  SnsService,
  SnsEvent,
} from '@mbc-cqrs-serverless/core';
import { ConfigService } from '@nestjs/config';
import { ImportProcessEvent } from './import-process.event';
import { ImportService } from '../import.service';

// Define SNS event for alarm notifications
class AlarmSnsEvent extends SnsEvent {
  importId: string;
  bucket: string;
  key: string;
  errorMessage: string;
  timestamp: string;
}

@EventHandler(ImportProcessEvent)
@Injectable()
export class ImportProcessEventHandler
  implements IEventHandler<ImportProcessEvent>
{
  private readonly logger = new Logger(ImportProcessEventHandler.name);
  private readonly alarmTopicArn: string;

  constructor(
    private readonly importService: ImportService,
    private readonly sfnService: StepFunctionService,
    private readonly snsService: SnsService,
    private readonly configService: ConfigService,
  ) {
    this.alarmTopicArn = this.configService.get<string>('SNS_ALARM_TOPIC_ARN');
  }

  /**
   * Process import with Step Function callback (Step Functionsコールバックでインポートを処理)
   */
  async execute(event: ImportProcessEvent): Promise<{ success: boolean; importId: string }> {
    this.logger.log(`Processing import: ${event.importId}`);

    try {
      // Process the import
      const result = await this.importService.processImport(event);

      // Resume Step Functions execution on success
      if (event.taskToken) {
        await this.sfnService.resumeExecution(event.taskToken, result);
      }

      return { success: true, importId: event.importId };
    } catch (error) {
      this.logger.error(`Import failed: ${event.importId}`, error);

      // Send alarm notification (アラーム通知を送信)
      await this.sendAlarm(event, error as Error);

      throw error;
    }
  }

  private async sendAlarm(event: ImportProcessEvent, error: Error): Promise<void> {
    const alarmEvent: AlarmSnsEvent = {
      action: 'IMPORT_ERROR',
      importId: event.importId,
      bucket: event.bucket,
      key: event.key,
      errorMessage: error.message,
      timestamp: new Date().toISOString(),
    };

    await this.snsService.publish(alarmEvent, this.alarmTopicArn);
  }
}
```

### S3イベントハンドラー

S3からのファイルアップロードを処理します：

```typescript
// file/event/file-upload.event.ts
export class FileUploadEvent {
  bucket: string;
  key: string;
  size: number;
  eventType: string;

  constructor(data: Partial<FileUploadEvent>) {
    Object.assign(this, data);
  }
}

// file/event/file-upload.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventHandler, IEventHandler, S3Service } from '@mbc-cqrs-serverless/core';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { FileUploadEvent } from './file-upload.event';
import { FileProcessService } from '../file-process.service';

interface FileProcessingResult {
  status: 'processed' | 'skipped';
  fileType?: string;
  reason?: string;
}

@EventHandler(FileUploadEvent)
@Injectable()
export class FileUploadHandler implements IEventHandler<FileUploadEvent, FileProcessingResult> {
  private readonly logger = new Logger(FileUploadHandler.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly fileProcessService: FileProcessService,
  ) {}

  /**
   * Process uploaded file (アップロードされたファイルを処理)
   */
  async execute(event: FileUploadEvent): Promise<FileProcessingResult> {
    this.logger.log(`Processing file: ${event.key}`);

    // Get file content from S3
    const command = new GetObjectCommand({
      Bucket: event.bucket,
      Key: event.key,
    });
    const response = await this.s3Service.client.send(command);

    // Determine file type and process accordingly (ファイルタイプを判定して適切に処理)
    const fileExtension = event.key.split('.').pop()?.toLowerCase();

    switch (fileExtension) {
      case 'csv':
        await this.fileProcessService.processCsv(response.Body, event);
        return { status: 'processed', fileType: 'csv' };
      case 'xlsx':
      case 'xls':
        await this.fileProcessService.processExcel(response.Body, event);
        return { status: 'processed', fileType: fileExtension };
      case 'pdf':
        await this.fileProcessService.processPdf(response.Body, event);
        return { status: 'processed', fileType: 'pdf' };
      case 'jpg':
      case 'jpeg':
      case 'png':
        await this.fileProcessService.processImage(response.Body, event);
        return { status: 'processed', fileType: fileExtension };
      default:
        this.logger.warn(`Unsupported file type: ${fileExtension}`);
        return { status: 'skipped', reason: 'Unsupported file type' };
    }
  }
}
```

### SQSイベントハンドラー

SQSからの非同期メッセージを処理します：

```typescript
// notification/event/send-notification.event.ts
export class SendNotificationEvent {
  type: 'EMAIL' | 'SMS' | 'PUSH';
  recipient: string;
  subject: string;
  body: string;
  templateId?: string;
  templateData?: Record<string, any>;

  constructor(data: Partial<SendNotificationEvent>) {
    Object.assign(this, data);
  }
}

// notification/event/send-notification.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  EventHandler,
  IEventHandler,
  EmailService,
} from '@mbc-cqrs-serverless/core';
import { SendNotificationEvent } from './send-notification.event';

interface NotificationResult {
  status: 'sent' | 'skipped';
  type: 'EMAIL' | 'SMS' | 'PUSH';
  reason?: string;
}

@EventHandler(SendNotificationEvent)
@Injectable()
export class SendNotificationHandler
  implements IEventHandler<SendNotificationEvent, NotificationResult>
{
  private readonly logger = new Logger(SendNotificationHandler.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Send notification based on type (タイプに基づいて通知を送信)
   */
  async execute(event: SendNotificationEvent): Promise<NotificationResult> {
    this.logger.log(`Sending ${event.type} notification to ${event.recipient}`);

    switch (event.type) {
      case 'EMAIL':
        return this.sendEmail(event);
      case 'SMS':
        return this.sendSms(event);
      case 'PUSH':
        return this.sendPush(event);
      default:
        throw new Error(`Unknown notification type: ${event.type}`);
    }
  }

  private async sendEmail(event: SendNotificationEvent): Promise<NotificationResult> {
    let body = event.body;

    // Render template if provided (テンプレートが指定されている場合レンダリング)
    if (event.templateId && event.templateData) {
      body = await this.renderTemplate(event.templateId, event.templateData);
    }

    await this.emailService.sendEmail({
      toAddrs: [event.recipient],
      subject: event.subject,
      body,
    });

    return { status: 'sent', type: 'EMAIL' };
  }

  private async sendSms(event: SendNotificationEvent): Promise<NotificationResult> {
    // Implement SMS sending logic
    this.logger.log('SMS sending not implemented');
    return { status: 'skipped', type: 'SMS', reason: 'Not implemented' };
  }

  private async sendPush(event: SendNotificationEvent): Promise<NotificationResult> {
    // Implement push notification logic
    this.logger.log('Push notification not implemented');
    return { status: 'skipped', type: 'PUSH', reason: 'Not implemented' };
  }

  private async renderTemplate(
    templateId: string,
    data: Record<string, any>,
  ): Promise<string> {
    // Template rendering logic
    return `Template ${templateId} rendered with data`;
  }
}
```

## DynamoDBストリームハンドラー

### データ変更イベントハンドラー

DynamoDBのデータ変更に対応します：

```typescript
// sync/event/data-change.event.ts
export class DataChangeEvent {
  pk: string;
  sk: string;
  eventType: 'INSERT' | 'MODIFY' | 'REMOVE';
  oldImage?: Record<string, any>;
  newImage?: Record<string, any>;

  constructor(data: Partial<DataChangeEvent>) {
    Object.assign(this, data);
  }
}

// sync/event/data-change.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventHandler, IEventHandler } from '@mbc-cqrs-serverless/core';
import { DataChangeEvent } from './data-change.event';
import { ExternalSyncService } from '../external-sync.service';
import { CacheService } from '../../cache/cache.service';

interface DataSyncResult {
  synced: boolean;
  type?: string;
}

@EventHandler(DataChangeEvent)
@Injectable()
export class DataChangeHandler implements IEventHandler<DataChangeEvent, DataSyncResult> {
  private readonly logger = new Logger(DataChangeHandler.name);

  constructor(
    private readonly externalSyncService: ExternalSyncService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Handle data changes from DynamoDB stream (DynamoDBストリームからのデータ変更を処理)
   */
  async execute(event: DataChangeEvent): Promise<DataSyncResult> {
    this.logger.log(
      `Data change: ${event.eventType} on ${event.pk}/${event.sk}`,
    );

    // Invalidate cache (キャッシュを無効化)
    await this.cacheService.invalidate(event.pk, event.sk);

    // Sync to external systems based on entity type (エンティティタイプに基づいて外部システムに同期)
    const entityType = event.pk.split('#')[0];

    switch (entityType) {
      case 'PRODUCT':
        return this.syncProduct(event);
      case 'ORDER':
        return this.syncOrder(event);
      case 'USER':
        return this.syncUser(event);
      default:
        this.logger.debug(`No external sync for entity type: ${entityType}`);
        return { synced: false };
    }
  }

  private async syncProduct(event: DataChangeEvent): Promise<DataSyncResult> {
    if (event.eventType === 'REMOVE') {
      await this.externalSyncService.deleteProduct(event.pk, event.sk);
    } else {
      await this.externalSyncService.upsertProduct(event.newImage);
    }
    return { synced: true, type: 'PRODUCT' };
  }

  private async syncOrder(event: DataChangeEvent): Promise<DataSyncResult> {
    // Sync order to external ERP system (外部ERPシステムに注文を同期)
    await this.externalSyncService.syncOrder(event.newImage);
    return { synced: true, type: 'ORDER' };
  }

  private async syncUser(event: DataChangeEvent): Promise<DataSyncResult> {
    // Sync user to external identity provider (外部IDプロバイダーにユーザーを同期)
    await this.externalSyncService.syncUser(event.newImage);
    return { synced: true, type: 'USER' };
  }
}
```

## エラーハンドリングとリトライ

以下のパターンは、アプリケーションでエラーハンドリングとリトライロジックを実装する方法を示しています。これらは、プロジェクト内で独自に作成する必要がある実装例です。

### リトライパターンの例

:::info 実装例
以下のリトライデコレーターはフレームワークでは提供されていません。Lambda実行内でリトライ機能が必要な場合は、自分で実装する必要があります。
:::

```typescript
// common/event/retry.decorator.ts
import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  backoffMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Example retry decorator for event handlers (イベントハンドラー用のリトライデコレーター例)
 */
export function WithRetry(options: Partial<RetryOptions> = {}) {
  const retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const logger = new Logger(`${target.constructor.name}.${propertyKey}`);

    descriptor.value = async function (...args: any[]) {
      let lastError: Error;
      let delay = retryOptions.backoffMs;

      for (let attempt = 1; attempt <= retryOptions.maxRetries; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;
          logger.warn(
            `Attempt ${attempt}/${retryOptions.maxRetries} failed: ${error.message}`,
          );

          if (attempt < retryOptions.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= retryOptions.backoffMultiplier;
          }
        }
      }

      logger.error(`All ${retryOptions.maxRetries} attempts failed`);
      throw lastError!;
    };

    return descriptor;
  };
}
```

### AWSネイティブのリトライオプション

本番環境では、AWSネイティブのリトライメカニズムの使用を検討してください：

- **SQSリトライ**: SQSキューの`maxReceiveCount`を設定して、失敗したメッセージを自動的にリトライします
- **Lambdaリトライ**: 非同期呼び出しのLambda関数にリトライ設定を構成します
- **Step Functionsリトライ**: ステートマシン定義で`Retry`フィールドを使用します

## ベストプラクティス

### 1. 冪等なイベントハンドラー

```typescript
interface IdempotentResult {
  skipped?: boolean;
  processed?: boolean;
}

// Always check if event was already processed (イベントが既に処理されたかどうかを常にチェック)
async execute(event: OrderEvent): Promise<IdempotentResult> {
  const existing = await this.prismaService.processedEvent.findUnique({
    where: { eventId: event.eventId },
  });

  if (existing) {
    this.logger.log(`Event ${event.eventId} already processed, skipping`);
    return { skipped: true };
  }

  // Process event
  const result = await this.processEvent(event);

  // Mark as processed
  await this.prismaService.processedEvent.create({
    data: { eventId: event.eventId, processedAt: new Date() },
  });

  return { processed: true, ...result };
}
```

### 2. 構造化ロギング

```typescript
// Use structured logging for better observability (より良い可観測性のために構造化ログを使用)
this.logger.log({
  message: 'Processing event',
  eventType: event.constructor.name,
  eventId: event.id,
  tenantCode: event.tenantCode,
  correlationId: event.correlationId,
});
```

### 3. タイムアウト処理

```typescript
interface TimeoutResult {
  success: boolean;
  data?: Record<string, unknown>;
}

// Implement timeout for long-running operations (長時間実行される操作にタイムアウトを実装)
async execute(event: LongRunningEvent): Promise<TimeoutResult> {
  const timeout = 25000; // 25 seconds (Lambda default is 30s)

  const result = await Promise.race([
    this.processEvent(event),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout')), timeout),
    ),
  ]);

  return result;
}
```

### 4. グレースフルデグラデーション

```typescript
interface BatchProcessingResult {
  processed: number;
  failed: number;
}

// Continue processing even if some operations fail (一部の操作が失敗しても処理を継続)
async execute(event: BatchEvent): Promise<BatchProcessingResult> {
  const results: unknown[] = [];
  const errors: Array<{ item: unknown; error: string }> = [];

  for (const item of event.items) {
    try {
      results.push(await this.processItem(item));
    } catch (error) {
      errors.push({ item, error: (error as Error).message });
      // Continue with next item (次のアイテムに進む)
    }
  }

  if (errors.length > 0) {
    this.logger.warn(`${errors.length} items failed`, { errors });
  }

  return { processed: results.length, failed: errors.length };
}
```

## データ同期ハンドラー

データ同期イベントは、アプリケーション内で最もよく登録されるイベントの1つであるため、特に重要なカスタムイベントです。このイベントのハンドラーは、異なるデータベース間のデータ整合性と同期を確保する上で重要な役割を果たします。

### IDataSyncHandlerインターフェース

慣例として、`IDataSyncHandler`を実装するクラスを作成し、upとdownメソッドをオーバーライドします：

```typescript
import { CommandModel, IDataSyncHandler } from "@mbc-cqrs-serverless/core";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma";

@Injectable()
export class ProductDataSyncRdsHandler implements IDataSyncHandler<void, void> {
  private readonly logger = new Logger(ProductDataSyncRdsHandler.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Sync data from DynamoDB to RDS on create/update (作成/更新時にDynamoDBからRDSにデータを同期)
   */
  async up(cmd: CommandModel): Promise<void> {
    this.logger.debug('Syncing to RDS:', cmd.pk, cmd.sk);

    const { pk, sk, id, code, name, tenantCode, attributes } = cmd;

    await this.prismaService.product.upsert({
      where: { id },
      create: {
        id,
        pk,
        sk,
        code,
        name,
        tenantCode,
        ...attributes,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        name,
        ...attributes,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Handle delete/rollback operations (削除/ロールバック操作を処理)
   */
  async down(cmd: CommandModel): Promise<void> {
    this.logger.debug('Removing from RDS:', cmd.pk, cmd.sk);

    await this.prismaService.product.delete({
      where: { id: cmd.id },
    }).catch(() => {
      // Ignore if already deleted (既に削除されている場合は無視)
    });
  }
}
```

### データ同期ハンドラーの登録

ハンドラーを`CommandModule`に登録します：

```typescript
import { Module } from '@nestjs/common';
import { CommandModule } from '@mbc-cqrs-serverless/core';
import { ProductDataSyncRdsHandler } from './handler/product-rds.handler';

@Module({
  imports: [
    CommandModule.register({
      tableName: 'product',
      dataSyncHandlers: [ProductDataSyncRdsHandler],
    }),
  ],
  // ...
})
export class ProductModule {}
```

### 複数の同期ハンドラー

異なる同期ターゲットに対して複数のハンドラーを登録できます：

```typescript
CommandModule.register({
  tableName: 'order',
  dataSyncHandlers: [
    OrderRdsSyncHandler,      // Sync to RDS for queries
    OrderElasticSyncHandler,  // Sync to Elasticsearch for search
    OrderAnalyticsSyncHandler, // Sync to analytics warehouse
  ],
}),
```

## カスタムイベントの作成

カスタムイベントを作成するには、`@mbc-cqrs-serverless/core`から`IEvent`インターフェースを実装します。イベントソースに応じて、`aws-lambda`ライブラリから`SNSEventRecord`、`SQSRecord`、`DynamoDBRecord`、`EventBridgeEvent`、`S3EventRecord`などの2番目のインターフェースも実装する必要があります。

### カスタムS3イベントの例

```typescript
// custom-s3-import.event.ts
import { IEvent } from "@mbc-cqrs-serverless/core";
import { S3EventRecord } from "aws-lambda";

export class CustomS3ImportEvent implements IEvent, Partial<S3EventRecord> {
  source: string;
  bucket: string;
  key: string;
  size: number;
  eventType: string;

  static fromS3Record(record: S3EventRecord): CustomS3ImportEvent {
    const event = new CustomS3ImportEvent();
    event.source = record.eventSource;
    event.bucket = record.s3.bucket.name;
    event.key = record.s3.object.key;
    event.size = record.s3.object.size;
    event.eventType = record.eventName;
    return event;
  }
}
```

### イベントファクトリーの変換メソッド

イベントファクトリーは様々なAWSソースからのイベント変換をサポートしています：

```typescript
// Available transform methods in DefaultEventFactory
transformSqs(event: SQSEvent): Promise<IEvent[]>;
transformSns(event: SNSEvent): Promise<IEvent[]>;
transformDynamodbStream(event: DynamoDBStreamEvent): Promise<IEvent[]>;
transformEventBridge(event: EventBridgeEvent<any, any>): Promise<IEvent[]>;
transformStepFunction(event: StepFunctionsEvent<any>): Promise<IEvent[]>;
transformS3(event: S3Event): Promise<IEvent[]>;
```

## 関連ドキュメント

- [バックエンド開発ガイド](./backend-development) - コアパターン
- [Step Functions](./architecture/step-functions) - ワークフローオーケストレーション
- [データ同期ハンドラーの例](./data-sync-handler-examples) - 包括的な同期の例
