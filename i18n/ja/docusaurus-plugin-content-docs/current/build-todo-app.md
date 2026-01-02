---
description: CQRSパターンを学びながら、完全なTodoアプリケーションをステップバイステップで構築します。
---

# Todoアプリの構築

このチュートリアルでは、MBC CQRS Serverlessを使用して完全なTodoアプリケーションを構築する方法を説明します。CQRSパターン、イベントハンドリング、段階的な機能追加を学びます。

## 構築するもの

以下の機能を持つ完全に機能するTodoアプリケーション：

- TodoのCRUD操作
- コマンド/クエリ分離によるCQRSパターン
- イベント駆動型データ同期
- オプション：Todoのシーケンス番号
- オプション：非同期タスク処理

## 前提条件

- [クイックスタートチュートリアル](./quickstart-tutorial)を完了していること
- NestJSの基本的な理解
- ローカル開発用にDockerが実行中であること

## パート1：基本的なCQRS実装

### ステップ1：Todoモジュールの作成

ディレクトリ構造を作成：

```
src/
└── todo/
    ├── dto/
    │   ├── create-todo.dto.ts
    │   ├── update-todo.dto.ts
    │   └── search-todo.dto.ts
    ├── entity/
    │   ├── todo-command.entity.ts
    │   └── todo-data.entity.ts
    ├── handler/
    │   └── todo-rds.handler.ts
    ├── todo.controller.ts
    ├── todo.service.ts
    └── todo.module.ts
```

### ステップ2：エンティティの定義

コマンドエンティティを作成（`entity/todo-command.entity.ts`）：

```typescript
import { CommandEntity, CommandModel } from '@mbc-cqrs-serverless/core';

export class TodoCommandEntity extends CommandEntity {
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
}

export class TodoCommandDto extends CommandModel<TodoCommandEntity> {
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
}
```

データエンティティを作成（`entity/todo-data.entity.ts`）：

```typescript
import { DataEntity } from '@mbc-cqrs-serverless/core';

export class TodoDataEntity extends DataEntity {
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
}
```

### ステップ3：DTOの作成

入力DTOを作成（`dto/create-todo.dto.ts`）：

```typescript
import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateTodoDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean = false;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
```

更新DTOを作成（`dto/update-todo.dto.ts`）：

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateTodoDto } from './create-todo.dto';

export class UpdateTodoDto extends PartialType(CreateTodoDto) {}
```

検索DTOを作成（`dto/search-todo.dto.ts`）：

```typescript
import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';

export class SearchTodoDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsString()
  lastSk?: string;
}
```

### ステップ4：サービスの実装

Todoサービスを作成（`todo.service.ts`）：

```typescript
import { Injectable } from '@nestjs/common';
import {
  CommandService,
  DataService,
  generateId,
  IInvoke
} from '@mbc-cqrs-serverless/core';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { SearchTodoDto } from './dto/search-todo.dto';
import { TodoCommandDto, TodoCommandEntity } from './entity/todo-command.entity';
import { TodoDataEntity } from './entity/todo-data.entity';

