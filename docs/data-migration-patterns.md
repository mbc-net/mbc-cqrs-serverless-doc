---
sidebar_position: 18
description: {{Learn data migration strategies for cross-tenant operations, schema evolution, and bulk data processing in MBC CQRS Serverless.}}
---

# {{Data Migration Patterns}}

{{This guide covers data migration strategies in MBC CQRS Serverless applications, including cross-tenant data migration, schema evolution, bulk data operations using the Import module, and rollback procedures.}}

## {{When to Use This Guide}}

{{Use this guide when you need to:}}

- {{Migrate data between tenants}}
- {{Evolve data schemas while maintaining compatibility}}
- {{Perform bulk data operations with the Import module}}
- {{Implement rollback procedures for failed migrations}}
- {{Validate data during migration processes}}

## {{Migration Architecture Overview}}

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        {{Data Migration Flow}}                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
│   │   {{Source}}  │────>│ {{Transform}} │────>│  {{Target}}   │               │
│   │   {{Data}}    │     │ & {{Validate}} │     │   {{Data}}    │               │
│   └─────────────┘     └─────────────┘     └─────────────┘               │
│          │                   │                    │                      │
│          │                   ▼                    │                      │
│          │          ┌─────────────┐              │                      │
│          │          │  {{Import}}   │              │                      │
│          │          │  {{Module}}   │              │                      │
│          └─────────>│  {{Strategy}} │<─────────────┘                      │
│                     └─────────────┘                                      │
│                            │                                             │
│                            ▼                                             │
│                     ┌─────────────┐     ┌─────────────┐                 │
│                     │ {{CommandSvc}}│────>│  {{DynamoDB}} │                 │
│                     │ {{(Version)}} │     │ {{(History)}} │                 │
│                     └─────────────┘     └─────────────┘                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## {{Tenant Code Normalization Migration}} {#tenant-code-normalization-migration}

:::danger {{Breaking Change}}
{{The `getUserContext()` function normalizes `tenantCode` to lowercase. This is a breaking change that affects data access if your existing data uses uppercase tenant codes in partition keys.}}

{{For a complete migration checklist and step-by-step instructions, see the [v1.1.0 Migration Guide](/docs/migration/v1.1.0).}}
:::

### {{Understanding the Impact}}

{{The framework normalizes tenant codes to lowercase for case-insensitive matching:}}

```typescript
// {{Before: Cognito stores uppercase}}
custom:tenant = "MY_TENANT"

// {{After: getUserContext() returns lowercase}}
const userContext = getUserContext(ctx);
console.log(userContext.tenantCode); // "my_tenant"

// {{Partition key generation uses lowercase}}
const pk = `PRODUCT#${userContext.tenantCode}`; // "PRODUCT#my_tenant"
```

{{**The problem:** If your existing DynamoDB data has partition keys with uppercase tenant codes (e.g., `PRODUCT#MY_TENANT`), queries using the normalized lowercase tenant code will not find that data.}}

### {{Migration Strategy 1: Update DynamoDB Data}} {#strategy-1-update-dynamodb}

{{Migrate existing DynamoDB data to use lowercase tenant codes in partition keys.}}

