---
sidebar_position: 18
description: MBC CQRS Serverlessにおけるテナント間操作、スキーマ進化、一括データ処理のためのデータ移行戦略を学びます。
---

# データ移行パターン

このガイドでは、テナント間データ移行、スキーマ進化、インポートモジュールを使用した一括データ操作、ロールバック手順など、MBC CQRS Serverlessアプリケーションにおけるデータ移行戦略について説明します。

## このガイドを使用するタイミング

以下の場合にこのガイドを使用してください：

- テナント間でデータを移行する
- 互換性を維持しながらデータスキーマを進化させる
- インポートモジュールで一括データ操作を実行する
- 失敗した移行のロールバック手順を実装する
- 移行プロセス中にデータを検証する

## 移行アーキテクチャの概要

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        データ移行フロー                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
│   │   ソース  │────>│ 変換 │────>│  ターゲット   │               │
│   │   データ    │     │ & 検証 │     │   データ    │               │
│   └─────────────┘     └─────────────┘     └─────────────┘               │
│          │                   │                    │                      │
│          │                   ▼                    │                      │
│          │          ┌─────────────┐              │                      │
│          │          │  インポート   │              │                      │
│          │          │  モジュール   │              │                      │
│          └─────────>│  ストラテジー │<─────────────┘                      │
│                     └─────────────┘                                      │
│                            │                                             │
│                            ▼                                             │
│                     ┌─────────────┐     ┌─────────────┐                 │
│                     │ CommandSvc│────>│  DynamoDB │                 │
│                     │ (バージョン) │     │ (履歴) │                 │
│                     └─────────────┘     └─────────────┘                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## テナント間データ移行

### パターン1：テナント間でデータをコピー

CommandServiceを使用してあるテナントから別のテナントにデータをコピーします。これにより、ターゲットテナントでイベントソーシング履歴が保持されます。

```typescript
// migration/tenant-migration.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  CommandService,
  DataService,
  KEY_SEPARATOR,
  generateId,
  IInvoke,
} from '@mbc-cqrs-serverless/core';

@Injectable()
export class TenantMigrationService {
  private readonly logger = new Logger(TenantMigrationService.name);

  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
  ) {}

  /**
   * Copy all entities of a type from source to target tenant (ソースからターゲットテナントにすべてのエンティティをコピー)
   */
  async copyEntities(
    entityType: string,
    sourceTenantCode: string,
    targetTenantCode: string,
    invokeContext: IInvoke,
  ): Promise<{ copied: number; errors: string[] }> {
    const sourcePk = `${entityType}${KEY_SEPARATOR}${sourceTenantCode}`;
    const sourceData = await this.dataService.listItemsByPk(sourcePk);

    let copied = 0;
    const errors: string[] = [];

    for (const item of sourceData.items) {
      try {
        // Create new keys for target tenant (ターゲットテナント用の新しいキーを作成)
        const targetPk = `${entityType}${KEY_SEPARATOR}${targetTenantCode}`;
        const targetId = generateId(targetPk, item.sk);

        await this.commandService.publishSync({
          pk: targetPk,
          sk: item.sk,
          id: targetId,
          tenantCode: targetTenantCode,
          code: item.code,
          name: item.name,
          type: item.type,
          attributes: item.attributes,
          // Track migration source (移行ソースを追跡)
          metadata: {
            migratedFrom: item.id,
            migratedAt: new Date().toISOString(),
            sourceTenant: sourceTenantCode,
          },
        }, { invokeContext });

        copied++;
      } catch (error) {
        errors.push(`Failed to copy ${item.id}: ${error.message}`);
        this.logger.error(`Migration error for ${item.id}`, error);
      }
    }

    this.logger.log(`Copied ${copied} ${entityType} items from ${sourceTenantCode} to ${targetTenantCode}`);
    return { copied, errors };
  }
}
```

### パターン2：インポートモジュールを使用した一括移行

変換サポート付きの大規模なテナント間移行にインポートモジュールを使用します。