@Injectable()
export class TodoService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
  ) {}

  async create(
    dto: CreateTodoDto,
    context: { invokeContext: IInvoke },
  ): Promise<TodoCommandEntity> {
    const id = generateId();
    const tenantCode = context.invokeContext.tenantCode;

    const pk = `TODO#${tenantCode}`;
    const sk = `TODO#${id}`;

    const command = new TodoCommandDto({
      pk,
      sk,
      id,
      tenantCode,
      type: 'TODO',
      name: dto.title,
      title: dto.title,
      description: dto.description,
      completed: dto.completed ?? false,
      dueDate: dto.dueDate,
    });

    return this.commandService.publishAsync(command, {
      invokeContext: context.invokeContext,
    });
  }

  async findAll(
    searchDto: SearchTodoDto,
    context: { invokeContext: IInvoke },
  ): Promise<{ items: TodoDataEntity[]; lastSk?: string }> {
    const tenantCode = context.invokeContext.tenantCode;

    return this.dataService.listItemsByPk(`TODO#${tenantCode}`, {
      limit: searchDto.limit,
      startFromSk: searchDto.lastSk,
    });
  }

  async findOne(
    id: string,
    context: { invokeContext: IInvoke },
  ): Promise<TodoDataEntity> {
    const tenantCode = context.invokeContext.tenantCode;

    return this.dataService.getItem<TodoDataEntity>({
      pk: `TODO#${tenantCode}`,
      sk: `TODO#${id}`,
    });
  }

  async update(
    id: string,
    dto: UpdateTodoDto,
    context: { invokeContext: IInvoke },
  ): Promise<TodoCommandEntity> {
    const tenantCode = context.invokeContext.tenantCode;
    const existing = await this.findOne(id, context);

    const command = new TodoCommandDto({
      ...existing,
      ...dto,
      name: dto.title ?? existing.name,
    });

    return this.commandService.publishAsync(command, {
      invokeContext: context.invokeContext,
    });
  }

  async remove(
    id: string,
    context: { invokeContext: IInvoke },
  ): Promise<void> {
    const tenantCode = context.invokeContext.tenantCode;

    await this.commandService.publishPartialUpdateAsync(
      {
        pk: `TODO#${tenantCode}`,
        sk: `TODO#${id}`,
      },
      { isDeleted: true },
      { invokeContext: context.invokeContext },
    );
  }
}
```

### ステップ5：コントローラーの作成

コントローラーを作成（`todo.controller.ts`）：

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  INVOKE_CONTEXT,
  IInvoke,
  getUserContext
} from '@mbc-cqrs-serverless/core';
import { TodoService } from './todo.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { SearchTodoDto } from './dto/search-todo.dto';

@Controller('todos')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Post()
  async create(
    @Body() createTodoDto: CreateTodoDto,
    @INVOKE_CONTEXT() invokeContext: IInvoke,
  ) {
    return this.todoService.create(createTodoDto, { invokeContext });
  }

  @Get()
  async findAll(
    @Query() searchDto: SearchTodoDto,
    @INVOKE_CONTEXT() invokeContext: IInvoke,
  ) {
    return this.todoService.findAll(searchDto, { invokeContext });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @INVOKE_CONTEXT() invokeContext: IInvoke,
  ) {
    return this.todoService.findOne(id, { invokeContext });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTodoDto: UpdateTodoDto,
    @INVOKE_CONTEXT() invokeContext: IInvoke,
  ) {
    return this.todoService.update(id, updateTodoDto, { invokeContext });
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @INVOKE_CONTEXT() invokeContext: IInvoke,
  ) {
    return this.todoService.remove(id, { invokeContext });
  }
}
```

### ステップ6：イベントハンドラーの作成

RDS同期ハンドラーを作成（`handler/todo-rds.handler.ts`）：

```typescript
import { EventHandler, IEventHandler } from '@mbc-cqrs-serverless/core';
import { DataSyncEvent } from '@mbc-cqrs-serverless/core';
import { PrismaService } from '../../prisma/prisma.service';
import { TodoDataEntity } from '../entity/todo-data.entity';

@EventHandler(DataSyncEvent)
export class TodoRdsHandler implements IEventHandler<DataSyncEvent> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(event: DataSyncEvent): Promise<void> {
    // Only process TODO entities
    if (!event.sk.startsWith('TODO#')) {
      return;
    }

    const data = event.getDataEntity<TodoDataEntity>();

    switch (event.eventName) {
      case 'INSERT':
      case 'MODIFY':
        await this.upsertTodo(data);
        break;
      case 'REMOVE':
        await this.deleteTodo(data);
        break;
    }
  }

  private async upsertTodo(todo: TodoDataEntity): Promise<void> {
    await this.prisma.todo.upsert({
      where: { id: todo.id },
      create: {
        id: todo.id,
        tenantCode: todo.tenantCode,
        title: todo.title,
        description: todo.description,
        completed: todo.completed,
        dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
        createdAt: new Date(todo.createdAt),
        updatedAt: new Date(todo.updatedAt),
      },
      update: {
        title: todo.title,
        description: todo.description,
        completed: todo.completed,
        dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
        updatedAt: new Date(todo.updatedAt),
      },
    });
  }

  private async deleteTodo(todo: TodoDataEntity): Promise<void> {
    await this.prisma.todo.delete({
      where: { id: todo.id },
    });
  }
}
```

### ステップ7：モジュールの作成

モジュールを作成（`todo.module.ts`）：

```typescript
import { Module } from '@nestjs/common';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';
import { TodoRdsHandler } from './handler/todo-rds.handler';

@Module({
  controllers: [TodoController],
  providers: [TodoService, TodoRdsHandler],
  exports: [TodoService],
})
export class TodoModule {}
```

