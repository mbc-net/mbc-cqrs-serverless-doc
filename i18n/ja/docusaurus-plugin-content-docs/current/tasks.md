---
description: 長時間実行タスクの作成および処理方法を学ぶ
---

# タスクモジュール

Taskパッケージは、MBC CQRS Serverlessフレームワークにおいて包括的なタスク管理機能を提供します。これにより、以下のことが可能になります：

- 非同期タスク実行
- タスクステータスの追跡
- 進捗の監視
- エラーハンドリングと再試行
- タスキュー管理
- タスク履歴とロギング

## アーキテクチャ

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

## インストール

```bash
npm install @mbc-cqrs-serverless/task
```

## 使用方法

タスク処理には2つのタイプがあります：

- 単一タスク処理
- Step Functionを使用したタスク処理

### 単一タスク処理

1. タスクイベントの定義

```ts
import { TaskQueueEvent } from "@mbc-cqrs-serverless/task";

export class TaskEvent extends TaskQueueEvent {}
```

2. タスクイベントハンドラーの定義

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

3. `ITaskQueueEventFactory`の実装

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

4. カスタム`TaskModule`

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

5. カスタム`EventFactoryAddedTask`

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

6. タスクの作成

### Step Functionを使用したタスク処理

1. Step Functionタスクイベントの定義

```ts
import { StepFunctionTaskEvent } from "@mbc-cqrs-serverless/task";

export class SfnTaskEvent extends StepFunctionTaskEvent {}
```

2. Step Functionタスクイベントハンドラーの定義

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

3. `ITaskQueueEventFactory`の実装

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

4. カスタム`TaskModule`

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

5. カスタム`EventFactoryAddedTask`

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

6. Step Functionタスクの作成

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

## APIリファレンス

### TaskServiceメソッド

#### `createTask(dto: CreateTaskDto, options: { invokeContext: IInvoke }): Promise<TaskEntity>`

単一タスク処理用の新しいタスクを作成します。

```ts
const task = await this.taskService.createTask(
  {
    taskType: "data-export",
    tenantCode: "mbc",
    name: "Export user data",
    input: { userId: "123", format: "csv" },
  },
  { invokeContext }
);
```

#### `createStepFunctionTask(dto: CreateTaskDto, options: { invokeContext: IInvoke }): Promise<TaskEntity>`

Step Functions処理用の新しいタスクを作成します。入力配列はサブタスクとして処理されます。

```ts
const task = await this.taskService.createStepFunctionTask(
  {
    taskType: "batch-process",
    tenantCode: "mbc",
    name: "Process batch items",
    input: [{ id: 1 }, { id: 2 }, { id: 3 }],
  },
  { invokeContext }
);
```

#### `getTask(key: DetailKey): Promise<TaskEntity>`

プライマリキーでタスクを取得します。

```ts
const task = await this.taskService.getTask({
  pk: "TASK#mbc",
  sk: "data-export#01HXYZ123",
});
```

#### `listItemsByPk(tenantCode: string, type?: string, options?): Promise<TaskListEntity>`

テナントコードとタイプでタスクを一覧表示します。

```ts
// List all tasks for a tenant (テナントのすべてのタスクを一覧表示)
const tasks = await this.taskService.listItemsByPk("mbc", "TASK", {
  limit: 10,
  order: "desc",
});

// List Step Function tasks (Step Functionタスクを一覧表示)
const sfnTasks = await this.taskService.listItemsByPk("mbc", "SFN_TASK");
```

#### `createSubTask(event: TaskQueueEvent): Promise<TaskEntity[]>`

親タスクの入力配列からサブタスクを作成します。入力配列の各項目が個別のサブタスクになります。

```ts
// Typically called within a TaskQueueEvent handler (通常、TaskQueueEventハンドラー内で呼び出す)
const subTasks = await this.taskService.createSubTask(event);
// Returns array of TaskEntity for each input item (各入力項目に対するTaskEntityの配列を返す)
```

#### `getAllSubTask(subTask: DetailKey): Promise<TaskEntity[]>`

親タスクのすべてのサブタスクを取得します。

```ts
const subTasks = await this.taskService.getAllSubTask({
  pk: "SFN_TASK#mbc",
  sk: "batch-process#01HXYZ123#0", // Any subtask key (任意のサブタスクキー)
});
// Returns all subtasks under the parent task (親タスク配下のすべてのサブタスクを返す)
```

#### `updateStatus(key: DetailKey, status: string, attributes?: { result?: any; error?: any }, notifyId?: string)`

タスクのステータスを更新し、SNS通知を送信します。

```ts
// Mark task as completed (タスクを完了としてマーク)
await this.taskService.updateStatus(
  { pk: "TASK#mbc", sk: "data-export#01HXYZ123" },
  "COMPLETED",
  { result: { exportedRows: 100 } }
);

// Mark task as failed (タスクを失敗としてマーク)
await this.taskService.updateStatus(
  { pk: "TASK#mbc", sk: "data-export#01HXYZ123" },
  "FAILED",
  { error: { message: "Export failed", code: "EXPORT_ERROR" } }
);
```

#### `updateSubTaskStatus(key: DetailKey, status: string, attributes?: { result?: any; error?: any }, notifyId?: string)`

サブタスクのステータスを更新し、アクション`"sub-task-status"`でSNS通知を送信します。

```ts
await this.taskService.updateSubTaskStatus(
  { pk: "SFN_TASK#mbc", sk: "batch-process#01HXYZ123#0" },
  "COMPLETED",
  { result: { processedItem: { id: 1 } } }
);
```

#### `updateStepFunctionTask(key: DetailKey, attributes?: Record<string, any>, status?: string, notifyId?: string)`

属性とステータスでStep Functionタスクを更新し、SNS通知を送信します。

```ts
await this.taskService.updateStepFunctionTask(
  { pk: "SFN_TASK#mbc", sk: "batch-process#01HXYZ123" },
  { executionArn: "arn:aws:states:..." },
  "PROCESSING"
);
```

### タスクステータス値

| ステータス | 説明 |
|------------|-----------------|
| `CREATED` | タスクは作成されましたが、まだ開始されていません |
| `PROCESSING` | タスクは現在処理中です |
| `COMPLETED` | タスクは正常に完了しました |
| `FAILED` | タスクはエラーで失敗しました |
