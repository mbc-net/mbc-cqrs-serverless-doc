---
description: Build a complete Todo application step by step, learning CQRS patterns along the way.
---

# Build a Todo App

This tutorial guides you through building a complete Todo application using MBC CQRS Serverless. You'll learn CQRS patterns, event handling, and progressive feature additions.

This tutorial follows the [sample code](https://github.com/mbc-net/mbc-cqrs-serverless-samples) which is organized into progressive steps.

## What You'll Build

A fully functional Todo application with:

- CRUD operations for todos
- CQRS pattern with Command/Query separation
- Event-driven data synchronization to RDS
- Optional: Sequence numbers for todos
- Optional: Async task processing

## Prerequisites

- Completed the [Quickstart Tutorial](./quickstart-tutorial)
- Basic understanding of NestJS
- Docker running for local development

## Running the Samples

Each step has a complete working sample. To run any sample:

```bash
# Navigate to the step directory
cd step-02-create  # or any other step

# Install dependencies
npm install

# Terminal 1: Start Docker services
npm run offline:docker

# Terminal 2: Run database migrations
npm run migrate

# Terminal 3: Start the serverless offline server
npm run offline:sls
```

## Part 1: Basic CQRS Implementation (step-02-create)

### Step 1: Create Helper Functions

First, create helper functions for managing partition keys and sort keys (`src/helpers/id.ts`):

```typescript
import { KEY_SEPARATOR } from '@mbc-cqrs-serverless/core'
import { ulid } from 'ulid'

export const TODO_PK_PREFIX = 'TODO'

export function generateTodoPk(tenantCode: string): string {
  return `${TODO_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`
}

export function generateTodoSk(): string {
  return ulid() // ULID provides time-ordered unique identifiers
}

export function parsePk(pk: string): { type: string; tenantCode: string } {
  if (pk.split(KEY_SEPARATOR).length !== 2) {
    throw new Error('Invalid PK')
  }
  const [type, tenantCode] = pk.split(KEY_SEPARATOR)
  return { type, tenantCode }
}
```

### Step 2: Define DTOs

Create the todo attributes DTO (`dto/todo-attributes.dto.ts`):

```typescript
import { ApiProperty } from '@nestjs/swagger'
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator'

// TodoStatus enum (will be synced with Prisma in step-03)
export enum TodoStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export class TodoAttributes {
  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @ApiProperty({ enum: TodoStatus })
  @IsEnum(TodoStatus)
  status?: TodoStatus

  @IsOptional()
  @IsDateString()
  dueDate?: string
}
```

Create the input DTO (`dto/create-todo.dto.ts`):

```typescript
import { Type } from 'class-transformer'
import { IsOptional, IsString, ValidateNested } from 'class-validator'
import { TodoAttributes } from './todo-attributes.dto'

export class CreateTodoDto {
  @IsString()
  name: string // The name field is required by CommandEntity

  @Type(() => TodoAttributes)
  @ValidateNested()
  @IsOptional()
  attributes?: TodoAttributes

  constructor(partial: Partial<CreateTodoDto>) {
    Object.assign(this, partial)
  }
}
```

### Step 3: Define Entities

Create the command entity (`entity/todo-command.entity.ts`):

```typescript
import { CommandEntity } from '@mbc-cqrs-serverless/core'
import { TodoAttributes } from '../dto/todo-attributes.dto'

export class TodoCommandEntity extends CommandEntity {
  attributes: TodoAttributes

  constructor(partial: Partial<TodoCommandEntity>) {
    super()
    Object.assign(this, partial)
  }
}
```

Create the command DTO (`dto/todo-command.dto.ts`):

```typescript
import { CommandDto } from '@mbc-cqrs-serverless/core'
import { Type } from 'class-transformer'
import { IsOptional, ValidateNested } from 'class-validator'
import { TodoAttributes } from './todo-attributes.dto'

export class TodoCommandDto extends CommandDto {
  @Type(() => TodoAttributes)
  @ValidateNested()
  @IsOptional()
  attributes?: TodoAttributes

  constructor(partial: Partial<TodoCommandDto>) {
    super()
    Object.assign(this, partial)
  }
}
```

Create the data entity (`entity/todo-data.entity.ts`):

```typescript
import { DataEntity } from '@mbc-cqrs-serverless/core'
import { TodoAttributes } from '../dto/todo-attributes.dto'

export class TodoDataEntity extends DataEntity {
  attributes: TodoAttributes

  constructor(partial: Partial<TodoDataEntity>) {
    super(partial)
    Object.assign(this, partial)
  }
}
```

### Step 4: Implement the Service

Create the todo service (`todo.service.ts`):

```typescript
import {
  CommandService,
  generateId,
  getUserContext,
  IInvoke,
  VERSION_FIRST,
} from '@mbc-cqrs-serverless/core'
import { Injectable, Logger } from '@nestjs/common'
import { generateTodoPk, generateTodoSk, TODO_PK_PREFIX } from 'src/helpers'
import { CreateTodoDto } from './dto/create-todo.dto'
import { TodoCommandDto } from './dto/todo-command.dto'
import { TodoDataEntity } from './entity/todo-data.entity'

@Injectable()
export class TodoService {
  private readonly logger = new Logger(TodoService.name)

  constructor(private readonly commandService: CommandService) {}

  async create(
    createDto: CreateTodoDto,
    opts: { invokeContext: IInvoke },
  ): Promise<TodoDataEntity> {
    // Get tenant code from user context (JWT token)
    const { tenantCode } = getUserContext(opts.invokeContext)

    // Generate partition key and sort key
    const pk = generateTodoPk(tenantCode)
    const sk = generateTodoSk()

    // Create command DTO
    const todo = new TodoCommandDto({
      pk,
      sk,
      id: generateId(pk, sk),
      tenantCode,
      code: sk,
      type: TODO_PK_PREFIX,
      version: VERSION_FIRST, // Version for optimistic locking
      name: createDto.name,
      attributes: createDto.attributes,
    })

    this.logger.debug('Creating todo:', todo)

    // Publish command to DynamoDB
    const item = await this.commandService.publish(todo, opts)

    return new TodoDataEntity(item as TodoDataEntity)
  }
}
```

### Step 5: Create the Controller

Create the controller (`todo.controller.ts`):

```typescript
import { IInvoke, INVOKE_CONTEXT } from '@mbc-cqrs-serverless/core'
import { Body, Controller, Logger, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CreateTodoDto } from './dto/create-todo.dto'
import { TodoDataEntity } from './entity/todo-data.entity'
import { TodoService } from './todo.service'

@Controller('api/todo')
@ApiTags('todo')
export class TodoController {
  private readonly logger = new Logger(TodoController.name)

  constructor(private readonly todoService: TodoService) {}

  @Post('/')
  async create(
    @INVOKE_CONTEXT() invokeContext: IInvoke,
    @Body() createDto: CreateTodoDto,
  ): Promise<TodoDataEntity> {
    this.logger.debug('createDto:', createDto)
    return this.todoService.create(createDto, { invokeContext })
  }
}
```

### Step 6: Create the Module

Create the module (`todo.module.ts`):

```typescript
import { CommandModule } from '@mbc-cqrs-serverless/core'
import { Module } from '@nestjs/common'
import { TodoController } from './todo.controller'
import { TodoService } from './todo.service'

@Module({
  imports: [
    CommandModule.register({
      tableName: 'todo',
      // Data sync handlers will be added in step-03-rds-sync
      // dataSyncHandlers: [TodoDataSyncRdsHandler],
    }),
  ],
  controllers: [TodoController],
  providers: [TodoService],
})
export class TodoModule {}
```

## Part 2: RDS Data Synchronization (step-03-rds-sync)

Implement automatic data synchronization from DynamoDB to RDS.

### Update Prisma Schema

Add TodoStatus enum and Todo model to `prisma/schema.prisma`:

```prisma
// Todo status enum
enum TodoStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELED
}

// Todo model for RDS (MySQL) - synchronized from DynamoDB
model Todo {
  id         String   @id                        // Unique ID (generated from pk#sk)
  cpk        String                              // Command partition key
  csk        String                              // Command sort key (with version)
  pk         String                              // Data partition key: TODO#tenantCode
  sk         String                              // Data sort key: ULID
  tenantCode String   @map("tenant_code")        // Tenant code for multi-tenancy
  seq        Int      @default(0)                // Sequence number (for ordering)
  code       String                              // Record code (same as sk)
  name       String                              // Todo name/title
  version    Int                                 // Version for optimistic locking
  isDeleted  Boolean  @default(false) @map("is_deleted")  // Soft delete flag
  createdBy  String   @default("") @map("created_by")     // Created by user
  createdIp  String   @default("") @map("created_ip")     // Created from IP
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamp(0)
  updatedBy  String   @default("") @map("updated_by")     // Updated by user
  updatedIp  String   @default("") @map("updated_ip")     // Updated from IP
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamp(0)

  // Todo-specific attributes
  description String?    @default("") @map("description")  // Description
  status      TodoStatus @default(PENDING) @map("status")  // Status
  dueDate     DateTime?  @map("due_date")                  // Due date

  // Indexes for efficient queries
  @@unique([cpk, csk])           // Command table unique constraint
  @@unique([pk, sk])             // Data table unique constraint
  @@unique([tenantCode, code])   // Tenant + code unique constraint
  @@index([tenantCode, name])    // Search by tenant and name
  @@map("todos")                 // Table name in database
}
```

### Create Data Sync Handler

Create the RDS sync handler (`handler/todo-rds.handler.ts`):

```typescript
import {
  CommandModel,
  IDataSyncHandler,
  removeSortKeyVersion,
} from '@mbc-cqrs-serverless/core'
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'src/prisma'
import { TodoAttributes } from '../dto/todo-attributes.dto'

@Injectable()
export class TodoDataSyncRdsHandler implements IDataSyncHandler {
  private readonly logger = new Logger(TodoDataSyncRdsHandler.name)

  constructor(private readonly prismaService: PrismaService) {}

  // Called when data is created or updated in DynamoDB
  async up(cmd: CommandModel): Promise<any> {
    this.logger.debug('Syncing to RDS:', cmd)

    // Remove version suffix from sort key for the data table
    const sk = removeSortKeyVersion(cmd.sk)
    const attrs = cmd.attributes as TodoAttributes

    await this.prismaService.todo.upsert({
      where: { id: cmd.id },
      // Update existing record
      update: {
        csk: cmd.sk,
        name: cmd.name,
        version: cmd.version,
        seq: cmd.seq,
        isDeleted: cmd.isDeleted || false,
        updatedAt: cmd.updatedAt,
        updatedBy: cmd.updatedBy,
        updatedIp: cmd.updatedIp,
        description: attrs?.description,
        status: attrs?.status,
        dueDate: attrs?.dueDate,
      },
      // Create new record
      create: {
        id: cmd.id,
        cpk: cmd.pk,
        csk: cmd.sk,
        pk: cmd.pk,
        sk,
        code: sk,
        name: cmd.name,
        version: cmd.version,
        tenantCode: cmd.tenantCode,
        seq: cmd.seq,
        createdAt: cmd.createdAt,
        createdBy: cmd.createdBy,
        createdIp: cmd.createdIp,
        updatedAt: cmd.updatedAt,
        updatedBy: cmd.updatedBy,
        updatedIp: cmd.updatedIp,
        description: attrs?.description,
        status: attrs?.status,
        dueDate: attrs?.dueDate,
      },
    })
  }

  // Called when data needs to be rolled back
  async down(cmd: CommandModel): Promise<any> {
    this.logger.debug('Rollback requested:', cmd)
    // Implement rollback logic if needed
  }
}
```

### Register Handler in Module

Update `todo.module.ts`:

```typescript
import { CommandModule } from '@mbc-cqrs-serverless/core'
import { Module } from '@nestjs/common'
import { TodoDataSyncRdsHandler } from './handler/todo-rds.handler'
import { TodoController } from './todo.controller'
import { TodoService } from './todo.service'

@Module({
  imports: [
    CommandModule.register({
      tableName: 'todo',
      // Register RDS sync handler to synchronize DynamoDB data to MySQL
      dataSyncHandlers: [TodoDataSyncRdsHandler],
    }),
  ],
  controllers: [TodoController],
  providers: [TodoService],
})
export class TodoModule {}
```

## Part 3: Read Operations (step-04-read)

Add methods to retrieve single items from DynamoDB.

### Update Service

Add `findOne` method to `todo.service.ts`:

```typescript
import { DataService, NotFoundException } from '@mbc-cqrs-serverless/core'

@Injectable()
export class TodoService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService, // Inject DataService
  ) {}

  // ... create method ...

  async findOne(pk: string, sk: string): Promise<TodoDataEntity> {
    this.logger.debug(`Finding todo: pk=${pk}, sk=${sk}`)

    const item = await this.dataService.getItem({ pk, sk })

    if (!item) {
      throw new NotFoundException(`Todo not found: pk=${pk}, sk=${sk}`)
    }

    return new TodoDataEntity(item as TodoDataEntity)
  }
}
```

### Update Controller

```typescript
@Get(':pk/:sk')
async findOne(
  @Param('pk') pk: string,
  @Param('sk') sk: string,
): Promise<TodoDataEntity> {
  this.logger.debug(`findOne: pk=${pk}, sk=${sk}`)
  return this.todoService.findOne(pk, sk)
}
```

## Part 4: Search Operations (step-05-search)

Implement search using RDS for efficient queries.

### Create Search DTO

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger'
import { TodoStatus } from '@prisma/client' // Import from Prisma generated types
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Transform, Type } from 'class-transformer'

export class SearchTodoDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Search by name (partial match)' })
  name?: string

  @IsOptional()
  @IsEnum(TodoStatus)
  @ApiPropertyOptional({ enum: TodoStatus, description: 'Filter by status' })
  status?: TodoStatus

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  limit?: number = 10

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Sort field',
    default: 'createdAt',
    enum: ['name', 'status', 'createdAt', 'updatedAt'],
  })
  sortBy?: string = 'createdAt'

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toUpperCase())
  @ApiPropertyOptional({
    description: 'Sort order',
    default: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  sortOrder?: 'ASC' | 'DESC' = 'DESC'
}

export class SearchTodoResultDto<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data
    this.total = total
    this.page = page
    this.limit = limit
    this.totalPages = Math.ceil(total / limit)
  }
}
```

### Update Service

```typescript
import { Prisma } from '@prisma/client'

