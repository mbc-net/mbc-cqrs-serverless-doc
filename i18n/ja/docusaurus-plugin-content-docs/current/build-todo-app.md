---
description: CQRSパターンを学びながら、完全なTodoアプリケーションをステップバイステップで構築します。
---

# Todoアプリの構築

このチュートリアルでは、MBC CQRS Serverlessを使用して完全なTodoアプリケーションを構築する方法を説明します。CQRSパターン、イベントハンドリング、段階的な機能追加を学びます。

このチュートリアルは、段階的なステップで構成された[サンプルコード](https://github.com/mbc-net/mbc-cqrs-serverless-samples)に従っています。

## 構築するもの

以下の機能を持つ完全に機能するTodoアプリケーション：

- TodoのCRUD操作
- コマンド/クエリ分離によるCQRSパターン
- RDSへのイベント駆動データ同期
- オプション：Todoのシーケンス番号
- オプション：非同期タスク処理

## 前提条件

- [クイックスタートチュートリアル](./quickstart-tutorial)を完了していること
- NestJSの基本的な理解
- ローカル開発用にDockerが実行中であること

## サンプルの実行

各ステップには完全に動作するサンプルがあります。サンプルを実行するには：

```bash
# ステップディレクトリに移動
cd step-02-create  # または他のステップ

# 依存関係のインストール
npm install

# ターミナル1：Dockerサービスを起動
npm run offline:docker

# ターミナル2：データベースマイグレーションを実行
npm run migrate

# ターミナル3：serverless offlineサーバーを起動
npm run offline:sls
```

## Part 1：基本的なCQRS実装（step-02-create）

### ステップ1：ヘルパー関数の作成

まず、パーティションキーとソートキーを管理するヘルパー関数を作成します（`src/helpers/id.ts`）：

```typescript
import { KEY_SEPARATOR } from '@mbc-cqrs-serverless/core'
import { ulid } from 'ulid'

export const TODO_PK_PREFIX = 'TODO'

export function generateTodoPk(tenantCode: string): string {
  return `${TODO_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`
}

export function generateTodoSk(): string {
  return ulid() // ULID provides time-ordered unique identifiers（ULIDは時間順の一意識別子を提供）
}

export function parsePk(pk: string): { type: string; tenantCode: string } {
  if (pk.split(KEY_SEPARATOR).length !== 2) {
    throw new Error('Invalid PK')
  }
  const [type, tenantCode] = pk.split(KEY_SEPARATOR)
  return { type, tenantCode }
}
```

### ステップ2：DTOの定義

Todo属性DTOを作成（`dto/todo-attributes.dto.ts`）：

```typescript
import { ApiProperty } from '@nestjs/swagger'
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator'

// TodoStatus enum (will be synced with Prisma in step-03)（TodoStatusのenum、step-03でPrismaと同期）
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

入力DTOを作成（`dto/create-todo.dto.ts`）：

```typescript
import { Type } from 'class-transformer'
import { IsOptional, IsString, ValidateNested } from 'class-validator'
import { TodoAttributes } from './todo-attributes.dto'

export class CreateTodoDto {
  @IsString()
  name: string // The name field is required by CommandEntity（nameフィールドはCommandEntityで必須）

  @Type(() => TodoAttributes)
  @ValidateNested()
  @IsOptional()
  attributes?: TodoAttributes

  constructor(partial: Partial<CreateTodoDto>) {
    Object.assign(this, partial)
  }
}
```

### ステップ3：エンティティの定義

コマンドエンティティを作成（`entity/todo-command.entity.ts`）：

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

コマンドDTOを作成（`dto/todo-command.dto.ts`）：

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

データエンティティを作成（`entity/todo-data.entity.ts`）：

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

### ステップ4：サービスの実装

Todoサービスを作成（`todo.service.ts`）：

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
    // Get tenant code from user context (JWT token)（ユーザーコンテキストからテナントコードを取得）
    const { tenantCode } = getUserContext(opts.invokeContext)

    // Generate partition key and sort key（パーティションキーとソートキーを生成）
    const pk = generateTodoPk(tenantCode)
    const sk = generateTodoSk()

    // Create command DTO（コマンドDTOを作成）
    const todo = new TodoCommandDto({
      pk,
      sk,
      id: generateId(pk, sk),
      tenantCode,
      code: sk,
      type: TODO_PK_PREFIX,
      version: VERSION_FIRST, // Version for optimistic locking（楽観的ロック用バージョン）
      name: createDto.name,
      attributes: createDto.attributes,
    })

    this.logger.debug('Creating todo:', todo)

    // Publish command to DynamoDB（DynamoDBにコマンドを発行）
    const item = await this.commandService.publish(todo, opts)

    return new TodoDataEntity(item as TodoDataEntity)
  }
}
```

### ステップ5：コントローラーの作成

コントローラーを作成（`todo.controller.ts`）：

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

### ステップ6：モジュールの作成

モジュールを作成（`todo.module.ts`）：

```typescript
import { CommandModule } from '@mbc-cqrs-serverless/core'
import { Module } from '@nestjs/common'
import { TodoController } from './todo.controller'
import { TodoService } from './todo.service'

@Module({
  imports: [
    CommandModule.register({
      tableName: 'todo',
      // Data sync handlers will be added in step-03-rds-sync（データ同期ハンドラーはstep-03-rds-syncで追加）
      // dataSyncHandlers: [TodoDataSyncRdsHandler],
    }),
  ],
  controllers: [TodoController],
  providers: [TodoService],
})
export class TodoModule {}
```

## Part 2：RDSデータ同期（step-03-rds-sync）

DynamoDBからRDSへの自動データ同期を実装します。

### Prismaスキーマの更新

`prisma/schema.prisma`にTodoStatus enumとTodoモデルを追加：

```prisma
// Todo status enum（Todoステータスのenum）
enum TodoStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELED
}

// Todo model for RDS (MySQL) - synchronized from DynamoDB（RDS用Todoモデル - DynamoDBから同期）
model Todo {
  id         String   @id                        // Unique ID (generated from pk#sk)（一意のID、pk#skから生成）
  cpk        String                              // Command partition key（コマンドパーティションキー）
  csk        String                              // Command sort key (with version)（コマンドソートキー、バージョン付き）
  pk         String                              // Data partition key: TODO#tenantCode（データパーティションキー）
  sk         String                              // Data sort key: ULID（データソートキー）
  tenantCode String   @map("tenant_code")        // Tenant code for multi-tenancy（マルチテナンシー用テナントコード）
  seq        Int      @default(0)                // Sequence number (for ordering)（並べ替え用シーケンス番号）
  code       String                              // Record code (same as sk)（レコードコード、skと同じ）
  name       String                              // Todo name/title（Todo名/タイトル）
  version    Int                                 // Version for optimistic locking（楽観的ロック用バージョン）
  isDeleted  Boolean  @default(false) @map("is_deleted")  // Soft delete flag（論理削除フラグ）
  createdBy  String   @default("") @map("created_by")     // Created by user（作成ユーザー）
  createdIp  String   @default("") @map("created_ip")     // Created from IP（作成元IP）
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamp(0)
  updatedBy  String   @default("") @map("updated_by")     // Updated by user（更新ユーザー）
  updatedIp  String   @default("") @map("updated_ip")     // Updated from IP（更新元IP）
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamp(0)

  // Todo-specific attributes（Todo固有の属性）
  description String?    @default("") @map("description")  // Description（説明）
  status      TodoStatus @default(PENDING) @map("status")  // Status（ステータス）
  dueDate     DateTime?  @map("due_date")                  // Due date（期限日）

  // Indexes for efficient queries（効率的なクエリ用インデックス）
  @@unique([cpk, csk])           // Command table unique constraint（コマンドテーブルのユニーク制約）
  @@unique([pk, sk])             // Data table unique constraint（データテーブルのユニーク制約）
  @@unique([tenantCode, code])   // Tenant + code unique constraint（テナント+コードのユニーク制約）
  @@index([tenantCode, name])    // Search by tenant and name（テナントと名前で検索）
  @@map("todos")                 // Table name in database（データベースのテーブル名）
}
```

### データ同期ハンドラーの作成

RDS同期ハンドラーを作成（`handler/todo-rds.handler.ts`）：

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

  // Called when data is created or updated in DynamoDB（DynamoDBでデータが作成または更新された時に呼び出される）
  async up(cmd: CommandModel): Promise<any> {
    this.logger.debug('Syncing to RDS:', cmd)

    // Remove version suffix from sort key for the data table（データテーブル用にソートキーからバージョンサフィックスを削除）
    const sk = removeSortKeyVersion(cmd.sk)
    const attrs = cmd.attributes as TodoAttributes

    await this.prismaService.todo.upsert({
      where: { id: cmd.id },
      // Update existing record（既存レコードを更新）
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
      // Create new record（新規レコードを作成）
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

  // Called when data needs to be rolled back（データのロールバックが必要な時に呼び出される）
  async down(cmd: CommandModel): Promise<any> {
    this.logger.debug('Rollback requested:', cmd)
    // Implement rollback logic if needed（必要に応じてロールバックロジックを実装）
  }
}
```

### モジュールへのハンドラー登録

`todo.module.ts`を更新：

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
      // Register RDS sync handler to synchronize DynamoDB data to MySQL（RDS同期ハンドラーを登録してDynamoDBデータをMySQLに同期）
      dataSyncHandlers: [TodoDataSyncRdsHandler],
    }),
  ],
  controllers: [TodoController],
  providers: [TodoService],
})
export class TodoModule {}
```

## Part 3：読み取り操作（step-04-read）

DynamoDBから単一アイテムを取得するメソッドを追加します。

### サービスの更新

`todo.service.ts`に`findOne`メソッドを追加：

```typescript
import { DataService, NotFoundException } from '@mbc-cqrs-serverless/core'

@Injectable()
export class TodoService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService, // Inject DataService（DataServiceを注入）
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

### コントローラーの更新

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

## Part 4：検索操作（step-05-search）

効率的なクエリのためにRDSを使用した検索を実装します。

### 検索DTOの作成

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger'
import { TodoStatus } from '@prisma/client' // Import from Prisma generated types（Prisma生成型からインポート）
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

### サービスの更新

```typescript
import { Prisma } from '@prisma/client'

async findAll(
  tenantCode: string,
  searchDto: SearchTodoDto,
): Promise<SearchTodoResultDto<TodoDataEntity>> {
  this.logger.debug(`Searching todos for tenant: ${tenantCode}`, searchDto)

  const { name, status, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = searchDto

  // Build where clause dynamically（WHERE句を動的に構築）
  const where: Prisma.TodoWhereInput = {
    tenantCode,
    isDeleted: false,
  }

  // Add name filter (partial match)（名前フィルターを追加、部分一致）
  if (name) {
    where.name = { contains: name }
  }

  // Add status filter (exact match)（ステータスフィルターを追加、完全一致）
  if (status) {
    where.status = status
  }

  // Build orderBy clause（ORDER BY句を構築）
  const orderBy: Prisma.TodoOrderByWithRelationInput = {
    [sortBy]: sortOrder.toLowerCase(),
  }

  // Calculate skip for pagination（ページネーション用のスキップ数を計算）
  const skip = (page - 1) * limit

  // Execute query with pagination（ページネーション付きでクエリを実行）
  const [data, total] = await Promise.all([
    this.prismaService.todo.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    this.prismaService.todo.count({ where }),
  ])

  // Map Prisma results to TodoDataEntity（Prisma結果をTodoDataEntityにマッピング）
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

### コントローラーの更新

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

## Part 5：更新と削除（step-06-update-delete）

### 更新DTOの作成

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
  version: number // Required for optimistic locking（楽観的ロックに必須）
}
```

### サービスの更新

```typescript
import { CommandPartialInputModel } from '@mbc-cqrs-serverless/core'

async update(
  pk: string,
  sk: string,
  updateDto: UpdateTodoDto,
  opts: { invokeContext: IInvoke },
): Promise<TodoDataEntity> {
  this.logger.debug(`Updating todo: pk=${pk}, sk=${sk}`, updateDto)

  // First, verify the item exists（まずアイテムの存在を確認）
  const currentItem = await this.dataService.getItem({ pk, sk })
  if (!currentItem) {
    throw new NotFoundException(`Todo not found: pk=${pk}, sk=${sk}`)
  }

  // Build the partial update object（部分更新オブジェクトを構築）
  const partialUpdate: CommandPartialInputModel = {
    pk,
    sk,
    version: updateDto.version, // Required for optimistic locking（楽観的ロックに必須）
    ...(updateDto.name !== undefined && { name: updateDto.name }),
    ...(updateDto.attributes !== undefined && { attributes: updateDto.attributes }),
  }

  // Publish partial update command（部分更新コマンドを発行）
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

  // First, verify the item exists（まずアイテムの存在を確認）
  const currentItem = await this.dataService.getItem({ pk, sk })
  if (!currentItem) {
    throw new NotFoundException(`Todo not found: pk=${pk}, sk=${sk}`)
  }

  // Soft delete by setting isDeleted flag（isDeletedフラグを設定して論理削除）
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

### コントローラーの更新

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

## Part 6：シーケンス番号（step-07-sequence）

自動インクリメントのTodo番号を追加します。

### シーケンスモジュールのインストール

```bash
npm install @mbc-cqrs-serverless/sequence
```

### モジュールの更新

```typescript
import { SequencesModule } from '@mbc-cqrs-serverless/sequence'

@Module({
  imports: [
    CommandModule.register({
      tableName: 'todo',
      dataSyncHandlers: [TodoDataSyncRdsHandler],
    }),
    SequencesModule, // Add SequencesModule（SequencesModuleを追加）
  ],
  // ...
})
export class TodoModule {}
```

### サービスの更新

```typescript
import { SequencesService } from '@mbc-cqrs-serverless/sequence'

@Injectable()
export class TodoService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
    private readonly prismaService: PrismaService,
    private readonly sequencesService: SequencesService, // Inject SequencesService（SequencesServiceを注入）
  ) {}

  async create(
    createDto: CreateTodoDto,
    opts: { invokeContext: IInvoke },
  ): Promise<TodoDataEntity> {
    const { tenantCode } = getUserContext(opts.invokeContext)

    // Generate sequential number（シーケンス番号を生成）
    const seqItem = await this.sequencesService.generateSequenceItem(
      {
        tenantCode,
        typeCode: TODO_PK_PREFIX,
      },
      opts,
    )

    this.logger.debug(`Generated sequence number: ${seqItem.formattedNo} for tenant: ${tenantCode}`)

    const pk = generateTodoPk(tenantCode)
    const sk = generateTodoSk() // SK is still ULID（SKは引き続きULID）

    const todo = new TodoCommandDto({
      pk,
      sk,
      id: generateId(pk, sk),
      tenantCode,
      code: sk,
      type: TODO_PK_PREFIX,
      version: VERSION_FIRST,
      seq: seqItem.no, // Store sequence number in seq field（seqフィールドにシーケンス番号を格納）
      name: createDto.name,
      attributes: createDto.attributes,
    })

    this.logger.debug('Creating todo with sequence:', todo)

    const item = await this.commandService.publish(todo, opts)
    return new TodoDataEntity(item as TodoDataEntity)
  }
}
```

## Part 7：非同期タスク処理（complete/with-task）

長時間実行されるTodo操作を非同期で処理します。

### タスクモジュールのインストール

```bash
npm install @mbc-cqrs-serverless/task
```

### タスクイベントの作成

```typescript
// src/todo/handler/todo-task.event.ts
import { TaskQueueEvent } from '@mbc-cqrs-serverless/task'

export class TodoTaskEvent extends TaskQueueEvent {}
```

### タスクハンドラーの作成

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

    // Implement your async task processing here（ここに非同期タスク処理を実装）
    // e.g., send notification, sync to external system（例：通知送信、外部システムへの同期）

    return { processed: true }
  }
}
```

### タスクキューイベントファクトリーの作成

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

### タスクモジュールの作成

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

## アプリケーションのテスト

### ローカルで実行

```bash
# ターミナル1：Dockerサービスを起動
npm run offline:docker

# ターミナル2：データベースマイグレーションを実行
npm run migrate

# ターミナル3：serverless offlineを起動
npm run offline:sls
```

### APIエンドポイントのテスト

```bash
# Todoを作成
curl -X POST http://localhost:3000/api/todo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"name": "My First Todo", "attributes": {"description": "Testing CQRS", "status": "PENDING"}}'

# Todo一覧を取得
curl "http://localhost:3000/api/todo?page=1&limit=10" \
  -H "Authorization: Bearer <your-token>"

# Todoを取得（注：pk内の#は%23にURLエンコードが必要）
curl "http://localhost:3000/api/todo/TODO%23MBC/<sk>" \
  -H "Authorization: Bearer <your-token>"

# Todoを更新
curl -X PATCH "http://localhost:3000/api/todo/TODO%23MBC/<sk>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"name": "Updated Todo", "version": 1}'

# Todoを削除
curl -X DELETE "http://localhost:3000/api/todo/TODO%23MBC/<sk>?version=1" \
  -H "Authorization: Bearer <your-token>"
```

### ユニットテスト

サービスのユニットテストを作成（`todo.service.spec.ts`）：

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { CommandService, DataService } from '@mbc-cqrs-serverless/core'
import { TodoService } from './todo.service'
import { PrismaService } from '../prisma/prisma.service'

// Mock getUserContext（getUserContextをモック）
jest.mock('@mbc-cqrs-serverless/core', () => ({
  ...jest.requireActual('@mbc-cqrs-serverless/core'),
  getUserContext: jest.fn().mockReturnValue({
    tenantCode: 'test',
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
      const mockTodo = { pk: 'TODO#test', sk: '01HXY', name: 'Test' }
      dataService.getItem.mockResolvedValue(mockTodo as any)

      const result = await service.findOne('TODO#test', '01HXY')

      expect(dataService.getItem).toHaveBeenCalledWith({
        pk: 'TODO#test',
        sk: '01HXY',
      })
      expect(result.name).toBe('Test')
    })

    it('should throw NotFoundException when not found', async () => {
      dataService.getItem.mockResolvedValue(null)

      await expect(service.findOne('TODO#test', 'nonexistent'))
        .rejects.toThrow(NotFoundException)
    })
  })
})
```

ユニットテストを実行：

```bash
npm test
```

### E2Eテスト

E2Eテストを作成（`test/todo.e2e-spec.ts`）：

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { TodoController } from '../src/todo/todo.controller'
import { TodoService } from '../src/todo/todo.service'

// Mock getUserContext（getUserContextをモック）
jest.mock('@mbc-cqrs-serverless/core', () => ({
  ...jest.requireActual('@mbc-cqrs-serverless/core'),
  getUserContext: jest.fn().mockReturnValue({
    tenantCode: 'test',
    userId: 'user-123',
  }),
  INVOKE_CONTEXT: () => () => {}, // Decorator stub（デコレータスタブ）
}))

describe('TodoController (e2e)', () => {
  let app: INestApplication

  const mockTodoData = {
    pk: 'TODO#test',
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

E2Eテスト用のJest設定（`test/jest-e2e.json`）：

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

E2Eテストを実行：

```bash
npm run test:e2e
```

## サンプルコードリポジトリ

各ステップの完全なソースコードは以下で入手できます：

- [step-01-setup](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/step-01-setup) - 環境セットアップ
- [step-02-create](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/step-02-create) - 作成操作
- [step-03-rds-sync](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/step-03-rds-sync) - RDS同期
- [step-04-read](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/step-04-read) - 読み取り操作
- [step-05-search](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/step-05-search) - 検索操作
- [step-06-update-delete](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/step-06-update-delete) - 更新と削除
- [step-07-sequence](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/step-07-sequence) - シーケンス番号
- [complete/basic](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/complete/basic) - 完全な基本実装
- [complete/with-task](https://github.com/mbc-net/mbc-cqrs-serverless-samples/tree/main/complete/with-task) - 非同期タスク処理付き

## 次のステップ

- [デプロイメントガイド](./deployment-guide) - AWSにデプロイ
- [テスト](./testing) - ユニットテストとE2Eテストを記述
- [モニタリング](./monitoring-logging) - 可観測性を追加