```typescript
// migration/tenant-normalization-migration.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  DynamoDbService,
  CommandService,
  KEY_SEPARATOR,
  generateId,
  getTenantCode,
  IInvoke,
} from '@mbc-cqrs-serverless/core';

@Injectable()
export class TenantNormalizationMigrationService {
  private readonly logger = new Logger(TenantNormalizationMigrationService.name);

  constructor(
    private readonly dynamoDbService: DynamoDbService,
    private readonly commandService: CommandService,
  ) {}

  /**
   * {{Migrate all entities of a type to lowercase tenant codes}}
   */
  async migrateEntityType(
    tableName: string,
    entityPrefix: string,
    invokeContext: IInvoke,
  ): Promise<{ migrated: number; errors: string[] }> {
    let migrated = 0;
    const errors: string[] = [];

    // {{Scan for items with uppercase tenant codes}}
    const items = await this.scanForUppercaseTenants(tableName, entityPrefix);

    for (const item of items) {
      try {
        const oldTenantCode = getTenantCode(item.pk);
        const newTenantCode = oldTenantCode?.toLowerCase();

        if (!newTenantCode || oldTenantCode === newTenantCode) {
          continue; // {{Already lowercase or no tenant code}}
        }

        // {{Create new record with lowercase tenant code}}
        const newPk = `${entityPrefix}${KEY_SEPARATOR}${newTenantCode}`;
        const newId = generateId(newPk, item.sk);

        await this.commandService.publishSync({
          pk: newPk,
          sk: item.sk,
          id: newId,
          tenantCode: newTenantCode,
          code: item.code,
          name: item.name,
          type: item.type,
          version: 0, // {{New entity}}
          attributes: {
            ...item.attributes,
            _migratedFrom: item.id,
            _migrationReason: 'tenant_code_normalization',
            _migratedAt: new Date().toISOString(),
          },
        }, { invokeContext });

        // {{Mark old record as migrated (soft delete)}}
        await this.commandService.publishPartialUpdateSync({
          pk: item.pk,
          sk: item.sk,
          version: item.version,
          isDeleted: true,
          attributes: {
            ...item.attributes,
            _migratedTo: newId,
          },
        }, { invokeContext });

        migrated++;
        this.logger.log(`Migrated ${item.id} to ${newId}`);
      } catch (error) {
        errors.push(`Failed to migrate ${item.id}: ${error.message}`);
        this.logger.error(`Migration error for ${item.id}`, error);
      }
    }

    return { migrated, errors };
  }

  private async scanForUppercaseTenants(
    tableName: string,
    entityPrefix: string,
  ): Promise<any[]> {
    // {{Implement scanning logic to find items with uppercase tenant codes}}
    // {{Filter for PKs that start with entityPrefix and contain uppercase letters}}
    return [];
  }
}
```

### {{Migration Strategy 2: Update Cognito User Attributes}} {#strategy-2-update-cognito}

{{Update Cognito user attributes to use lowercase tenant codes. This approach avoids data migration but requires Cognito admin access.}}

```typescript
// migration/cognito-tenant-migration.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';

@Injectable()
export class CognitoTenantMigrationService {
  private readonly logger = new Logger(CognitoTenantMigrationService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;

  constructor() {
    this.cognitoClient = new CognitoIdentityProviderClient({});
  }

  /**
   * {{Migrate all users' custom:tenant to lowercase}}
   */
  async migrateAllUsers(userPoolId: string): Promise<{
    migrated: number;
    errors: string[];
  }> {
    let migrated = 0;
    const errors: string[] = [];
    let paginationToken: string | undefined;

    do {
      const listResponse = await this.cognitoClient.send(
        new ListUsersCommand({
          UserPoolId: userPoolId,
          PaginationToken: paginationToken,
        }),
      );

      for (const user of listResponse.Users ?? []) {
        try {
          const tenantAttr = user.Attributes?.find(
            (a) => a.Name === 'custom:tenant',
          );
          const rolesAttr = user.Attributes?.find(
            (a) => a.Name === 'custom:roles',
          );

          if (!tenantAttr?.Value) continue;

          const oldTenant = tenantAttr.Value;
          const newTenant = oldTenant.toLowerCase();

          if (oldTenant === newTenant) continue; // {{Already lowercase}}

          // {{Update tenant attribute}}
          const attributes = [
            { Name: 'custom:tenant', Value: newTenant },
          ];

          // {{Update roles if they contain tenant references}}
          if (rolesAttr?.Value) {
            const roles = JSON.parse(rolesAttr.Value);
            const updatedRoles = roles.map((r: any) => ({
              ...r,
              tenant: (r.tenant || '').toLowerCase(),
            }));
            attributes.push({
              Name: 'custom:roles',
              Value: JSON.stringify(updatedRoles),
            });
          }

          await this.cognitoClient.send(
            new AdminUpdateUserAttributesCommand({
              UserPoolId: userPoolId,
              Username: user.Username,
              UserAttributes: attributes,
            }),
          );

          migrated++;
          this.logger.log(`Migrated user ${user.Username}`);
        } catch (error) {
          errors.push(`Failed to migrate ${user.Username}: ${error.message}`);
        }
      }

      paginationToken = listResponse.PaginationToken;
    } while (paginationToken);

    return { migrated, errors };
  }
}
```

