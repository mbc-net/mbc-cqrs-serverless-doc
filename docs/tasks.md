---
description: {{Learn how to create and process long-running task}}
---

# {{Task}}

{{The Task package provides comprehensive task management functionality in the MBC CQRS Serverless framework. It enables:}}

- {{Asynchronous task execution}}
- {{Task status tracking}}
- {{Progress monitoring}}
- {{Error handling and retries}}
- {{Task queue management}}
- {{Task history and logging}}

## {{Architecture}}

```mermaid
sequenceDiagram
    participant Client
    participant TaskService
    participant DynamoDB
    participant StepFunctions
    participant Lambda

    Client->>TaskService: createTask() / createStepFunctionTask()
    TaskService->>DynamoDB: Save task (PENDING)
    TaskService->>StepFunctions: Start execution
    StepFunctions-->>TaskService: Execution ARN
    TaskService-->>Client: TaskEntity

    loop For each sub-task
        StepFunctions->>Lambda: Execute sub-task
        Lambda->>DynamoDB: Update status (IN_PROGRESS)
        Lambda->>Lambda: Process
        Lambda->>DynamoDB: Update status (COMPLETED/FAILED)
    end

    StepFunctions->>DynamoDB: Update parent task status
```

## {{Installation}}

```bash
npm install @mbc-cqrs-serverless/task
```

## {{Usage}}

{{There are 2 type task processing:}}

- {{Single task processing}}
- {{Task processing with Step function}}

### {{Single task processing}}

1. {{Define task event}}

```ts
import { TaskQueueEvent } from "@mbc-cqrs-serverless/task";

export class TaskEvent extends TaskQueueEvent {}
```

2. {{Define task event handler}}

```ts
import { EventHandler, IEventHandler } from "@mbc-cqrs-serverless/core";
import { Logger } from "@nestjs/common";

import { TaskEvent } from "./task.event";

@EventHandler(TaskEvent)
export class TaskEventHandler implements IEventHandler<TaskEvent> {
  private readonly logger = new Logger(TaskEventHandler.name);

  constructor() {}

  async execute(event: TaskEvent): Promise<any> {
    this.logger.debug("executing task event::", event);

    //

    this.logger.debug(`Process task completed: ${event.taskEvent.eventID}`);
    return "Result after process";
  }
}
```

3. {{Implement `ITaskQueueEventFactory`}}

```ts
import {
  ITaskQueueEventFactory,
  TaskQueueEvent,
} from "@mbc-cqrs-serverless/task";
import { TaskEvent } from "src/sample/handler/task.event";

export class TaskQueueEventFactory implements ITaskQueueEventFactory {
  async transformTask(event: TaskQueueEvent): Promise<any[]> {
    return [new TaskEvent().fromSqsRecord(event)];
  }
}
```

4. {{Custom `TaskModule`}}

```ts
import { TaskModule } from "@mbc-cqrs-serverless/task";
import { Module } from "@nestjs/common";
import { TaskEventHandler } from "src/sample/handler/task.handler";

import { TaskQueueEventFactory } from "./task-queue-event-factory";

@Module({
  imports: [
    TaskModule.register({
      taskQueueEventFactory: TaskQueueEventFactory,
      enableController: true, // Optional: enable REST endpoints for task management
    }),
  ],
  providers: [TaskEventHandler],
  exports: [TaskModule],
})
export class CustomTaskModule {}
```

5. {{Custom `EventFactoryAddedTask`}}

```ts
import { EventFactory, IEvent } from "@mbc-cqrs-serverless/core";
import { EventFactoryAddedTask, TaskEvent } from "@mbc-cqrs-serverless/task";
import { Logger } from "@nestjs/common";
import { DynamoDBStreamEvent } from "aws-lambda";

@EventFactory()
export class CustomEventFactory extends EventFactoryAddedTask {
  private readonly logger = new Logger(CustomEventFactory.name);
  async transformDynamodbStream(event: DynamoDBStreamEvent): Promise<IEvent[]> {
    const curEvents = await super.transformDynamodbStream(event);
    const taskEvents = event.Records.map((record) => {
      if (
        record.eventSourceARN.endsWith("tasks") ||
        record.eventSourceARN.includes("tasks" + "/stream/")
      ) {
        if (record.eventName === "INSERT") {
          return new TaskEvent().fromDynamoDBRecord(record);
        }
      }
      return undefined;
    })
      .filter((event) => !!event)
      .filter((event) => event.taskEntity.sk.split("#").length < 3);

    return [...curEvents, ...taskEvents];
  }
}
```

