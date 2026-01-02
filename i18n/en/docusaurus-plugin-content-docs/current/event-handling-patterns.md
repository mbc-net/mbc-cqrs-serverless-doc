---
sidebar_position: 18
description: Learn patterns for handling events from S3, Step Functions, SQS, and DynamoDB streams in MBC CQRS Serverless.
---

# Event Handling Patterns

This guide covers patterns for implementing event-driven architectures using various AWS event sources including S3, Step Functions, SQS, and DynamoDB streams.

## When to Use This Guide

Use this guide when you need to:

- Process file uploads from S3
- Orchestrate workflows with Step Functions
- Handle asynchronous messages from SQS
- React to data changes via DynamoDB streams
- Implement error handling and retry logic
- Send notifications and alarms

## Event Architecture Overview

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

## Event Factory

### Custom Event Factory

The Event Factory routes incoming events to appropriate handlers:

```typescript
// event-factory.ts
import { Injectable } from '@nestjs/common';
import {
  EventFactory,
  EventFactoryBase,
  IEvent,
} from '@mbc-cqrs-serverless/core';
import { S3Event } from 'aws-lambda';
import { StepFunctionsEvent, SQSEvent, DynamoDBStreamEvent } from './types';

// Import event classes
import { CsvImportEvent } from './csv-import/event/csv-import.event';
import { FileProcessEvent } from './file/event/file-process.event';
import { OrderCreatedEvent } from './order/event/order-created.event';

@EventFactory()
@Injectable()
export class CustomEventFactory extends EventFactoryBase {
  /**
   * Transform S3 events to domain events
   * S3イベントをドメインイベントに変換
   */
  async transformS3(event: S3Event): Promise<IEvent[]> {
    const events: IEvent[] = [];

    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      // Route based on S3 key pattern
      // S3キーパターンに基づいてルーティング
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
   * Transform Step Functions events to domain events
   * Step Functionsイベントをドメインイベントに変換
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
   * Transform SQS events to domain events
   * SQSイベントをドメインイベントに変換
   */
  async transformSqs(event: SQSEvent): Promise<IEvent[]> {
    const events: IEvent[] = [];

    for (const record of event.Records) {
      const body = JSON.parse(record.body);

      switch (body.type) {
        case 'NOTIFICATION':
          events.push(new NotificationEvent(body));
          break;
        case 'SYNC_REQUEST':
          events.push(new SyncRequestEvent(body));
          break;
      }
    }

    return events;
  }

  /**
   * Transform DynamoDB stream events to domain events
   * DynamoDBストリームイベントをドメインイベントに変換
   */
  async transformDynamodbStream(event: DynamoDBStreamEvent): Promise<IEvent[]> {
    const events: IEvent[] = [];

    for (const record of event.Records) {
      if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
        const newImage = record.dynamodb?.NewImage;
        if (newImage) {
          // Route based on entity type
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

### Register Event Factory

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

## Event Handler Patterns

### Basic Event Handler

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

@EventHandler(OrderCreatedEvent)
@Injectable()
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent> {
  private readonly logger = new Logger(OrderCreatedHandler.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Handle order created event
   * 注文作成イベントを処理
   */
  async execute(event: OrderCreatedEvent): Promise<any> {
    this.logger.log(`Processing order: ${event.orderId}`);

    try {
      // Process order-related tasks
      // 注文関連タスクを処理
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
    // Trigger additional workflows if needed
  }
}
```

### Step Function Event Handler

Handle events from Step Functions with task token support:

```typescript
// import/event/import-process.event.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  EventHandler,
  IEventHandler,
  StepFunctionService,
  SNSService,
} from '@mbc-cqrs-serverless/core';
import { ConfigService } from '@nestjs/config';
import { ImportProcessEvent } from './import-process.event';
import { ImportService } from '../import.service';

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
    private readonly snsService: SNSService,
    private readonly configService: ConfigService,
  ) {
    this.alarmTopicArn = this.configService.get<string>('SNS_ALARM_TOPIC_ARN');
  }

  /**
   * Process import with Step Function callback
   * Step Functionコールバック付きでインポートを処理
   */
  async execute(event: ImportProcessEvent): Promise<any> {
    this.logger.log(`Processing import: ${event.importId}`);

    try {
      // Process the import
      const result = await this.importService.processImport(event);

      // Report success to Step Functions
      // Step Functionsに成功を報告
      if (event.taskToken) {
        await this.sfnService.sendTaskSuccess(event.taskToken, result);
      }

      return result;
    } catch (error) {
      this.logger.error(`Import failed: ${event.importId}`, error);

      // Send alarm notification
      // アラーム通知を送信
      await this.sendAlarm(event, error);

      // Report failure to Step Functions
      // Step Functionsに失敗を報告
      if (event.taskToken) {
        await this.sfnService.sendTaskFailure(
          event.taskToken,
          error.message,
          'ImportProcessError',
        );
      }

      throw error;
    }
  }

  private async sendAlarm(event: ImportProcessEvent, error: Error): Promise<void> {
    await this.snsService.publish({
      topicArn: this.alarmTopicArn,
      subject: `Import Error: ${event.importId}`,
      message: JSON.stringify({
        importId: event.importId,
        bucket: event.bucket,
        key: event.key,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      }, null, 2),
    });
  }
}
```

### S3 Event Handler

Process file uploads from S3:

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

@EventHandler(FileUploadEvent)
@Injectable()
export class FileUploadHandler implements IEventHandler<FileUploadEvent> {
  private readonly logger = new Logger(FileUploadHandler.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly fileProcessService: FileProcessService,
  ) {}

  /**
   * Process uploaded file
   * アップロードされたファイルを処理
   */
  async execute(event: FileUploadEvent): Promise<any> {
    this.logger.log(`Processing file: ${event.key}`);

    // Get file content
    const command = new GetObjectCommand({
      Bucket: event.bucket,
      Key: event.key,
    });
    const response = await this.s3Service.client.send(command);

    // Determine file type and process accordingly
    // ファイルタイプを判定して適切に処理
    const fileExtension = event.key.split('.').pop()?.toLowerCase();

    switch (fileExtension) {
      case 'csv':
        return this.fileProcessService.processCsv(response.Body, event);
      case 'xlsx':
      case 'xls':
        return this.fileProcessService.processExcel(response.Body, event);
      case 'pdf':
        return this.fileProcessService.processPdf(response.Body, event);
      case 'jpg':
      case 'jpeg':
      case 'png':
        return this.fileProcessService.processImage(response.Body, event);
      default:
        this.logger.warn(`Unsupported file type: ${fileExtension}`);
        return { status: 'skipped', reason: 'Unsupported file type' };
    }
  }
}
```

### SQS Event Handler

Process asynchronous messages from SQS:

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

@EventHandler(SendNotificationEvent)
@Injectable()
export class SendNotificationHandler
  implements IEventHandler<SendNotificationEvent>
{
  private readonly logger = new Logger(SendNotificationHandler.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Send notification based on type
   * タイプに基づいて通知を送信
   */
  async execute(event: SendNotificationEvent): Promise<any> {
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

  private async sendEmail(event: SendNotificationEvent): Promise<any> {
    let body = event.body;

    // Render template if provided
    // テンプレートが提供されている場合はレンダリング
    if (event.templateId && event.templateData) {
      body = await this.renderTemplate(event.templateId, event.templateData);
    }

    await this.emailService.send({
      toAddrs: [event.recipient],
      subject: event.subject,
      body,
    });

    return { status: 'sent', type: 'EMAIL' };
  }

  private async sendSms(event: SendNotificationEvent): Promise<any> {
    // Implement SMS sending logic
    this.logger.log('SMS sending not implemented');
    return { status: 'skipped', type: 'SMS' };
  }

  private async sendPush(event: SendNotificationEvent): Promise<any> {
    // Implement push notification logic
    this.logger.log('Push notification not implemented');
    return { status: 'skipped', type: 'PUSH' };
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

## DynamoDB Stream Handler

### Data Change Event Handler

React to data changes in DynamoDB:

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

@EventHandler(DataChangeEvent)
@Injectable()
export class DataChangeHandler implements IEventHandler<DataChangeEvent> {
  private readonly logger = new Logger(DataChangeHandler.name);

  constructor(
    private readonly externalSyncService: ExternalSyncService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Handle data changes from DynamoDB stream
   * DynamoDBストリームからのデータ変更を処理
   */
  async execute(event: DataChangeEvent): Promise<any> {
    this.logger.log(
      `Data change: ${event.eventType} on ${event.pk}/${event.sk}`,
    );

    // Invalidate cache
    // キャッシュを無効化
    await this.cacheService.invalidate(event.pk, event.sk);

    // Sync to external systems based on entity type
    // エンティティタイプに基づいて外部システムに同期
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

  private async syncProduct(event: DataChangeEvent): Promise<any> {
    if (event.eventType === 'REMOVE') {
      await this.externalSyncService.deleteProduct(event.pk, event.sk);
    } else {
      await this.externalSyncService.upsertProduct(event.newImage);
    }
    return { synced: true, type: 'PRODUCT' };
  }

  private async syncOrder(event: DataChangeEvent): Promise<any> {
    // Sync order to external ERP system
    await this.externalSyncService.syncOrder(event.newImage);
    return { synced: true, type: 'ORDER' };
  }

  private async syncUser(event: DataChangeEvent): Promise<any> {
    // Sync user to external identity provider
    await this.externalSyncService.syncUser(event.newImage);
    return { synced: true, type: 'USER' };
  }
}
```

