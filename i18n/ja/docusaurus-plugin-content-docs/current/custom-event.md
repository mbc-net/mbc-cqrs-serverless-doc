---
description: アプリケーションでカスタム イベントを作成し、このイベントに応答するハンドラーを登録する方法を学びます。

---

# カスタムイベント

このガイドでは、アプリケーションでカスタム イベントを作成し、このイベントに応答するハンドラーを登録するプロセスについて説明します。イベントは、アプリケーションのロジックを分離する強力な方法であり、緊密に統合されずにシステムのさまざまな部分が通信できるようになります。

まず、`@mbc-cqrs-serverless/core` から `IEvent` インターフェイスを実装するカスタム イベントを作成する必要があります。イベントに応じて、通常は「SNSEventRecord」、「SQSRecord」、「DynamoDBRecord」、「EventBridgeEvent」、「S3EventRecord」などの「aws-lambda」ライブラリから 2 番目のインターフェイスを実装する必要があります。

次の例では、カスタム S3 イベントを作成し、このイベント ハンドラーを登録します。

```ts
// custom-s3-import.event
import { IEvent } from "@mbc-cqrs-serverless/core";
import { S3EventRecord, S3EventRecordGlacierEventData } from "aws-lambda";

export class CustomS3EventRecord implements IEvent, S3EventRecord {
  source: string;
  eventVersion: string;
  eventSource: string;
  awsRegion: string;
  eventTime: string;
  eventName: string;
  userIdentity: { principalId: string };
  requestParameters: { sourceIPAddress: string };
  responseElements: { "x-amz-request-id": string; "x-amz-id-2": string };
  glacierEventData?: S3EventRecordGlacierEventData;
  s3: {
    s3SchemaVersion: string;
    configurationId: string;
    bucket: {
      name: string;
      ownerIdentity: { principalId: string };
      arn: string;
    };
    object: {
      key: string;
      size: number;
      eTag: string;
      versionId?: string | undefined;
      sequencer: string;
    };
  };

  fromS3Record(record: S3EventRecord): S3ImportEvent {
    Object.assign(this, record, {
      source: record.eventSource,
    });
    return this;
  }
}
```

`CustomS3EventRecord` を配置すると、このイベントのハンドラーを作成できるようになります。

```ts
// custom-s3.event.handler.ts
import { EventHandler, IEventHandler } from "@mbc-cqrs-serverless/core";
import { Logger } from "@nestjs/common";
import { CustomS3EventRecord } from "./custom-s3-import.event";
@EventHandler(CustomS3EventRecord)
export class CustomS3EventHandler
  implements IEventHandler<CustomS3EventRecord>
{
  private readonly logger: Logger = new Logger(S3ImportEventHandler.name);

  constructor() {}
  async execute(event: CustomS3EventRecord): Promise<any> {
    this.logger.debug("executing::", JSON.stringify(event, null, 2));
  }
}
```

ご覧のとおり、`CustomS3EventHandler` は `@EventHandler(T)` デコレータで注釈が付けられたクラスであり、`IEventHandler<T>` インターフェイスを実装しています。

最後に、`DefaultEventFactory` を拡張し、`@EventFactory()` デコレータで注釈が付けられた CustomEventFactory を作成する必要があります。

```ts
import {
  DefaultEventFactory,
  EventFactory,
  IEvent,
} from "@mbc-cqrs-serverless/core";
import { Logger } from "@nestjs/common";
import { S3Event } from "aws-lambda";

import { S3ImportEvent } from "./quote-import/event/s3-import.event";

@EventFactory()
export class CustomEventFactory extends DefaultEventFactory {
  private readonly logger = new Logger(CustomEventFactory.name);

  async transformS3(event: S3Event): Promise<IEvent[]> {
    const s3Events = event.Records.map((record) => {
      const isCustomEvent = true;
      if (isCustomEvent) {
        return new S3ImportEvent().fromS3Record(record);
      }
      return undefined;
    }).filter((event) => !!event);

    return s3Events;
  }
}
```


同様に、`DefaultEventFactory` クラスの他のメソッドをオーバーライドして、カスタム イベントを作成および処理することができます。

```ts
transformSqs(event: SQSEvent): Promise<IEvent[]>;
transformSns(event: SNSEvent): Promise<IEvent[]>;
transformDynamodbStream(event: DynamoDBStreamEvent): Promise<IEvent[]>;
transformEventBridge(event: EventBridgeEvent<any, any>): Promise<IEvent[]>;
transformStepFunction(event: StepFunctionsEvent<any>): Promise<IEvent[]>;
transformS3(event: S3Event): Promise<IEvent[]>;
```