6. {{Create a Task}}

### {{Task processing with Step function}}

1. {{Define step function task event}}

```ts
import { StepFunctionTaskEvent } from "@mbc-cqrs-serverless/task";

export class SfnTaskEvent extends StepFunctionTaskEvent {}
```

2. {{Define step function task event handler}}

```ts
import {
  EventHandler,
  IEventHandler,
  StepFunctionService,
} from "@mbc-cqrs-serverless/core";
import { TaskService } from "@mbc-cqrs-serverless/task";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { SfnTaskEvent } from "./sfn-task.event";

@EventHandler(SfnTaskEvent)
export class SfnTaskEventHandler implements IEventHandler<SfnTaskEvent> {
  private readonly logger = new Logger(SfnTaskEventHandler.name);

  constructor() {}

  async execute(event: SfnTaskEvent): Promise<any> {
    this.logger.debug("executing task event::", event);

    //

    return "Result after process";
  }
}
```

3. {{Implement `ITaskQueueEventFactory`}}

```ts
import {
  ITaskQueueEventFactory,
  StepFunctionTaskEvent,
} from "@mbc-cqrs-serverless/task";
import { SfnTaskEvent } from "src/sample/handler/sfn-task.event";

export class TaskQueueEventFactory implements ITaskQueueEventFactory {
  async transformStepFunctionTask(event: StepFunctionTaskEvent): Promise<any[]> {
    return [new SfnTaskEvent(event)];
  }
}
```

4. {{Custom `TaskModule`}}

```ts
import { TaskModule } from "@mbc-cqrs-serverless/task";
import { Module } from "@nestjs/common";
import { TaskEventHandler } from "src/sample/handler/task.handler";

import { TaskQueueEventFactory } from "./task-queue-event-factory";

@Module({
  imports: [
    TaskModule.register({
      taskQueueEventFactory: TaskQueueEventFactory,
      enableController: true, // Optional: enable REST endpoints for task management
    }),
  ],
  providers: [TaskEventHandler],
  exports: [TaskModule],
})
export class CustomTaskModule {}
```

5. {{Custom `EventFactoryAddedTask`}}

```ts
import { EventFactory, IEvent } from "@mbc-cqrs-serverless/core";
import { EventFactoryAddedTask, TaskEvent } from "@mbc-cqrs-serverless/task";
import { Logger } from "@nestjs/common";
import { DynamoDBStreamEvent } from "aws-lambda";

@EventFactory()
export class CustomEventFactory extends EventFactoryAddedTask {
  private readonly logger = new Logger(CustomEventFactory.name);
  async transformDynamodbStream(event: DynamoDBStreamEvent): Promise<IEvent[]> {
    const curEvents = await super.transformDynamodbStream(event);
    const taskEvents = event.Records.map((record) => {
      if (
        record.eventSourceARN.endsWith("tasks") ||
        record.eventSourceARN.includes("tasks" + "/stream/")
      ) {
        if (record.eventName === "INSERT") {
          return new TaskEvent().fromDynamoDBRecord(record);
        }
      }
      return undefined;
    })
      .filter((event) => !!event)
      .filter((event) => event.taskEntity.sk.split("#").length < 3);

    return [...curEvents, ...taskEvents];
  }
}
```

6. {{Create a step function task}}

```ts
const item = [
  { key: "value1" },
  { key: "value2" },
  { key: "value3" },
  { key: "value4" },
  { key: "value5" },
  { key: "value6" },
];

await this.taskService.createStepFunctionTask(
  {
    input: item,
    taskType: "cat",
    tenantCode: "mbc",
  },
  { invokeContext }
);
```