### {{Migration Strategy 3: Dual-Read Approach}} {#strategy-3-dual-read}

{{For a gradual migration, implement a dual-read approach that tries both lowercase and uppercase tenant codes.}}

```typescript
// services/tenant-compatible-data.service.ts
import { Injectable } from '@nestjs/common';
import {
  DataService,
  KEY_SEPARATOR,
  getTenantCode,
} from '@mbc-cqrs-serverless/core';

@Injectable()
export class TenantCompatibleDataService {
  constructor(private readonly dataService: DataService) {}

  /**
   * {{Get item with fallback to uppercase tenant code}}
   */
  async getItemWithFallback(
    entityPrefix: string,
    tenantCode: string,
    sk: string,
  ): Promise<any | null> {
    // {{Try lowercase first (new format)}}
    const lowercasePk = `${entityPrefix}${KEY_SEPARATOR}${tenantCode.toLowerCase()}`;
    let item = await this.dataService.getItem({ pk: lowercasePk, sk });

    if (item) {
      return item;
    }

    // {{Fallback to uppercase (legacy format)}}
    const uppercasePk = `${entityPrefix}${KEY_SEPARATOR}${tenantCode.toUpperCase()}`;
    item = await this.dataService.getItem({ pk: uppercasePk, sk });

    if (item) {
      // {{Log for tracking migration progress}}
      console.warn(
        `Found legacy uppercase data: ${uppercasePk}#${sk}. Consider migrating.`,
      );
    }

    return item;
  }

  /**
   * {{List items with fallback to uppercase tenant code}}
   */
  async listItemsWithFallback(
    entityPrefix: string,
    tenantCode: string,
  ): Promise<any[]> {
    const lowercasePk = `${entityPrefix}${KEY_SEPARATOR}${tenantCode.toLowerCase()}`;
    const uppercasePk = `${entityPrefix}${KEY_SEPARATOR}${tenantCode.toUpperCase()}`;

    // {{Query both partitions}}
    const [lowercaseItems, uppercaseItems] = await Promise.all([
      this.dataService.listItemsByPk(lowercasePk),
      this.dataService.listItemsByPk(uppercasePk),
    ]);

    // {{Merge results, preferring lowercase (newer) data}}
    const itemMap = new Map<string, any>();

    for (const item of uppercaseItems.items) {
      itemMap.set(item.sk, item);
    }
    for (const item of lowercaseItems.items) {
      itemMap.set(item.sk, item); // {{Overwrites uppercase if exists}}
    }

    return Array.from(itemMap.values());
  }
}
```

### {{Migration Checklist}}

{{Follow this checklist when migrating to lowercase tenant codes:}}

- [ ] {{**Backup all data** before migration}}
- [ ] {{**Identify affected tables** - scan for uppercase tenant codes in PKs}}
- [ ] {{**Choose migration strategy:**}}
  - [ ] {{Strategy 1: Update DynamoDB data (recommended for clean migration)}}
  - [ ] {{Strategy 2: Update Cognito attributes (if data is already lowercase)}}
  - [ ] {{Strategy 3: Dual-read (for gradual migration with minimal downtime)}}
- [ ] {{**Test migration** in a non-production environment}}
- [ ] {{**Run migration** during low-traffic period}}
- [ ] {{**Verify data access** after migration}}
- [ ] {{**Update RDS data** if using RDS sync (tenantCode column)}}
- [ ] {{**Remove legacy data** after confirming successful migration}}

### {{RDS Migration}}

{{If you're using RDS sync, you also need to update the `tenantCode` column:}}

```sql
-- {{Update tenantCode to lowercase in RDS}}
UPDATE your_table
SET tenant_code = LOWER(tenant_code)
WHERE tenant_code != LOWER(tenant_code);
```

### {{Verification Script}}

{{After migration, verify that all data is accessible:}}

```typescript
// scripts/verify-tenant-migration.ts
async function verifyMigration(
  dataService: DataService,
  entityPrefix: string,
  tenantCode: string,
): Promise<{ success: boolean; issues: string[] }> {
  const issues: string[] = [];

  // {{Check lowercase data exists}}
  const pk = `${entityPrefix}#${tenantCode.toLowerCase()}`;
  const items = await dataService.listItemsByPk(pk);

  if (items.items.length === 0) {
    issues.push(`No items found for ${pk}`);
  }

  // {{Check no uppercase data remains}}
  const uppercasePk = `${entityPrefix}#${tenantCode.toUpperCase()}`;
  const legacyItems = await dataService.listItemsByPk(uppercasePk);

  if (legacyItems.items.length > 0) {
    issues.push(
      `Found ${legacyItems.items.length} legacy items in ${uppercasePk}`,
    );
  }

  return {
    success: issues.length === 0,
    issues,
  };
}
```

## {{Cross-Tenant Data Migration}}

### {{Pattern 1: Copy Data Between Tenants}}

{{Copy data from one tenant to another using the CommandService. This preserves the event sourcing history in the target tenant.}}

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
   * {{Copy all entities of a type from source to target tenant}}
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
        // {{Create new keys for target tenant}}
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
          // {{Track migration source}}
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

### {{Pattern 2: Bulk Migration with Import Module}}

{{Use the Import module for large-scale cross-tenant migrations with transformation support.}}

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
   * {{Transform source data to target tenant format}}
   */
  async transform(input: MigrationInput): Promise<MigrationDto> {
    const { targetTenantCode } = input;

    // {{Extract entity type from source PK}}
    const pkParts = input.sourcePk.split(KEY_SEPARATOR);
    const entityType = pkParts[0];

    // {{Build target keys}}
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
        // {{Add migration metadata}}
        _migrated: true,
        _sourceKey: `${input.sourcePk}#${input.sourceSk}`,
      },
    };
  }
}
```

## {{Schema Evolution Strategies}}

### {{Strategy 1: Backward Compatible Changes}}

{{Add new fields with default values. Existing data continues to work without migration.}}

```typescript
// {{Backward compatible attribute evolution}}
interface ProductAttributesV1 {
  name: string;
  price: number;
}