async findAll(
  tenantCode: string,
  searchDto: SearchTodoDto,
): Promise<SearchTodoResultDto<TodoDataEntity>> {
  this.logger.debug(`Searching todos for tenant: ${tenantCode}`, searchDto)

  const { name, status, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = searchDto

  // Build where clause dynamically
  const where: Prisma.TodoWhereInput = {
    tenantCode,
    isDeleted: false,
  }

  // Add name filter (partial match)
  if (name) {
    where.name = { contains: name }
  }

  // Add status filter (exact match)
  if (status) {
    where.status = status
  }

  // Build orderBy clause
  const orderBy: Prisma.TodoOrderByWithRelationInput = {
    [sortBy]: sortOrder.toLowerCase(),
  }

  // Calculate skip for pagination
  const skip = (page - 1) * limit

  // Execute query with pagination
  const [data, total] = await Promise.all([
    this.prismaService.todo.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    this.prismaService.todo.count({ where }),
  ])

  // Map Prisma results to TodoDataEntity
  const todos = data.map((item) => new TodoDataEntity({
    ...item,
    type: TODO_PK_PREFIX,
    attributes: {
      description: item.description,
      status: item.status,
      dueDate: item.dueDate?.toISOString(),
    },
  } as unknown as TodoDataEntity))

  return new SearchTodoResultDto(todos, total, page, limit)
}
```

### Update Controller

```typescript
@Get('/')
async findAll(
  @INVOKE_CONTEXT() invokeContext: IInvoke,
  @Query() searchDto: SearchTodoDto,
): Promise<SearchTodoResultDto<TodoDataEntity>> {
  const { tenantCode } = getUserContext(invokeContext)
  this.logger.debug(`findAll: tenantCode=${tenantCode}`, searchDto)
  return this.todoService.findAll(tenantCode, searchDto)
}
```

## Part 5: Update and Delete (step-06-update-delete)

### Update DTO

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { TodoAttributes } from './todo-attributes.dto'

export class UpdateTodoDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Todo name/title' })
  name?: string

  @IsOptional()
  @ApiPropertyOptional({ description: 'Todo attributes (description, status, dueDate)' })
  attributes?: TodoAttributes

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ description: 'Version for optimistic locking' })
  version: number // Required for optimistic locking
}
```

### Update Service

```typescript
import { CommandPartialInputModel } from '@mbc-cqrs-serverless/core'

async update(
  pk: string,
  sk: string,
  updateDto: UpdateTodoDto,
  opts: { invokeContext: IInvoke },
): Promise<TodoDataEntity> {
  this.logger.debug(`Updating todo: pk=${pk}, sk=${sk}`, updateDto)

  // First, verify the item exists
  const currentItem = await this.dataService.getItem({ pk, sk })
  if (!currentItem) {
    throw new NotFoundException(`Todo not found: pk=${pk}, sk=${sk}`)
  }

  // Build the partial update object
  const partialUpdate: CommandPartialInputModel = {
    pk,
    sk,
    version: updateDto.version, // Required for optimistic locking
    ...(updateDto.name !== undefined && { name: updateDto.name }),
    ...(updateDto.attributes !== undefined && { attributes: updateDto.attributes }),
  }

  // Publish partial update command
  const item = await this.commandService.publishPartialUpdate(partialUpdate, opts)

  return new TodoDataEntity(item as TodoDataEntity)
}

async remove(
  pk: string,
  sk: string,
  version: number,
  opts: { invokeContext: IInvoke },
): Promise<TodoDataEntity> {
  this.logger.debug(`Removing todo: pk=${pk}, sk=${sk}, version=${version}`)

  // First, verify the item exists
  const currentItem = await this.dataService.getItem({ pk, sk })
  if (!currentItem) {
    throw new NotFoundException(`Todo not found: pk=${pk}, sk=${sk}`)
  }

  // Soft delete by setting isDeleted flag
  const item = await this.commandService.publishPartialUpdate(
    {
      pk,
      sk,
      version,
      isDeleted: true,
    },
    opts,
  )

  return new TodoDataEntity(item as TodoDataEntity)
}
```

### Update Controller

```typescript
@Patch(':pk/:sk')
async update(
  @INVOKE_CONTEXT() invokeContext: IInvoke,
  @Param('pk') pk: string,
  @Param('sk') sk: string,
  @Body() updateDto: UpdateTodoDto,
): Promise<TodoDataEntity> {
  this.logger.debug(`update: pk=${pk}, sk=${sk}`, updateDto)
  return this.todoService.update(pk, sk, updateDto, { invokeContext })
}

@Delete(':pk/:sk')
async remove(
  @INVOKE_CONTEXT() invokeContext: IInvoke,
  @Param('pk') pk: string,
  @Param('sk') sk: string,
  @Query('version') version: number,
): Promise<TodoDataEntity> {
  this.logger.debug(`remove: pk=${pk}, sk=${sk}, version=${version}`)
  return this.todoService.remove(pk, sk, version, { invokeContext })
}
```

## Part 6: Sequence Numbers (step-07-sequence)

Add auto-incrementing todo numbers.

### Install Sequence Module

```bash
npm install @mbc-cqrs-serverless/sequence
```

### Update Module

```typescript
import { SequencesModule } from '@mbc-cqrs-serverless/sequence'

@Module({
  imports: [
    CommandModule.register({
      tableName: 'todo',
      dataSyncHandlers: [TodoDataSyncRdsHandler],
    }),
    SequencesModule, // Add SequencesModule
  ],
  // ...
})
export class TodoModule {}
```

### Update Service

```typescript
import { SequencesService } from '@mbc-cqrs-serverless/sequence'

@Injectable()
export class TodoService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
    private readonly prismaService: PrismaService,
    private readonly sequencesService: SequencesService, // Inject SequencesService
  ) {}

  async create(
    createDto: CreateTodoDto,
    opts: { invokeContext: IInvoke },
  ): Promise<TodoDataEntity> {
    const { tenantCode } = getUserContext(opts.invokeContext)

    // Generate sequential number
    const seqItem = await this.sequencesService.generateSequenceItem(
      {
        tenantCode,
        typeCode: TODO_PK_PREFIX,
      },
      opts,
    )

    this.logger.debug(`Generated sequence number: ${seqItem.formattedNo} for tenant: ${tenantCode}`)

    const pk = generateTodoPk(tenantCode)
    const sk = generateTodoSk() // SK is still ULID

    const todo = new TodoCommandDto({
      pk,
      sk,
      id: generateId(pk, sk),
      tenantCode,
      code: sk,
      type: TODO_PK_PREFIX,
      version: VERSION_FIRST,
      seq: seqItem.no, // Store sequence number in seq field
      name: createDto.name,
      attributes: createDto.attributes,
    })

    this.logger.debug('Creating todo with sequence:', todo)

    const item = await this.commandService.publish(todo, opts)
    return new TodoDataEntity(item as TodoDataEntity)
  }
}
```

## Part 7: Async Task Processing (complete/with-task)

Process long-running todo operations asynchronously.

### Install Task Module

```bash
npm install @mbc-cqrs-serverless/task
```

### Create Task Event

```typescript
// src/todo/handler/todo-task.event.ts
import { TaskQueueEvent } from '@mbc-cqrs-serverless/task'

export class TodoTaskEvent extends TaskQueueEvent {}
```

### Create Task Handler

```typescript
// src/todo/handler/todo-task.event.handler.ts
import { EventHandler, IEventHandler } from '@mbc-cqrs-serverless/core'
import { Logger } from '@nestjs/common'
import { TodoTaskEvent } from './todo-task.event'

@EventHandler(TodoTaskEvent)
export class TodoTaskEventHandler implements IEventHandler<TodoTaskEvent> {
  private readonly logger = new Logger(TodoTaskEventHandler.name)

  async execute(event: TodoTaskEvent): Promise<any> {
    this.logger.debug('Processing todo task:', event)

    // Implement your async task processing here
    // e.g., send notification, sync to external system

    return { processed: true }
  }
}
```

### Create Task Queue Event Factory

```typescript
// src/my-task/task-queue-event-factory.ts
import {
  ITaskQueueEventFactory,
  TaskQueueEvent,
} from '@mbc-cqrs-serverless/task'
import { TodoTaskEvent } from '../todo/handler/todo-task.event'

export class TaskQueueEventFactory implements ITaskQueueEventFactory {
  async transformTask(event: TaskQueueEvent): Promise<any[]> {
    return [new TodoTaskEvent().fromSqsRecord(event)]
  }
}
```

### Create Task Module

```typescript
// src/my-task/my-task.module.ts
import { TaskModule } from '@mbc-cqrs-serverless/task'
import { Module } from '@nestjs/common'
import { TaskQueueEventFactory } from './task-queue-event-factory'

@Module({
  imports: [
    TaskModule.register({
      taskQueueEventFactory: TaskQueueEventFactory,
    }),
  ],
  exports: [TaskModule],
})
export class MyTaskModule {}
```

## Testing Your Application

### Run Locally

```bash
# Terminal 1: Start Docker services
npm run offline:docker

# Terminal 2: Run database migrations
npm run migrate

# Terminal 3: Start serverless offline
npm run offline:sls
```

### Test API Endpoints

```bash
# Create a todo
curl -X POST http://localhost:3000/api/todo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"name": "My First Todo", "attributes": {"description": "Testing CQRS", "status": "PENDING"}}'

# List todos
curl "http://localhost:3000/api/todo?page=1&limit=10" \
  -H "Authorization: Bearer <your-token>"

# Get a todo (Note: # in pk must be URL-encoded as %23)
curl "http://localhost:3000/api/todo/TODO%23MBC/<sk>" \
  -H "Authorization: Bearer <your-token>"

# Update a todo
curl -X PATCH "http://localhost:3000/api/todo/TODO%23MBC/<sk>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"name": "Updated Todo", "version": 1}'

# Delete a todo
curl -X DELETE "http://localhost:3000/api/todo/TODO%23MBC/<sk>?version=1" \
  -H "Authorization: Bearer <your-token>"
```

### Unit Tests

Create unit tests for the service (`todo.service.spec.ts`):

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { CommandService, DataService } from '@mbc-cqrs-serverless/core'
import { TodoService } from './todo.service'
import { PrismaService } from '../prisma/prisma.service'

// Mock getUserContext
jest.mock('@mbc-cqrs-serverless/core', () => ({
  ...jest.requireActual('@mbc-cqrs-serverless/core'),
  getUserContext: jest.fn().mockReturnValue({
    tenantCode: 'TEST',
    userId: 'user-123',
  }),
}))

describe('TodoService', () => {
  let service: TodoService
  let commandService: jest.Mocked<CommandService>
  let dataService: jest.Mocked<DataService>

  beforeEach(async () => {
    const mockCommandService = {
      publish: jest.fn(),
      publishPartialUpdate: jest.fn(),
    }

    const mockDataService = {
      getItem: jest.fn(),
    }

    const mockPrismaService = {
      todo: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoService,
        { provide: CommandService, useValue: mockCommandService },
        { provide: DataService, useValue: mockDataService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile()

    service = module.get<TodoService>(TodoService)
    commandService = module.get(CommandService)
    dataService = module.get(DataService)
  })

  describe('findOne', () => {
    it('should return a todo when found', async () => {
      const mockTodo = { pk: 'TODO#TEST', sk: '01HXY', name: 'Test' }
      dataService.getItem.mockResolvedValue(mockTodo as any)

      const result = await service.findOne('TODO#TEST', '01HXY')

      expect(dataService.getItem).toHaveBeenCalledWith({
        pk: 'TODO#TEST',
        sk: '01HXY',
      })
      expect(result.name).toBe('Test')
    })

    it('should throw NotFoundException when not found', async () => {
      dataService.getItem.mockResolvedValue(null)

      await expect(service.findOne('TODO#TEST', 'nonexistent'))
        .rejects.toThrow(NotFoundException)
    })
  })
})
```

Run unit tests:

```bash
npm test
```

### E2E Tests

Create E2E tests (`test/todo.e2e-spec.ts`):

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { TodoController } from '../src/todo/todo.controller'
import { TodoService } from '../src/todo/todo.service'

// Mock getUserContext
jest.mock('@mbc-cqrs-serverless/core', () => ({
  ...jest.requireActual('@mbc-cqrs-serverless/core'),
  getUserContext: jest.fn().mockReturnValue({
    tenantCode: 'TEST',
    userId: 'user-123',
  }),
  INVOKE_CONTEXT: () => () => {}, // Decorator stub
}))

describe('TodoController (e2e)', () => {
  let app: INestApplication

  const mockTodoData = {
    pk: 'TODO#TEST',
    sk: '01HXY',
    name: 'Test Todo',
    version: 1,
  }

  beforeAll(async () => {
    const mockTodoService = {
      create: jest.fn().mockResolvedValue(mockTodoData),
      findOne: jest.fn().mockResolvedValue(mockTodoData),
      findAll: jest.fn().mockResolvedValue({ data: [mockTodoData], total: 1 }),
      update: jest.fn().mockResolvedValue(mockTodoData),
      remove: jest.fn().mockResolvedValue({ ...mockTodoData, isDeleted: true }),
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TodoController],
      providers: [{ provide: TodoService, useValue: mockTodoService }],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /api/todo - should create a todo', () => {
    return request(app.getHttpServer())
      .post('/api/todo')
      .send({ name: 'New Todo', attributes: { status: 'PENDING' } })
      .expect(201)
  })

  it('GET /api/todo/:pk/:sk - should return a todo', () => {
    return request(app.getHttpServer())
      .get('/api/todo/TODO%23TEST/01HXY')
      .expect(200)
  })

  it('PATCH /api/todo/:pk/:sk - should update a todo', () => {
    return request(app.getHttpServer())
      .patch('/api/todo/TODO%23TEST/01HXY')
      .send({ name: 'Updated', version: 1 })
      .expect(200)
  })
})
```

Configure Jest for E2E tests (`test/jest-e2e.json`):

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": ["ts-jest", { "tsconfig": "<rootDir>/../tsconfig.json" }]
  },
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/../src/$1"
  }
}
```

Run E2E tests:

```bash
npm run test:e2e
```

## Sample Code Repository

The complete source code for each step is available at:

- [step-01-setup](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/step-01-setup) - Environment setup
- [step-02-create](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/step-02-create) - Create operation
- [step-03-rds-sync](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/step-03-rds-sync) - RDS synchronization
- [step-04-read](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/step-04-read) - Read operation
- [step-05-search](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/step-05-search) - Search operation
- [step-06-update-delete](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/step-06-update-delete) - Update and delete
- [step-07-sequence](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/step-07-sequence) - Sequence numbers
- [complete/basic](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/complete/basic) - Full basic implementation
- [complete/with-task](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/complete/with-task) - With async task processing

## Next Steps

- [Deployment Guide](./deployment-guide) - Deploy to AWS
- [Testing](./testing) - Write unit and e2e tests
- [Monitoring](./monitoring-logging) - Add observability
