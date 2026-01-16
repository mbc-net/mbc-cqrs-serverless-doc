---
sidebar_position: 15
description: MBC CQRS Serverlessフレームワークによるバックエンド開発の包括的ガイド。モジュール構造、サービスパターン、ベストプラクティスを学びます。
---

# バックエンド開発ガイド

このガイドでは、MBC CQRS Serverlessフレームワークを使用したバックエンドアプリケーション構築の包括的なパターンとベストプラクティスを提供します。例は本番プロジェクトから一般化されています。

## モジュール構造

### 標準モジュールレイアウト

すべてのドメインモジュールは、この一貫した構造に従います：

```
src/[domain]/
├── dto/
│   ├── [domain]-command.dto.ts        # Command input validation
│   ├── [domain]-attributes.dto.ts     # Domain-specific attributes
│   └── [domain]-search.dto.ts         # Search parameters
├── entity/
│   ├── [domain]-command.entity.ts     # Command entity
│   ├── [domain]-data.entity.ts        # Data entity
│   └── [domain]-data-list.entity.ts   # List wrapper
├── handler/
│   └── [domain]-rds.handler.ts        # RDS sync handler
├── [domain].service.ts                # Business logic
├── [domain].controller.ts             # HTTP handlers
└── [domain].module.ts                 # Module definition
```

### モジュール登録

CommandModuleにモジュールを登録してCQRS機能を有効にします：

```typescript
// product.module.ts
import { Module } from '@nestjs/common';
import { CommandModule } from '@mbc-cqrs-serverless/core';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductDataSyncRdsHandler } from './handler/product-rds.handler';

@Module({
  imports: [
    CommandModule.register({
      tableName: 'product',
      dataSyncHandlers: [ProductDataSyncRdsHandler],
    }),
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
```

## エンティティ設計

### コマンドエンティティ

コマンドエンティティは書き込み操作を表し、バージョン追跡を含みます：

```typescript
// entity/product-command.entity.ts
import { CommandEntity } from '@mbc-cqrs-serverless/core';
import { ProductAttributes } from '../dto/product-attributes.dto';

export class ProductCommandEntity extends CommandEntity {
  attributes: ProductAttributes;
}
```

### データエンティティ

データエンティティは処理後の読み取りモデルを表します：

```typescript
// entity/product-data.entity.ts
import { DataEntity } from '@mbc-cqrs-serverless/core';
import { ProductAttributes } from '../dto/product-attributes.dto';

export class ProductDataEntity extends DataEntity {
  attributes: ProductAttributes;
}

// entity/product-data-list.entity.ts
import { DataListEntity } from '@mbc-cqrs-serverless/core';
import { ProductDataEntity } from './product-data.entity';

export class ProductDataListEntity extends DataListEntity<ProductDataEntity> {
  items: ProductDataEntity[];
}
```

### 属性DTO

バリデーション付きでドメイン固有の属性を定義します：

```typescript
// dto/product-attributes.dto.ts
import { IsString, IsNumber, IsOptional, ValidateNested, Type } from 'class-validator';

export class ProductAttributes {
  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => ProductSpecification)
  @ValidateNested()
  @IsOptional()
  specification?: ProductSpecification;
}

export class ProductSpecification {
  @IsString()
  @IsOptional()
  weight?: string;

  @IsString()
  @IsOptional()
  dimensions?: string;
}
```

## コントローラーパターン

### 標準コントローラー

コントローラーは薄く保ち、ビジネスロジックはサービスに委譲すべきです：

```typescript
// product.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { INVOKE_CONTEXT, IInvoke, SearchDto } from '@mbc-cqrs-serverless/core';
import { ProductService } from './product.service';
import { ProductCommandDto } from './dto/product-command.dto';
import { ProductDataEntity, ProductDataListEntity } from './entity';

@Controller('api/product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  /**
   * Create or update a product
   */
  @Post('/')
  async publishCommand(
    @INVOKE_CONTEXT() invokeContext: IInvoke,
    @Body() cmdDto: ProductCommandDto,
  ): Promise<ProductDataEntity> {
    return this.productService.publishCommand(cmdDto, invokeContext);
  }

  /**
   * Bulk create/update products
   */
  @Post('/bulk')
  async publishBulkCommands(
    @INVOKE_CONTEXT() invokeContext: IInvoke,
    @Body() cmdDtos: ProductCommandDto[],
  ): Promise<ProductDataEntity[]> {
    return this.productService.publishBulkCommands(cmdDtos, invokeContext);
  }

  /**
   * Get product by PK and SK
   */
  @Get('data/:pk/:sk')
  async getData(
    @Param('pk') pk: string,
    @Param('sk') sk: string,
  ): Promise<ProductDataEntity> {
    return this.productService.getData(pk, sk);
  }

  /**
   * List products by PK
   */
  @Get('data/:pk')
  async listDataByPk(
    @Param('pk') pk: string,
    @Query() searchDto: SearchDto,
  ): Promise<ProductDataListEntity> {
    return this.productService.listDataByPk(pk, searchDto);
  }

  /**
   * Search products
   */
  @Get('data')
  async searchData(
    @Query() searchDto: SearchDto,
  ): Promise<ProductDataListEntity> {
    return this.productService.searchData(searchDto);
  }

  /**
   * Resync all data to RDS
   */
  @Put('resync-data/:pk')
  async resyncData(@Param('pk') pk: string): Promise<void> {
    return this.productService.resyncData(pk);
  }
}
```