```typescript
// migration/bulk-migration.strategy.ts
import { Injectable } from '@nestjs/common';
import { KEY_SEPARATOR, generateId } from '@mbc-cqrs-serverless/core';
import { BaseImportStrategy } from '@mbc-cqrs-serverless/import';

export interface MigrationInput {
  sourcePk: string;
  sourceSk: string;
  code: string;
  name: string;
  attributes: Record<string, any>;
  targetTenantCode: string;
}

export interface MigrationDto {
  pk: string;
  sk: string;
  id: string;
  code: string;
  name: string;
  tenantCode: string;
  type: string;
  attributes: Record<string, any>;
}

@Injectable()
export class BulkMigrationImportStrategy
  extends BaseImportStrategy<MigrationInput, MigrationDto>
{
  /**
   * Transform source data to target tenant format (ソースデータをターゲットテナント形式に変換)
   */
  async transform(input: MigrationInput): Promise<MigrationDto> {
    const { targetTenantCode } = input;

    // Extract entity type from source PK (ソースPKからエンティティタイプを抽出)
    const pkParts = input.sourcePk.split(KEY_SEPARATOR);
    const entityType = pkParts[0];

    // Build target keys (ターゲットキーを構築)
    const targetPk = `${entityType}${KEY_SEPARATOR}${targetTenantCode}`;
    const targetId = generateId(targetPk, input.sourceSk);

    return {
      pk: targetPk,
      sk: input.sourceSk,
      id: targetId,
      code: input.code,
      name: input.name,
      tenantCode: targetTenantCode,
      type: entityType,
      attributes: {
        ...input.attributes,
        // Add migration metadata (移行メタデータを追加)
        _migrated: true,
        _sourceKey: `${input.sourcePk}#${input.sourceSk}`,
      },
    };
  }
}
```

## スキーマ進化戦略

### 戦略1：後方互換性のある変更

デフォルト値を持つ新しいフィールドを追加します。既存のデータは移行なしで引き続き動作します。

```typescript
// Backward compatible attribute evolution (後方互換性のある属性進化)
interface ProductAttributesV1 {
  name: string;
  price: number;
}

interface ProductAttributesV2 extends ProductAttributesV1 {
  category?: string;        // New optional field (新しいオプションフィールド)
  tags?: string[];          // New optional field (新しいオプションフィールド)
  description?: string;     // New optional field (新しいオプションフィールド)
}

// product/product.service.ts
@Injectable()
export class ProductService {
  /**
   * Get product with schema version handling (スキーマバージョン処理を含む製品を取得)
   */
  async getProduct(key: DetailKey): Promise<ProductDataEntity> {
    const product = await this.dataService.getItem(key);

    // Apply defaults for missing fields (欠落フィールドにデフォルトを適用)
    return {
      ...product,
      attributes: {
        ...product.attributes,
        category: product.attributes.category ?? 'uncategorized',
        tags: product.attributes.tags ?? [],
        description: product.attributes.description ?? '',
      },
    };
  }
}
```

### 戦略2：データ変換移行

インポートモジュールのストラテジーを使用して既存データを新しいスキーマ形式に変換します。

```typescript
// migration/schema-migration.strategy.ts
import { Injectable } from '@nestjs/common';
import {
  CommandService,
  DataService,
  DataModel,
} from '@mbc-cqrs-serverless/core';
import {
  BaseProcessStrategy,
  ComparisonResult,
  ComparisonStatus,
} from '@mbc-cqrs-serverless/import';

interface OldProductAttributes {
  productName: string;      // Old field name (旧フィールド名)
  unitPrice: number;        // Old field name (旧フィールド名)
  categoryCode: string;     // Renamed field (名前変更されたフィールド)
}

interface NewProductAttributes {
  name: string;             // New field name (新フィールド名)
  price: number;            // New field name (新フィールド名)
  category: string;         // New field name (新フィールド名)
  version: 'v2';            // Schema version marker (スキーマバージョンマーカー)
}