## Error Handling and Retry

### Retry Pattern with Dead Letter Queue

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
 * Retry decorator for event handlers
 * イベントハンドラー用のリトライデコレータ
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

### Using Retry Decorator

```typescript
@EventHandler(ProcessOrderEvent)
@Injectable()
export class ProcessOrderHandler implements IEventHandler<ProcessOrderEvent> {
  @WithRetry({ maxRetries: 3, backoffMs: 500 })
  async execute(event: ProcessOrderEvent): Promise<any> {
    // This method will be retried up to 3 times on failure
    // このメソッドは失敗時に最大3回リトライされる
    return this.processOrder(event);
  }
}
```

### Dead Letter Queue Handler

```typescript
// dlq/dlq.event.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventHandler, IEventHandler, SNSService } from '@mbc-cqrs-serverless/core';
import { DlqEvent } from './dlq.event';
import { PrismaService } from '../../prisma/prisma.service';

@EventHandler(DlqEvent)
@Injectable()
export class DlqEventHandler implements IEventHandler<DlqEvent> {
  private readonly logger = new Logger(DlqEventHandler.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly snsService: SNSService,
  ) {}

  /**
   * Handle failed events from Dead Letter Queue
   * デッドレターキューからの失敗イベントを処理
   */
  async execute(event: DlqEvent): Promise<any> {
    this.logger.error(`DLQ event received: ${event.originalMessageId}`);

    // Store failed event for analysis
    // 分析用に失敗イベントを保存
    await this.prismaService.failedEvent.create({
      data: {
        messageId: event.originalMessageId,
        eventType: event.eventType,
        payload: event.payload,
        errorMessage: event.errorMessage,
        retryCount: event.retryCount,
        createdAt: new Date(),
      },
    });

    // Send alert for manual intervention
    // 手動介入用のアラートを送信
    await this.snsService.publish({
      topicArn: process.env.ALERT_TOPIC_ARN!,
      subject: 'Event Processing Failed - Manual Intervention Required',
      message: JSON.stringify({
        messageId: event.originalMessageId,
        eventType: event.eventType,
        errorMessage: event.errorMessage,
        timestamp: new Date().toISOString(),
      }, null, 2),
    });

    return { logged: true };
  }
}
```

## Alarm and Notification

### Alarm Service