interface ProductAttributesV2 extends ProductAttributesV1 {
  category?: string;        // {{New optional field}}
  tags?: string[];          // {{New optional field}}
  description?: string;     // {{New optional field}}
}

// product/product.service.ts
@Injectable()
export class ProductService {
  /**
   * {{Get product with schema version handling}}
   */
  async getProduct(key: DetailKey): Promise<ProductDataEntity> {
    const product = await this.dataService.getItem(key);

    // {{Apply defaults for missing fields}}
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

### {{Strategy 2: Data Transformation Migration}}

{{Transform existing data to a new schema format using the Import module strategies.}}

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
  productName: string;      // {{Old field name}}
  unitPrice: number;        // {{Old field name}}
  categoryCode: string;     // {{Renamed field}}
}

interface NewProductAttributes {
  name: string;             // {{New field name}}
  price: number;            // {{New field name}}
  category: string;         // {{New field name}}
  version: 'v2';            // {{Schema version marker}}
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
   * {{Compare to detect schema version differences}}
   */
  async compare(
    dto: NewProductAttributes,
    tenantCode: string,
  ): Promise<ComparisonResult<DataModel>> {
    // {{Check if data needs transformation}}
    const existing = await this.dataService.getItem({
      pk: dto.pk,
      sk: dto.sk,
    });

    if (!existing) {
      return { status: ComparisonStatus.NOT_EXIST };
    }

    // {{Check schema version}}
    if (existing.attributes?.version !== 'v2') {
      return { status: ComparisonStatus.CHANGED, existingData: existing };
    }

    return { status: ComparisonStatus.EQUAL };
  }