@Injectable()
export class SchemaTransformationStrategy
  extends BaseProcessStrategy<DataModel, NewProductAttributes>
{
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
  ) {
    super();
  }

  getCommandService(): CommandService {
    return this.commandService;
  }

  /**
   * Compare to detect schema version differences (スキーマバージョンの違いを検出するために比較)
   */
  async compare(
    dto: NewProductAttributes,
    tenantCode: string,
  ): Promise<ComparisonResult<DataModel>> {
    // Check if data needs transformation (データが変換を必要とするか確認)
    const existing = await this.dataService.getItem({
      pk: dto.pk,
      sk: dto.sk,
    });

    if (!existing) {
      return { status: ComparisonStatus.NOT_EXIST };
    }

    // Check schema version (スキーマバージョンを確認)
    if (existing.attributes?.version !== 'v2') {
      return { status: ComparisonStatus.CHANGED, existingData: existing };
    }

    return { status: ComparisonStatus.EQUAL };
  }

  /**
   * Map old schema to new schema (旧スキーマを新スキーマにマッピング)
   */
  async map(
    status: ComparisonStatus,
    dto: NewProductAttributes,
    tenantCode: string,
    existingData?: DataModel,
  ) {
    if (status === ComparisonStatus.CHANGED && existingData) {
      const oldAttrs = existingData.attributes as OldProductAttributes;

      return {
        pk: existingData.pk,
        sk: existingData.sk,
        version: existingData.version,
        attributes: {
          // Transform field names (フィールド名を変換)
          name: oldAttrs.productName,
          price: oldAttrs.unitPrice,
          category: oldAttrs.categoryCode,
          version: 'v2',
        },
      };
    }

    return { ...dto, version: 0 };
  }
}
```

### 戦略3：バージョン付き属性パターン

段階的な移行のために属性にスキーマバージョンを保存します。

```typescript
// entity/versioned-entity.ts
export interface VersionedAttributes {
  _schemaVersion: number;
  [key: string]: any;
}

// migration/attribute-migrator.service.ts
@Injectable()
export class AttributeMigratorService {
  private readonly migrations: Map<number, (attrs: any) => any> = new Map();

  constructor() {
    // Register migration functions (移行関数を登録)
    this.migrations.set(1, this.migrateV1ToV2.bind(this));
    this.migrations.set(2, this.migrateV2ToV3.bind(this));
  }

  /**
   * Apply all necessary migrations to bring attributes to current version (属性を現在のバージョンにするために必要なすべての移行を適用)
   */
  migrate(attributes: VersionedAttributes, currentVersion: number): any {
    let version = attributes._schemaVersion || 1;
    let result = { ...attributes };

    while (version < currentVersion) {
      const migrationFn = this.migrations.get(version);
      if (migrationFn) {
        result = migrationFn(result);
        version++;
      } else {
        throw new Error(`No migration found for version ${version}`);
      }
    }

    result._schemaVersion = currentVersion;
    return result;
  }

  private migrateV1ToV2(attrs: any): any {
    return {
      ...attrs,
      // V1 to V2: Split fullName into firstName and lastName (V1からV2：fullNameをfirstNameとlastNameに分割)
      firstName: attrs.fullName?.split(' ')[0] ?? '',
      lastName: attrs.fullName?.split(' ').slice(1).join(' ') ?? '',
    };
  }

  private migrateV2ToV3(attrs: any): any {
    return {
      ...attrs,
      // V2 to V3: Add new required fields with defaults (V2からV3：デフォルト値を持つ新しい必須フィールドを追加)
      createdAt: attrs.createdAt ?? new Date().toISOString(),
      status: attrs.status ?? 'active',
    };
  }
}
```

## 一括操作でのインポートモジュールの使用

### CSVベースの一括移行

データをCSVにエクスポートし、変換してインポートモジュールを使用して再インポートします。

```typescript
// migration/csv-migration.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { S3Service, DataService, KEY_SEPARATOR } from '@mbc-cqrs-serverless/core';
import { ProcessingMode } from '@mbc-cqrs-serverless/import';
import { PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class CsvMigrationService {
  private readonly logger = new Logger(CsvMigrationService.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly dataService: DataService,
  ) {}

  /**
   * Export entities to CSV for migration (移行用にエンティティをCSVにエクスポート)
   */
  async exportToMigrationCsv(
    entityType: string,
    tenantCode: string,
    targetTenantCode: string,
  ): Promise<{ bucket: string; key: string }> {
    const pk = `${entityType}${KEY_SEPARATOR}${tenantCode}`;
    const data = await this.dataService.listItemsByPk(pk);

    // Build CSV with migration columns (移行カラムを含むCSVを構築)
    const headers = ['sourcePk', 'sourceSk', 'code', 'name', 'attributes', 'targetTenantCode'];
    const rows = data.items.map(item => [
      item.pk,
      item.sk,
      item.code,
      item.name,
      JSON.stringify(item.attributes),
      targetTenantCode,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(this.escapeCsvValue).join(',')),
    ].join('\n');

    // Upload to S3 (S3にアップロード)
    const bucket = this.s3Service.privateBucket;
    const key = `migrations/${Date.now()}/migration-${entityType}-${tenantCode}-to-${targetTenantCode}.csv`;

    await this.s3Service.client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: csvContent,
      ContentType: 'text/csv; charset=utf-8',
    }));

    this.logger.log(`Exported ${data.items.length} items to ${key}`);
    return { bucket, key };
  }

  /**
   * Create migration import job (移行インポートジョブを作成)
   */
  async startMigrationImport(
    bucket: string,
    key: string,
    tenantCode: string,
  ): Promise<{ jobId: string }> {
    // Import module handles the migration via configured strategy (インポートモジュールが設定されたストラテジーで移行を処理)
    // The strategy will transform data to target tenant format (ストラテジーがデータをターゲットテナント形式に変換)
    return {
      jobId: `migration-${Date.now()}`,
      // Actual job creation would use ImportModule API (実際のジョブ作成はImportModule APIを使用)
    };
  }

  private escapeCsvValue(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}