```typescript
// alarm/alarm.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SNSService } from '@mbc-cqrs-serverless/core';
import { ConfigService } from '@nestjs/config';

export interface AlarmPayload {
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  source: string;
  message: string;
  details?: Record<string, any>;
  error?: Error;
}

@Injectable()
export class AlarmService {
  private readonly logger = new Logger(AlarmService.name);
  private readonly alarmTopicArn: string;

  constructor(
    private readonly snsService: SNSService,
    private readonly configService: ConfigService,
  ) {
    this.alarmTopicArn = this.configService.get<string>('SNS_ALARM_TOPIC_ARN')!;
  }

  /**
   * Send alarm notification
   * アラーム通知を送信
   */
  async sendAlarm(payload: AlarmPayload): Promise<void> {
    const timestamp = new Date().toISOString();

    const message = {
      severity: payload.severity,
      source: payload.source,
      message: payload.message,
      details: payload.details,
      error: payload.error ? {
        name: payload.error.name,
        message: payload.error.message,
        stack: payload.error.stack,
      } : undefined,
      timestamp,
      environment: this.configService.get('NODE_ENV'),
    };

    await this.snsService.publish({
      topicArn: this.alarmTopicArn,
      subject: `[${payload.severity}] ${payload.source}: ${payload.message.substring(0, 50)}`,
      message: JSON.stringify(message, null, 2),
    });

    this.logger.log(`Alarm sent: ${payload.severity} - ${payload.message}`);
  }

  /**
   * Send critical error alarm
   * クリティカルエラーアラームを送信
   */
  async critical(source: string, message: string, error?: Error): Promise<void> {
    await this.sendAlarm({
      severity: 'CRITICAL',
      source,
      message,
      error,
    });
  }

  /**
   * Send error alarm
   * エラーアラームを送信
   */
  async error(source: string, message: string, error?: Error): Promise<void> {
    await this.sendAlarm({
      severity: 'ERROR',
      source,
      message,
      error,
    });
  }

  /**
   * Send warning alarm
   * 警告アラームを送信
   */
  async warning(source: string, message: string, details?: Record<string, any>): Promise<void> {
    await this.sendAlarm({
      severity: 'WARNING',
      source,
      message,
      details,
    });
  }
}
```

## Best Practices

### 1. Idempotent Event Handlers

```typescript
// Always check if event was already processed
// イベントが既に処理されたかどうかを常にチェック
async execute(event: OrderEvent): Promise<any> {
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

  return result;
}
```

### 2. Structured Logging

```typescript
// Use structured logging for better observability
// より良い可観測性のために構造化ログを使用
this.logger.log({
  message: 'Processing event',
  eventType: event.constructor.name,
  eventId: event.id,
  tenantCode: event.tenantCode,
  correlationId: event.correlationId,
});
```

### 3. Timeout Handling

```typescript
// Implement timeout for long-running operations
// 長時間実行される操作にタイムアウトを実装
async execute(event: LongRunningEvent): Promise<any> {
  const timeout = 25000; // 25 seconds (Lambda default is 30s)

  const result = await Promise.race([
    this.processEvent(event),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout')), timeout),
    ),
  ]);

  return result;
}
```

### 4. Graceful Degradation

```typescript
// Continue processing even if some operations fail
// 一部の操作が失敗しても処理を継続
async execute(event: BatchEvent): Promise<any> {
  const results = [];
  const errors = [];

  for (const item of event.items) {
    try {
      results.push(await this.processItem(item));
    } catch (error) {
      errors.push({ item, error: error.message });
      // Continue with next item
    }
  }

  if (errors.length > 0) {
    await this.alarmService.warning(
      'BatchProcessor',
      `${errors.length} items failed`,
      { errors },
    );
  }

  return { processed: results.length, failed: errors.length };
}
```

## Related Documentation

- [Backend Development Guide](./backend-development.md) - Core patterns / コアパターン
- [Custom Event](./custom-event.md) - Event configuration / イベント設定
- [Step Functions](./architecture/step-functions.md) - Workflow orchestration / ワークフローオーケストレーション
- [Data Sync Event](./data-sync-event.md) - Data synchronization / データ同期
