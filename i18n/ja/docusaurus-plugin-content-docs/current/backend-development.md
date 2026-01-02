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
│   ├── [domain]-command.dto.ts        # Command input validation / コマンド入力バリデーション
│   ├── [domain]-attributes.dto.ts     # Domain-specific attributes / ドメイン固有の属性
│   └── [domain]-search.dto.ts         # Search parameters / 検索パラメータ
├── entity/
│   ├── [domain]-command.entity.ts     # Command entity / コマンドエンティティ
│   ├── [domain]-data.entity.ts        # Data entity / データエンティティ
│   └── [domain]-data-list.entity.ts   # List wrapper / リストラッパー
├── handler/
│   └── [domain]-rds.handler.ts        # RDS sync handler / RDS同期ハンドラー
├── [domain].service.ts                # Business logic / ビジネスロジック
├── [domain].controller.ts             # HTTP handlers / HTTPハンドラー
└── [domain].module.ts                 # Module definition / モジュール定義
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
   * 商品を作成または更新
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
   * 商品を一括作成/更新
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
   * PKとSKで商品を取得
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
   * PKで商品一覧を取得
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
   * 商品を検索
   */
  @Get('data')
  async searchData(
    @Query() searchDto: SearchDto,
  ): Promise<ProductDataListEntity> {
    return this.productService.searchData(searchDto);
  }

  /**
   * Resync all data to RDS
   * 全データをRDSに再同期
   */
  @Put('resync-data')
  async resyncData(): Promise<void> {
    return this.productService.resyncData();
  }
}
```

## サービス実装

### 基本サービスパターン

サービスにはビジネスロジックが含まれ、データ操作を調整します：

```typescript
// product.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { basename } from 'path';
import {
  CommandService,
  DataService,
  IInvoke,
  getCommandSource,
  KEY_SEPARATOR,
  generateId,
} from '@mbc-cqrs-serverless/core';
import { ulid } from 'ulid';
import { PrismaService } from '../prisma/prisma.service';
import { ProductCommandDto } from './dto/product-command.dto';
import { ProductDataEntity, ProductDataListEntity } from './entity';
import { getCustomUserContext } from '../helpers/context';

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
   * Create or update a product command
   * 商品コマンドを作成または更新
   */
  async publishCommand(
    cmdDto: ProductCommandDto,
    invokeContext: IInvoke,
  ): Promise<ProductDataEntity> {
    const { tenantCode } = getCustomUserContext(invokeContext);

    // Generate keys if not provided / キーが未指定の場合は生成
    if (!cmdDto.pk) {
      cmdDto.pk = `${PRODUCT_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`;
    }
    if (!cmdDto.sk) {
      cmdDto.sk = ulid();
    }
    if (!cmdDto.id) {
      cmdDto.id = generateId(cmdDto.pk, cmdDto.sk);
    }

    // Set tenant context / テナントコンテキストを設定
    cmdDto.tenantCode = tenantCode;

    const opts = {
      source: getCommandSource(
        basename(__dirname),
        this.constructor.name,
        'publishCommand',
      ),
      invokeContext,
    };

    const result = await this.commandService.publishSync(cmdDto, opts);
    return result as ProductDataEntity;
  }

  /**
   * Bulk publish commands with batch processing
   * バッチ処理でコマンドを一括発行
   */
  async publishBulkCommands(
    cmdDtos: ProductCommandDto[],
    invokeContext: IInvoke,
  ): Promise<ProductDataEntity[]> {
    const results: ProductDataEntity[] = [];
    const batchSize = 30;

    for (let i = 0; i < cmdDtos.length; i += batchSize) {
      const batch = cmdDtos.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(dto => this.publishCommand(dto, invokeContext)),
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get product data by key
   * キーで商品データを取得
   */
  async getData(pk: string, sk: string): Promise<ProductDataEntity> {
    return this.dataService.getItem({ pk, sk }) as Promise<ProductDataEntity>;
  }

  /**
   * List products by partition key
   * パーティションキーで商品一覧を取得
   */
  async listDataByPk(pk: string, searchDto: any): Promise<ProductDataListEntity> {
    const result = await this.dataService.listItemsByPk(pk, searchDto);
    return result as ProductDataListEntity;
  }

  /**
   * Search products with pagination
   * ページネーション付きで商品を検索
   */
  async searchData(searchDto: any): Promise<ProductDataListEntity> {
    const { page = 1, pageSize = 20, keyword, orderBys } = searchDto;

    const where: any = {
      isDeleted: false,
    };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prismaService.product.count({ where }),
      this.prismaService.product.findMany({
        where,
        take: pageSize,
        skip: pageSize * (page - 1),
        orderBy: orderBys || [{ createdAt: 'desc' }],
      }),
    ]);

    return new ProductDataListEntity({
      total,
      items: items as unknown as ProductDataEntity[],
    });
  }

  /**
   * Resync all data from DynamoDB to RDS
   * DynamoDBからRDSへ全データを再同期
   */
  async resyncData(): Promise<void> {
    this.logger.log('Starting data resync...');

    let lastEvaluatedKey: any = undefined;
    let processedCount = 0;

    do {
      const result = await this.dataService.scan({
        limit: 100,
        exclusiveStartKey: lastEvaluatedKey,
      });

      for (const item of result.items) {
        await this.prismaService.product.upsert({
          where: { id: item.id },
          update: this.mapToRdsRecord(item),
          create: this.mapToRdsRecord(item),
        });
        processedCount++;
      }

      lastEvaluatedKey = result.lastEvaluatedKey;
    } while (lastEvaluatedKey);

    this.logger.log(`Resync completed. Processed ${processedCount} items.`);
  }

  private mapToRdsRecord(item: ProductDataEntity): any {
    return {
      id: item.id,
      pk: item.pk,
      sk: item.sk,
      code: item.code,
      name: item.name,
      tenantCode: item.tenantCode,
      version: item.version,
      isDeleted: item.isDeleted ?? false,
      attributes: item.attributes,
      createdAt: item.createdAt,
      createdBy: item.createdBy ?? '',
      updatedAt: item.updatedAt,
      updatedBy: item.updatedBy ?? '',
    };
  }
}
```

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
   * コマンドをRDSに同期（upsert）
   */
  async up(cmd: CommandModel): Promise<any> {
    // Remove version suffix from SK / SKからバージョンサフィックスを削除
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
          // Map attributes to columns / 属性をカラムにマッピング
          category: attrs?.category,
          price: attrs?.price,
          description: attrs?.description,
          specification: attrs?.specification,
          // Audit fields / 監査フィールド
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
   * ロールバックまたは削除を処理
   */
  async down(cmd: CommandModel): Promise<any> {
    // Soft delete implementation / ソフトデリート実装
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
  // CQRS composite keys / CQRS複合キー
  id     String @id            // PK#SK without version
  cpk    String                // Command PK
  csk    String                // Command SK with version
  pk     String                // Data PK
  sk     String                // Data SK without version

  // Domain fields / ドメインフィールド
  code   String
  name   String

  // Domain-specific / ドメイン固有
  category     String?
  price        Decimal?
  description  String?
  specification Json?

  // Multi-tenant / マルチテナント
  tenantCode String

  // Audit fields / 監査フィールド
  version   Int
  isDeleted Boolean  @default(false)
  createdBy String   @default("")
  createdIp String   @default("")
  createdAt DateTime
  updatedBy String   @default("")
  updatedIp String   @default("")
  updatedAt DateTime

  // Indexes / インデックス
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
    basename(__dirname),      // Module name / モジュール名
    this.constructor.name,    // Class name / クラス名
    'methodName',             // Method name / メソッド名
  ),
  invokeContext,
};
```

### 2. バッチ処理

タイムアウトを避けるために大規模なデータセットをバッチで処理します：

```typescript
async processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize = 30,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}
```

### 3. エラーハンドリング

ロギングを含む適切なエラーハンドリングを実装します：

```typescript
try {
  await this.processItem(item);
} catch (error) {
  this.logger.error(`Failed to process item ${item.id}:`, error);

  // Send alarm for critical errors / 重大エラーの場合はアラームを送信
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