```

### 移行用インポートプロセスストラテジー

移行固有のロジックを処理するプロセスストラテジーを実装します。

```typescript
// migration/migration-process.strategy.ts
import { Injectable } from '@nestjs/common';
import {
  CommandService,
  DataService,
  DataModel,
  CommandInputModel,
  CommandPartialInputModel,
} from '@mbc-cqrs-serverless/core';
import {
  BaseProcessStrategy,
  ComparisonResult,
  ComparisonStatus,
  IProcessStrategy,
} from '@mbc-cqrs-serverless/import';

interface MigrationDto {
  pk: string;
  sk: string;
  id: string;
  code: string;
  name: string;
  tenantCode: string;
  type: string;
  attributes: Record<string, any>;
}

@Injectable()
export class MigrationProcessStrategy
  extends BaseProcessStrategy<DataModel, MigrationDto>
  implements IProcessStrategy<DataModel, MigrationDto>
{
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
  ) {
    super();
  }

  getCommandService(): CommandService {
    return this.commandService;
  }

  /**
   * Compare migrated data with existing target data (移行データを既存のターゲットデータと比較)
   */
  async compare(
    dto: MigrationDto,
    tenantCode: string,
  ): Promise<ComparisonResult<DataModel>> {
    try {
      const existing = await this.dataService.getItem({
        pk: dto.pk,
        sk: dto.sk,
      });

      if (!existing) {
        return { status: ComparisonStatus.NOT_EXIST };
      }

      // Check if already migrated (すでに移行済みか確認)
      if (existing.attributes?._migrated) {
        return { status: ComparisonStatus.EQUAL };
      }

      // Data exists but not migrated - update it (データは存在するが移行されていない - 更新)
      return { status: ComparisonStatus.CHANGED, existingData: existing };
    } catch (error) {
      return { status: ComparisonStatus.NOT_EXIST };
    }
  }

  /**
   * Map migration data to command payload (移行データをコマンドペイロードにマッピング)
   */
  async map(
    status: ComparisonStatus,
    dto: MigrationDto,
    tenantCode: string,
    existingData?: DataModel,
  ): Promise<CommandInputModel | CommandPartialInputModel> {
    if (status === ComparisonStatus.NOT_EXIST) {
      // Create new record (新しいレコードを作成)
      return {
        pk: dto.pk,
        sk: dto.sk,
        id: dto.id,
        tenantCode: dto.tenantCode,
        code: dto.code,
        name: dto.name,
        type: dto.type,
        version: 0,
        attributes: dto.attributes,
      };
    }

    // Update existing record (既存のレコードを更新)
    return {
      pk: dto.pk,
      sk: dto.sk,
      version: existingData?.version ?? 0,
      attributes: {
        ...existingData?.attributes,
        ...dto.attributes,
        _migrated: true,
        _migratedAt: new Date().toISOString(),
      },
    };
  }
}
```

## ロールバック手順

### イベントソーシングベースのロールバック

履歴テーブルを活用して以前のバージョンを復元します。

```typescript
// migration/rollback.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  CommandService,
  DataService,
  HistoryService,
  IInvoke,
} from '@mbc-cqrs-serverless/core';