## サービス実装

### 基本サービスパターン

サービスにはビジネスロジックが含まれ、データ操作を調整します。最小限の例を示します：

```typescript
// product.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  CommandService,
  DataService,
  IInvoke,
  KEY_SEPARATOR,
  generateId,
  getUserContext,
  VERSION_FIRST,
} from '@mbc-cqrs-serverless/core';
import { ulid } from 'ulid';
import { PrismaService } from '../prisma/prisma.service';
import { ProductCommandDto } from './dto/product-command.dto';
import { ProductDataEntity } from './entity';

const PRODUCT_PK_PREFIX = 'PRODUCT';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Create a new product (新しい商品を作成)
   */
  async create(
    createDto: { name: string; description?: string },
    opts: { invokeContext: IInvoke },
  ): Promise<ProductDataEntity> {
    const { tenantCode } = getUserContext(opts.invokeContext);

    const pk = `${PRODUCT_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`;
    const sk = ulid();

    const command = new ProductCommandDto({
      pk,
      sk,
      id: generateId(pk, sk),
      tenantCode,
      code: sk,
      type: 'PRODUCT',
      name: createDto.name,
      version: VERSION_FIRST,
      attributes: { description: createDto.description },
    });

    const item = await this.commandService.publishAsync(command, {
      invokeContext: opts.invokeContext,
    });

    return new ProductDataEntity(item);
  }

  /**
   * Get product by key (キーで商品を取得)
   */
  async findOne(pk: string, sk: string): Promise<ProductDataEntity> {
    const item = await this.dataService.getItem({ pk, sk });
    return new ProductDataEntity(item);
  }
}
```

:::tip 完全なServiceパターンについて
包括的なCRUD操作、バッチ処理、楽観的ロック、およびその他の高度なパターンについては、[Service実装パターン](./service-patterns.md)を参照してください。
:::

## データ同期ハンドラー

### RDS同期ハンドラー

複雑なクエリのためにDynamoDBからRDSにデータを同期します：

```typescript
// handler/product-rds.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  IDataSyncHandler,
  CommandModel,
  removeSortKeyVersion,
} from '@mbc-cqrs-serverless/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductAttributes } from '../dto/product-attributes.dto';

@Injectable()
export class ProductDataSyncRdsHandler implements IDataSyncHandler {
  private readonly logger = new Logger(ProductDataSyncRdsHandler.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Sync command to RDS (upsert)
   */
  async up(cmd: CommandModel): Promise<any> {
    // Remove version suffix from SK
    const sk = removeSortKeyVersion(cmd.sk);
    const attrs = cmd.attributes as ProductAttributes;

    try {
      await this.prismaService.product.upsert({
        where: { id: cmd.id },
        update: {
          pk: cmd.pk,
          sk: sk,
          code: cmd.code,
          name: cmd.name,
          version: cmd.version,
          tenantCode: cmd.tenantCode,
          isDeleted: cmd.isDeleted ?? false,
          // Map attributes to columns
          category: attrs?.category,
          price: attrs?.price,
          description: attrs?.description,
          specification: attrs?.specification,
          // Audit fields
          createdAt: cmd.createdAt,
          createdBy: cmd.createdBy ?? '',
          createdIp: cmd.createdIp ?? '',
          updatedAt: cmd.updatedAt,
          updatedBy: cmd.updatedBy ?? '',
          updatedIp: cmd.updatedIp ?? '',
        },
        create: {
          id: cmd.id,
          cpk: cmd.pk,
          csk: cmd.sk,
          pk: cmd.pk,
          sk: sk,
          code: cmd.code,
          name: cmd.name,
          version: cmd.version,
          tenantCode: cmd.tenantCode,
          isDeleted: cmd.isDeleted ?? false,
          category: attrs?.category,
          price: attrs?.price,
          description: attrs?.description,
          specification: attrs?.specification,
          createdAt: cmd.createdAt,
          createdBy: cmd.createdBy ?? '',
          createdIp: cmd.createdIp ?? '',
          updatedAt: cmd.updatedAt,
          updatedBy: cmd.updatedBy ?? '',
          updatedIp: cmd.updatedIp ?? '',
        },
      });

      this.logger.debug(`Synced product ${cmd.id} to RDS`);
    } catch (error) {
      this.logger.error(`Failed to sync product ${cmd.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle rollback or delete
   */
  async down(cmd: CommandModel): Promise<any> {
    // Soft delete implementation
    await this.prismaService.product.update({
      where: { id: cmd.id },
      data: { isDeleted: true },
    });
  }
}
```

## Prismaスキーマ

### 標準モデル定義

CQRSフィールドを含むPrismaモデルを定義します：

```prisma
// prisma/schema.prisma
model Product {
  // CQRS composite keys
  id     String @id            // PK#SK without version
  cpk    String                // Command PK
  csk    String                // Command SK with version
  pk     String                // Data PK
  sk     String                // Data SK without version

  // Domain fields
  code   String
  name   String

  // Domain-specific
  category     String?
  price        Decimal?
  description  String?
  specification Json?

  // Multi-tenant
  tenantCode String

  // Audit fields
  version   Int
  isDeleted Boolean  @default(false)
  createdBy String   @default("")
  createdIp String   @default("")
  createdAt DateTime
  updatedBy String   @default("")
  updatedIp String   @default("")
  updatedAt DateTime

  // Indexes
  @@unique([cpk, csk])
  @@unique([pk, sk])
  @@unique([tenantCode, code])
  @@index([tenantCode, name])
  @@index([category])
}
```

## ベストプラクティス

### 1. ソース追跡

デバッグのために操作のソースを常に追跡します：

```typescript
const opts = {
  source: getCommandSource(
    basename(__dirname),      // Module name
    this.constructor.name,    // Class name
    'methodName',             // Method name
  ),
  invokeContext,
};
```

### 2. バッチ処理

タイムアウトを避けるために大規模なデータセットをバッチで処理します。詳細な例については[Service実装パターン - バッチ操作](./service-patterns.md#batch-operations)を参照してください。

### 3. エラーハンドリング

ロギングを含む適切なエラーハンドリングを実装します：

```typescript
try {
  await this.processItem(item);
} catch (error) {
  this.logger.error(`Failed to process item ${item.id}:`, error);

  // Send alarm for critical errors
  if (this.isCriticalError(error)) {
    await this.snsService.publish({
      topicArn: this.alarmTopicArn,
      subject: 'Processing Error',
      message: JSON.stringify({ item, error: error.message }),
    });
  }

  throw error;
}
```

### 4. データ一貫性

不要な同期を避けるためにダーティチェックを使用します：

```typescript
import { isNotCommandDirty } from '@mbc-cqrs-serverless/core';

async syncData(newData: any, existingData: any): Promise<void> {
  if (isNotCommandDirty(existingData, newData)) {
    this.logger.debug('Data unchanged, skipping sync');
    return;
  }

  await this.performSync(newData);
}
```

### 5. ページネーション

一覧操作では常にページネーションをサポートします：

```typescript
async searchWithPagination(
  searchDto: SearchDto,
): Promise<DataListEntity> {
  const { page = 1, pageSize = 20 } = searchDto;

  const [total, items] = await Promise.all([
    this.prismaService.entity.count({ where }),
    this.prismaService.entity.findMany({
      where,
      take: pageSize,
      skip: pageSize * (page - 1),
      orderBy: [{ createdAt: 'desc' }],
    }),
  ]);

  return new DataListEntity({ total, items });
}
```

## 関連ドキュメント

- [Service Patterns](./service-patterns.md) - 高度なサービス実装パターン
- [Data Sync Handler Examples](./data-sync-handler-examples.md) - 包括的な同期ハンドラー例
- [Key Patterns](./key-patterns.md) - PK/SK設計パターン
- [Multi-Tenant Patterns](./multi-tenant-patterns.md) - マルチテナント実装
- [Import/Export Patterns](./import-export-patterns.md) - バッチデータ処理