### ステップ8：メインモジュールへの登録

`main.module.ts`を更新：

```typescript
import { Module } from '@nestjs/common';
import { CommandModule } from '@mbc-cqrs-serverless/core';
import { TodoModule } from './todo/todo.module';

@Module({
  imports: [
    CommandModule.register({ tableName: 'your-table-name' }),
    TodoModule,
  ],
})
export class MainModule {}
```

## パート2：シーケンス番号の追加

自動インクリメントのTodo番号を追加。

### シーケンスモジュールのインストール

```bash
npm install @mbc-cqrs-serverless/sequence
```

### メインモジュールの更新

```typescript
import { SequencesModule } from '@mbc-cqrs-serverless/sequence';

@Module({
  imports: [
    CommandModule.register({ tableName: 'your-table-name' }),
    SequencesModule.register({ enableController: false }),
    TodoModule,
  ],
})
export class MainModule {}
```

### Todoサービスの更新

```typescript
import { SequencesService, RotateByEnum } from '@mbc-cqrs-serverless/sequence';

@Injectable()
export class TodoService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
    private readonly sequencesService: SequencesService,
  ) {}

  async create(dto: CreateTodoDto, context: { invokeContext: IInvoke }) {
    const tenantCode = context.invokeContext.tenantCode;

    // Generate sequential todo number
    const todoNumber = await this.sequencesService.generate({
      tenantCode,
      typeCode: 'TODO',
      rotateBy: RotateByEnum.NONE, // Or YEARLY, MONTHLY, DAILY
    });

    const pk = `TODO#${tenantCode}`;
    const sk = `TODO#${todoNumber.formattedNo}`;

    const command = new TodoCommandDto({
      pk,
      sk,
      id: todoNumber.formattedNo,
      tenantCode,
      todoNumber: todoNumber.formattedNo,
      // ... rest of properties
    });

    return this.commandService.publishAsync(command, {
      invokeContext: context.invokeContext,
    });
  }
}
```

## パート3：非同期タスク処理の追加

長時間実行されるTodo操作を非同期で処理。

### タスクモジュールのインストール

```bash
npm install @mbc-cqrs-serverless/task
```

### タスクイベントの作成

```typescript
// handler/todo-task.event.ts
import { TaskQueueEvent } from '@mbc-cqrs-serverless/task';
import { TodoDataEntity } from '../entity/todo-data.entity';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export class TodoTaskEvent extends TaskQueueEvent {
  get todo(): TodoDataEntity {
    return new TodoDataEntity(
      unmarshall(this.taskEvent.dynamodb.NewImage?.input?.M as any),
    );
  }
}
```

### タスクハンドラーの作成

```typescript
// handler/todo-task.handler.ts
import { EventHandler, IEventHandler } from '@mbc-cqrs-serverless/core';
import { TodoTaskEvent } from './todo-task.event';

@EventHandler(TodoTaskEvent)
export class TodoTaskHandler implements IEventHandler<TodoTaskEvent> {
  async execute(event: TodoTaskEvent): Promise<any> {
    const todo = event.todo;

    // Perform long-running operation
    // e.g., send notification, sync to external system
    console.log(`Processing todo: ${todo.id}`);

    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 2000));

    return { processed: true, todoId: todo.id };
  }
}
```

### タスクモジュールの登録

```typescript
import { TaskModule } from '@mbc-cqrs-serverless/task';

@Module({
  imports: [
    TaskModule.register({
      taskQueueEventFactory: YourTaskQueueEventFactory,
    }),
    // ... other imports
  ],
})
export class MainModule {}
```

## アプリケーションのテスト

### ローカルで実行

```bash
npm run offline:docker
npm run migrate
npm run offline:sls
```

### APIエンドポイントのテスト

```bash
# Create a todo
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "My First Todo", "description": "Testing CQRS"}'

# List todos
curl http://localhost:3000/todos

# Get a todo
curl http://localhost:3000/todos/<todo-id>

# Update a todo
curl -X PUT http://localhost:3000/todos/<todo-id> \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# Delete a todo
curl -X DELETE http://localhost:3000/todos/<todo-id>
```

## 次のステップ

- [デプロイメントガイド](./deployment-guide) - AWSにデプロイ
- [テスト](./testing) - ユニットテストとE2Eテストを記述
- [モニタリング](./monitoring-logging) - 可観測性を追加