@Injectable()
export class RollbackService {
  private readonly logger = new Logger(RollbackService.name);

  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
    private readonly historyService: HistoryService,
  ) {}

  /**
   * Rollback entity to a specific version (エンティティを特定のバージョンにロールバック)
   */
  async rollbackToVersion(
    pk: string,
    sk: string,
    targetVersion: number,
    invokeContext: IInvoke,
  ): Promise<void> {
    // Get historical version (履歴バージョンを取得)
    const historicalData = await this.historyService.getVersion(
      pk,
      sk,
      targetVersion,
    );

    if (!historicalData) {
      throw new Error(`Version ${targetVersion} not found for ${pk}#${sk}`);
    }

    // Get current version for optimistic locking (楽観的ロック用の現在のバージョンを取得)
    const currentData = await this.dataService.getItem({ pk, sk });

    // Restore to historical state (履歴状態に復元)
    await this.commandService.publishSync({
      pk,
      sk,
      id: currentData.id,
      tenantCode: currentData.tenantCode,
      code: historicalData.code,
      name: historicalData.name,
      type: historicalData.type,
      version: currentData.version,
      attributes: {
        ...historicalData.attributes,
        _rolledBackFrom: currentData.version,
        _rolledBackAt: new Date().toISOString(),
      },
    }, { invokeContext });

    this.logger.log(`Rolled back ${pk}#${sk} from v${currentData.version} to v${targetVersion}`);
  }

  /**
   * Rollback migration by timestamp (タイムスタンプで移行をロールバック)
   */
  async rollbackMigration(
    entityType: string,
    tenantCode: string,
    migrationTimestamp: string,
    invokeContext: IInvoke,
  ): Promise<{ rolledBack: number; errors: string[] }> {
    const pk = `${entityType}#${tenantCode}`;
    const data = await this.dataService.listItemsByPk(pk);

    let rolledBack = 0;
    const errors: string[] = [];

    for (const item of data.items) {
      // Check if item was part of the migration (アイテムが移行の一部だったか確認)
      if (item.attributes?._migratedAt === migrationTimestamp) {
        try {
          // Find version before migration (移行前のバージョンを検索)
          const history = await this.historyService.listVersions(
            item.pk,
            item.sk,
          );

          const preVersion = history.find(h =>
            !h.attributes?._migrated ||
            new Date(h.updatedAt) < new Date(migrationTimestamp)
          );

          if (preVersion) {
            await this.rollbackToVersion(
              item.pk,
              item.sk,
              preVersion.version,
              invokeContext,
            );
            rolledBack++;
          }
        } catch (error) {
          errors.push(`Failed to rollback ${item.id}: ${error.message}`);
        }
      }
    }

    return { rolledBack, errors };
  }
}
```

### 安全なロールバックのためのソフト削除パターン

簡単なリカバリーを可能にするためにソフト削除を使用します。

```typescript
// migration/safe-migration.service.ts
@Injectable()
export class SafeMigrationService {
  /**
   * Migrate with soft delete for rollback capability (ロールバック機能のためにソフト削除で移行)
   */
  async migrateWithSoftDelete(
    sourcePk: string,
    targetPk: string,
    invokeContext: IInvoke,
  ): Promise<{ migratedIds: string[]; originalIds: string[] }> {
    const sourceData = await this.dataService.listItemsByPk(sourcePk);

    const migratedIds: string[] = [];
    const originalIds: string[] = [];

    for (const item of sourceData.items) {
      // Create new record in target (ターゲットに新しいレコードを作成)
      const targetId = generateId(targetPk, item.sk);
      await this.commandService.publishSync({
        pk: targetPk,
        sk: item.sk,
        id: targetId,
        tenantCode: this.extractTenant(targetPk),
        code: item.code,
        name: item.name,
        type: item.type,
        attributes: {
          ...item.attributes,
          _migratedFrom: item.id,
        },
      }, { invokeContext });
      migratedIds.push(targetId);

      // Soft delete original (don't hard delete) (元のレコードをソフト削除（ハード削除しない）)
      await this.commandService.publishPartialUpdateSync({
        pk: item.pk,
        sk: item.sk,
        version: item.version,
        isDeleted: true,
        attributes: {
          ...item.attributes,
          _migratedTo: targetId,
          _deletedAt: new Date().toISOString(),
        },
      }, { invokeContext });
      originalIds.push(item.id);
    }

    return { migratedIds, originalIds };
  }

