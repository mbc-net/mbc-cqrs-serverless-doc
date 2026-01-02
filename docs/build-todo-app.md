---
description: {{Build a complete Todo application step by step, learning CQRS patterns along the way.}}
---

# {{Build a Todo App}}

{{This tutorial guides you through building a complete Todo application using MBC CQRS Serverless. You'll learn CQRS patterns, event handling, and progressive feature additions.}}

## {{What You'll Build}}

{{A fully functional Todo application with:}}

- {{CRUD operations for todos}}
- {{CQRS pattern with Command/Query separation}}
- {{Event-driven data synchronization}}
- {{Optional: Sequence numbers for todos}}
- {{Optional: Async task processing}}

## {{Prerequisites}}

- {{Completed the [Quickstart Tutorial](./quickstart-tutorial)}}
- {{Basic understanding of NestJS}}
- {{Docker running for local development}}

## {{Part 1: Basic CQRS Implementation}}

### {{Step 1: Create the Todo Module}}

{{Create the directory structure:}}

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

### {{Step 2: Define Entities}}

{{Create the command entity (`entity/todo-command.entity.ts`):}}

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

{{Create the data entity (`entity/todo-data.entity.ts`):}}

```typescript
import { DataEntity } from '@mbc-cqrs-serverless/core';

export class TodoDataEntity extends DataEntity {
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
}
```

### {{Step 3: Create DTOs}}

{{Create input DTOs (`dto/create-todo.dto.ts`):}}

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

{{Create update DTO (`dto/update-todo.dto.ts`):}}

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateTodoDto } from './create-todo.dto';

export class UpdateTodoDto extends PartialType(CreateTodoDto) {}
```

{{Create search DTO (`dto/search-todo.dto.ts`):}}

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
  nextToken?: string;
}
```

### {{Step 4: Implement the Service}}

{{Create the todo service (`todo.service.ts`):}}

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
  ): Promise<{ items: TodoDataEntity[]; nextToken?: string }> {
    const tenantCode = context.invokeContext.tenantCode;

    return this.dataService.listByPk<TodoDataEntity>({
      pk: `TODO#${tenantCode}`,
      limit: searchDto.limit,
      nextToken: searchDto.nextToken,
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

### {{Step 5: Create the Controller}}

{{Create the controller (`todo.controller.ts`):}}

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

### {{Step 6: Create the Event Handler}}

{{Create the RDS sync handler (`handler/todo-rds.handler.ts`):}}

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

### {{Step 7: Create the Module}}

{{Create the module (`todo.module.ts`):}}

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

### {{Step 8: Register in Main Module}}

{{Update `main.module.ts`:}}

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

## {{Part 2: Adding Sequence Numbers}}

{{Add auto-incrementing todo numbers.}}

### {{Install Sequence Module}}

```bash
npm install @mbc-cqrs-serverless/sequence
```

### {{Update Main Module}}

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

### {{Update Todo Service}}

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

## {{Part 3: Adding Async Task Processing}}

{{Process long-running todo operations asynchronously.}}

### {{Install Task Module}}

```bash
npm install @mbc-cqrs-serverless/task
```

### {{Create Task Event}}

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

### {{Create Task Handler}}

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

### {{Register Task Module}}

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

## {{Testing Your Application}}

### {{Run Locally}}

```bash
npm run offline:docker
npm run migrate
npm run offline:sls
```

### {{Test API Endpoints}}

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

## {{Next Steps}}

- {{[Deployment Guide](./deployment-guide) - Deploy to AWS}}
- {{[Testing](./testing) - Write unit and e2e tests}}
- {{[Monitoring](./monitoring-logging) - Add observability}}
