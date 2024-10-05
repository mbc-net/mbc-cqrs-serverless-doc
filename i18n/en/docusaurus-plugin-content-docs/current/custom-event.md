---
description: Learn how to create a custom event in your application and register a handler to respond to this event.
---

# Custom event

This guide will walk you through the process of creating a custom event in your application and registering a handler to respond to this event. Events are a powerful way to decouple your application’s logic, allowing different parts of your system to communicate without being tightly integrated.

First, you need to create a custom event that implements the `IEvent` interface from `@mbc-cqrs-serverless/core`. Depending on the event, you should typically implement a second interface from the `aws-lambda` library, such as `SNSEventRecord`, `SQSRecord`, `DynamoDBRecord`, `EventBridgeEvent`, `S3EventRecord`, etc.

In the following example, we will create a custom S3 event and register this event handler.

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

With `CustomS3EventRecord` in place, you can now create a handler for this event.

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

As you can see, `CustomS3EventHandler` is a class annotated with the `@EventHandler(T)` decorator and implements the `IEventHandler<T>` interface.

Finally, you need to create a CustomEventFactory that extends `DefaultEventFactory` and is annotated with the `@EventFactory()` decorator.

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

Similarly, you could override other methods of the `DefaultEventFactory` class to create and handle custom events.

```ts
transformSqs(event: SQSEvent): Promise<IEvent[]>;
transformSns(event: SNSEvent): Promise<IEvent[]>;
transformDynamodbStream(event: DynamoDBStreamEvent): Promise<IEvent[]>;
transformEventBridge(event: EventBridgeEvent<any, any>): Promise<IEvent[]>;
transformStepFunction(event: StepFunctionsEvent<any>): Promise<IEvent[]>;
transformS3(event: S3Event): Promise<IEvent[]>;
```