  /**
   * Rollback by restoring soft-deleted records (ソフト削除されたレコードを復元してロールバック)
   */
  async rollbackSoftDeleteMigration(
    originalIds: string[],
    migratedIds: string[],
    invokeContext: IInvoke,
  ): Promise<void> {
    // Restore original records (元のレコードを復元)
    for (const id of originalIds) {
      const item = await this.dataService.getItemById(id);
      if (item?.isDeleted) {
        await this.commandService.publishPartialUpdateSync({
          pk: item.pk,
          sk: item.sk,
          version: item.version,
          isDeleted: false,
          attributes: {
            ...item.attributes,
            _migratedTo: undefined,
            _deletedAt: undefined,
            _restoredAt: new Date().toISOString(),
          },
        }, { invokeContext });
      }
    }

    // Hard delete migrated records (移行されたレコードをハード削除)
    for (const id of migratedIds) {
      const item = await this.dataService.getItemById(id);
      if (item) {
        await this.commandService.publishPartialUpdateSync({
          pk: item.pk,
          sk: item.sk,
          version: item.version,
          isDeleted: true,
        }, { invokeContext });
      }
    }
  }

  private extractTenant(pk: string): string {
    return pk.split('#')[1] ?? 'unknown';
  }
}
```

## 移行中のデータ検証

### 移行前検証

移行を開始する前にデータを検証します。

```typescript
// migration/validation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { DataService, KEY_SEPARATOR } from '@mbc-cqrs-serverless/core';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export interface ValidationResult {
  valid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: ValidationError[];
}

export interface ValidationError {
  id: string;
  errors: string[];
}

@Injectable()
export class MigrationValidationService {
  private readonly logger = new Logger(MigrationValidationService.name);

  constructor(private readonly dataService: DataService) {}

  /**
   * Validate all records before migration (移行前にすべてのレコードを検証)
   */
  async validateBeforeMigration<T extends object>(
    entityType: string,
    tenantCode: string,
    dtoClass: new () => T,
  ): Promise<ValidationResult> {
    const pk = `${entityType}${KEY_SEPARATOR}${tenantCode}`;
    const data = await this.dataService.listItemsByPk(pk);

    const invalidRecords: ValidationError[] = [];
    let validCount = 0;

    for (const item of data.items) {
      const dto = plainToInstance(dtoClass, item.attributes);
      const errors = await validate(dto);

      if (errors.length > 0) {
        invalidRecords.push({
          id: item.id,
          errors: errors.map(e => Object.values(e.constraints ?? {}).join(', ')),
        });
      } else {
        validCount++;
      }
    }

    const result: ValidationResult = {
      valid: invalidRecords.length === 0,
      totalRecords: data.items.length,
      validRecords: validCount,
      invalidRecords,
    };

    this.logger.log(`Validation result: ${validCount}/${data.items.length} valid`);
    return result;
  }

  /**
   * Validate referential integrity (参照整合性を検証)
   */
  async validateReferences(
    entityType: string,
    tenantCode: string,
    referenceField: string,
    referenceEntityType: string,
  ): Promise<ValidationError[]> {
    const pk = `${entityType}${KEY_SEPARATOR}${tenantCode}`;
    const data = await this.dataService.listItemsByPk(pk);

    const refPk = `${referenceEntityType}${KEY_SEPARATOR}${tenantCode}`;
    const refData = await this.dataService.listItemsByPk(refPk);
    const validRefs = new Set(refData.items.map(r => r.id));

    const errors: ValidationError[] = [];

    for (const item of data.items) {
      const refValue = item.attributes?.[referenceField];
      if (refValue && !validRefs.has(refValue)) {
        errors.push({
          id: item.id,
          errors: [`Invalid reference: ${referenceField}=${refValue} not found`],
        });
      }
    }

    return errors;
  }
}
```

### 移行後検証

移行後にデータ整合性を検証します。

```typescript
// migration/verification.service.ts
@Injectable()
export class MigrationVerificationService {
  /**
   * Verify migration completed successfully (移行が正常に完了したことを検証)
   */
  async verifyMigration(
    sourcePk: string,
    targetPk: string,
  ): Promise<{
    success: boolean;
    sourceCount: number;
    targetCount: number;
    missingItems: string[];
    extraItems: string[];
  }> {
    const sourceData = await this.dataService.listItemsByPk(sourcePk);
    const targetData = await this.dataService.listItemsByPk(targetPk);

    const sourceIds = new Set(sourceData.items.map(i => i.sk));
    const targetIds = new Set(targetData.items.map(i => i.sk));

    const missingItems: string[] = [];
    const extraItems: string[] = [];

    // Find items in source but not in target (ソースにあるがターゲットにないアイテムを検索)
    for (const sk of sourceIds) {
      if (!targetIds.has(sk)) {
        missingItems.push(sk);
      }
    }

    // Find items in target but not in source (ターゲットにあるがソースにないアイテムを検索)
    for (const sk of targetIds) {
      if (!sourceIds.has(sk)) {
        extraItems.push(sk);
      }
    }

    return {
      success: missingItems.length === 0,
      sourceCount: sourceData.items.length,
      targetCount: targetData.items.length,
      missingItems,
      extraItems,
    };
  }