  /**
   * {{Map old schema to new schema}}
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
          // {{Transform field names}}
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

### {{Strategy 3: Versioned Attributes Pattern}}

{{Store schema version in attributes for gradual migration.}}

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
    // {{Register migration functions}}
    this.migrations.set(1, this.migrateV1ToV2.bind(this));
    this.migrations.set(2, this.migrateV2ToV3.bind(this));
  }

  /**
   * {{Apply all necessary migrations to bring attributes to current version}}
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
      // {{V1 to V2: Split fullName into firstName and lastName}}
      firstName: attrs.fullName?.split(' ')[0] ?? '',
      lastName: attrs.fullName?.split(' ').slice(1).join(' ') ?? '',
    };
  }

  private migrateV2ToV3(attrs: any): any {
    return {
      ...attrs,
      // {{V2 to V3: Add new required fields with defaults}}
      createdAt: attrs.createdAt ?? new Date().toISOString(),
      status: attrs.status ?? 'active',
    };
  }
}
```

## {{Using Import Module for Bulk Operations}}

### {{CSV-Based Bulk Migration}}

{{Export data to CSV, transform, and re-import using the Import module.}}

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
   * {{Export entities to CSV for migration}}
   */
  async exportToMigrationCsv(
    entityType: string,
    tenantCode: string,
    targetTenantCode: string,
  ): Promise<{ bucket: string; key: string }> {
    const pk = `${entityType}${KEY_SEPARATOR}${tenantCode}`;
    const data = await this.dataService.listItemsByPk(pk);

    // {{Build CSV with migration columns}}
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

    // {{Upload to S3}}
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
   * {{Create migration import job}}
   */
  async startMigrationImport(
    bucket: string,
    key: string,
    tenantCode: string,
  ): Promise<{ jobId: string }> {
    // {{Import module handles the migration via configured strategy}}
    // {{The strategy will transform data to target tenant format}}
    return {
      jobId: `migration-${Date.now()}`,
      // {{Actual job creation would use ImportModule API}}
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

### {{Import Process Strategy for Migration}}

{{Implement a process strategy that handles migration-specific logic.}}

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
   * {{Compare migrated data with existing target data}}
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

      // {{Check if already migrated}}
      if (existing.attributes?._migrated) {
        return { status: ComparisonStatus.EQUAL };
      }

      // {{Data exists but not migrated - update it}}
      return { status: ComparisonStatus.CHANGED, existingData: existing };
    } catch (error) {
      return { status: ComparisonStatus.NOT_EXIST };
    }
  }

  /**
   * {{Map migration data to command payload}}
   */
  async map(
    status: ComparisonStatus,
    dto: MigrationDto,
    tenantCode: string,
    existingData?: DataModel,
  ): Promise<CommandInputModel | CommandPartialInputModel> {
    if (status === ComparisonStatus.NOT_EXIST) {
      // {{Create new record}}
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

    // {{Update existing record}}
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

## {{Rollback Procedures}}

### {{Event Sourcing Based Rollback}}

{{Leverage the history table to restore previous versions.}}

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
   * {{Rollback entity to a specific version}}
   */
  async rollbackToVersion(
    pk: string,
    sk: string,
    targetVersion: number,
    invokeContext: IInvoke,
  ): Promise<void> {
    // {{Get historical version}}
    const historicalData = await this.historyService.getVersion(
      pk,
      sk,
      targetVersion,
    );

    if (!historicalData) {
      throw new Error(`Version ${targetVersion} not found for ${pk}#${sk}`);
    }

    // {{Get current version for optimistic locking}}
    const currentData = await this.dataService.getItem({ pk, sk });

    // {{Restore to historical state}}
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
   * {{Rollback migration by timestamp}}
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
      // {{Check if item was part of the migration}}
      if (item.attributes?._migratedAt === migrationTimestamp) {
        try {
          // {{Find version before migration}}
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

### {{Soft Delete Pattern for Safe Rollback}}

{{Use soft delete to enable easy recovery.}}

```typescript
// migration/safe-migration.service.ts
@Injectable()
export class SafeMigrationService {
  /**
   * {{Migrate with soft delete for rollback capability}}
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
      // {{Create new record in target}}
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

      // {{Soft delete original (don't hard delete)}}
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
   * {{Rollback by restoring soft-deleted records}}
   */
  async rollbackSoftDeleteMigration(
    originalIds: string[],
    migratedIds: string[],
    invokeContext: IInvoke,
  ): Promise<void> {
    // {{Restore original records}}
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

    // {{Hard delete migrated records}}
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

## {{Data Validation During Migration}}

### {{Pre-Migration Validation}}

{{Validate data before starting migration.}}

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
   * {{Validate all records before migration}}
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
   * {{Validate referential integrity}}
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

### {{Post-Migration Verification}}

{{Verify data integrity after migration.}}

```typescript
// migration/verification.service.ts
@Injectable()
export class MigrationVerificationService {
  /**
   * {{Verify migration completed successfully}}
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

    // {{Find items in source but not in target}}
    for (const sk of sourceIds) {
      if (!targetIds.has(sk)) {
        missingItems.push(sk);
      }
    }

    // {{Find items in target but not in source}}
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
   * {{Compare data content between source and target}}
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

## {{Best Practices}}

### {{1. Always Use Transactions When Possible}}

{{DynamoDB transactions ensure atomic operations:}}

```typescript
// {{Use batch writes for related items}}
await this.dataService.transactWrite([
  { put: sourceUpdateItem },
  { put: targetCreateItem },
]);
```

### {{2. Track Migration Metadata}}

{{Store migration information for auditing:}}

```typescript
attributes: {
  ...originalAttributes,
  _migrationId: migrationJobId,
  _migratedAt: new Date().toISOString(),
  _migratedBy: userContext.userId,
  _sourceVersion: sourceItem.version,
}
```

### {{3. Implement Idempotent Migrations}}

{{Make migrations safe to re-run:}}

```typescript
// {{Check if already migrated before processing}}
if (item.attributes?._migrationId === currentMigrationId) {
  this.logger.log(`Skipping already migrated item: ${item.id}`);
  continue;
}
```

### {{4. Use Batch Processing for Large Datasets}}

{{Process in batches to avoid timeouts and memory issues:}}

```typescript
const BATCH_SIZE = 25; // {{DynamoDB limit}}

for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(item => this.migrateItem(item)));
  this.logger.log(`Processed ${Math.min(i + BATCH_SIZE, items.length)}/${items.length}`);
}
```

### {{5. Create Migration Checkpoints}}

{{Save progress for resumable migrations:}}

```typescript
interface MigrationCheckpoint {
  migrationId: string;
  lastProcessedSk: string;
  processedCount: number;
  status: 'in_progress' | 'completed' | 'failed';
  updatedAt: string;
}

// {{Resume from checkpoint if migration was interrupted}}
const checkpoint = await this.getCheckpoint(migrationId);
const startFrom = checkpoint?.lastProcessedSk ?? '';
```

## {{Related Documentation}}

- {{[Import/Export Patterns](./import-export-patterns) - Bulk data operations}}
- {{[Multi-Tenant Patterns](./multi-tenant-patterns) - Tenant isolation strategies}}
- {{[Data Sync Handler Examples](./data-sync-handler-examples) - Sync handler patterns}}
- {{[Version Conflict Guide](./version-conflict-guide) - Handling version conflicts}}