  /**
   * Compare data content between source and target (ソースとターゲット間のデータコンテンツを比較)
   */
  async compareContent(
    sourcePk: string,
    targetPk: string,
    compareFields: string[],
  ): Promise<{ differences: Array<{ sk: string; field: string; source: any; target: any }> }> {
    const sourceData = await this.dataService.listItemsByPk(sourcePk);
    const targetData = await this.dataService.listItemsByPk(targetPk);

    const targetMap = new Map(targetData.items.map(i => [i.sk, i]));
    const differences: Array<{ sk: string; field: string; source: any; target: any }> = [];

    for (const sourceItem of sourceData.items) {
      const targetItem = targetMap.get(sourceItem.sk);
      if (!targetItem) continue;

      for (const field of compareFields) {
        const sourceValue = sourceItem.attributes?.[field];
        const targetValue = targetItem.attributes?.[field];

        if (JSON.stringify(sourceValue) !== JSON.stringify(targetValue)) {
          differences.push({
            sk: sourceItem.sk,
            field,
            source: sourceValue,
            target: targetValue,
          });
        }
      }
    }

    return { differences };
  }
}
```

## ベストプラクティス

### 1. 可能な場合は常にトランザクションを使用

DynamoDBトランザクションはアトミック操作を保証します：

```typescript
// Use batch writes for related items (関連アイテムにバッチ書き込みを使用)
await this.dataService.transactWrite([
  { put: sourceUpdateItem },
  { put: targetCreateItem },
]);
```

### 2. 移行メタデータの追跡

監査のために移行情報を保存します：

```typescript
attributes: {
  ...originalAttributes,
  _migrationId: migrationJobId,
  _migratedAt: new Date().toISOString(),
  _migratedBy: userContext.userId,
  _sourceVersion: sourceItem.version,
}
```

### 3. 冪等な移行の実装

移行を再実行しても安全にします：

```typescript
// Check if already migrated before processing (処理前にすでに移行済みか確認)
if (item.attributes?._migrationId === currentMigrationId) {
  this.logger.log(`Skipping already migrated item: ${item.id}`);
  continue;
}
```

### 4. 大規模データセットにはバッチ処理を使用

タイムアウトとメモリの問題を避けるためにバッチで処理します：

```typescript
const BATCH_SIZE = 25; // DynamoDB limit (DynamoDBの制限)

for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(item => this.migrateItem(item)));
  this.logger.log(`Processed ${Math.min(i + BATCH_SIZE, items.length)}/${items.length}`);
}
```

### 5. 移行チェックポイントの作成

再開可能な移行のために進捗を保存します：

```typescript
interface MigrationCheckpoint {
  migrationId: string;
  lastProcessedSk: string;
  processedCount: number;
  status: 'in_progress' | 'completed' | 'failed';
  updatedAt: string;
}

// Resume from checkpoint if migration was interrupted (移行が中断された場合はチェックポイントから再開)
const checkpoint = await this.getCheckpoint(migrationId);
const startFrom = checkpoint?.lastProcessedSk ?? '';
```

## 関連ドキュメント

- [インポート/エクスポートパターン](./import-export-patterns) - 一括データ操作
- [マルチテナントパターン](./multi-tenant-patterns) - テナント分離戦略
- [データ同期ハンドラー例](./data-sync-handler-examples) - 同期ハンドラーパターン
- [バージョンコンフリクトガイド](./version-conflict-guide) - バージョンコンフリクトの処理
