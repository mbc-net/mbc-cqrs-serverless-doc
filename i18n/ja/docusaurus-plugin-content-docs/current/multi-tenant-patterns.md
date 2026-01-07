---
sidebar_position: 17
description: MBC CQRS Serverlessでマルチテナントのデータ分離とテナント間操作を実装する方法を学びます。
---

# マルチテナントパターン

このガイドでは、適切なデータ分離、共有リソース、テナント間操作を備えたマルチテナントアプリケーションの実装パターンについて説明します。

## このガイドを使用するタイミング

以下の場合にこのガイドを使用してください：

- テナント（顧客/組織）間でデータを分離する
- すべてのテナントで共通データを共有する
- ユーザーが複数のテナントに所属できるようにする
- テナント固有の設定を実装する
- テナント間でデータを同期する

## マルチテナントアーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│   │  Tenant A   │   │  Tenant B   │   │   Common    │           │
│   │  PK: X#A    │   │  PK: X#B    │   │  PK: X#common│          │
│   └─────────────┘   └─────────────┘   └─────────────┘           │
│          │                 │                  │                  │
│          ▼                 ▼                  ▼                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    DynamoDB Table                        │   │
│   │  PK: ENTITY#tenantCode  |  SK: identifier                │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## テナントコンテキスト

### テナントコンテキストの抽出

呼び出しコンテキストからテナント情報を抽出するヘルパーを作成します：

```typescript
// helpers/context.ts
import { IInvoke, getUserContext } from '@mbc-cqrs-serverless/core';

export interface CustomUserContext {
  tenantCode: string;
  userCode: string;
  userId: string;
  email?: string;
  role?: string;
}

/**
 * Get custom user context from invoke context (呼び出しコンテキストからカスタムユーザーコンテキストを取得)
 */
export function getCustomUserContext(invokeContext: IInvoke): CustomUserContext {
  const userContext = getUserContext(invokeContext);

  return {
    tenantCode: userContext.tenantCode || DEFAULT_TENANT_CODE,
    userCode: userContext.userCode || '',
    userId: userContext.userId || '',
    email: userContext.email,
    role: userContext['custom:role'],
  };
}

/**
 * Default tenant code for shared data (共有データ用のデフォルトテナントコード)
 */
export const DEFAULT_TENANT_CODE = 'common';

/**
 * Check if user has access to tenant (ユーザーがテナントへのアクセス権を持っているか確認)
 */
export function hasTenanctAccess(
  userContext: CustomUserContext,
  targetTenantCode: string,
): boolean {
  // System admin can access all tenants (システム管理者は全テナントにアクセス可能)
  if (userContext.role === 'SYSTEM_ADMIN') {
    return true;
  }

  // User can only access their own tenant (ユーザーは自分のテナントのみアクセス可能)
  return userContext.tenantCode === targetTenantCode;
}
```

### テナントガード

テナントアクセスを強制するガードを実装します：

```typescript
// guards/tenant.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { getCustomUserContext, hasTenanctAccess } from '../helpers/context';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const invokeContext = request.invokeContext;
    const userContext = getCustomUserContext(invokeContext);

    // Get target tenant from path or body
    const targetTenant = request.params.tenantCode ||
                        request.body?.tenantCode ||
                        this.extractTenantFromPk(request.body?.pk);

    if (!targetTenant) {
      return true; // No tenant specified, will use user's tenant
    }

    if (!hasTenanctAccess(userContext, targetTenant)) {
      throw new ForbiddenException(
        `Access denied to tenant: ${targetTenant}`,
      );
    }

    return true;
  }

  private extractTenantFromPk(pk: string | undefined): string | undefined {
    if (!pk) return undefined;
    const parts = pk.split('#');
    return parts.length >= 2 ? parts[1] : undefined;
  }
}
```

## データ分離パターン

### パターン1: パーティションキーにテナントを含める

完全な分離のためにパーティションキーにテナントコードを含めます：

```typescript
// Standard tenant isolation pattern (標準的なテナント分離パターン)

const PRODUCT_PK_PREFIX = 'PRODUCT';

function generateProductPk(tenantCode: string): string {
  return `${PRODUCT_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`;
}

// Example keys:
// PK: PRODUCT#tenant-a
// SK: 01HX7MBJK3V9WQBZ7XNDK5ZT2M

// Query all products for a tenant
async function listProductsByTenant(tenantCode: string) {
  const pk = generateProductPk(tenantCode);
  return dataService.listItemsByPk(pk);
}
```

### パターン2: 共有データ用の共通テナント

すべてのテナントで共有されるデータには共通のテナントコードを使用します：

```typescript
// Shared data pattern for master data and configurations (共有データパターン：マスターデータ、設定)

const COMMON_TENANT = 'common';

// System-wide settings
const settingsPk = `SETTINGS${KEY_SEPARATOR}${COMMON_TENANT}`;

// User data (users can belong to multiple tenants)
const userPk = `USER${KEY_SEPARATOR}${COMMON_TENANT}`;

// Example: Get system-wide email templates
async function getEmailTemplates() {
  return dataService.listItemsByPk(`TEMPLATE${KEY_SEPARATOR}${COMMON_TENANT}`);
}
```

### パターン3: ユーザー・テナント関連付け

複数のテナントに所属するユーザーを処理します：

```typescript
// user/dto/user-tenant.dto.ts
export interface UserTenantAssociation {
  pk: string;           // USER_TENANT#common
  sk: string;           // {tenantCode}#{userCode}
  tenantCode: string;
  userCode: string;
  role: string;         // Role within this tenant
  isDefault: boolean;   // Default tenant for user
}

// user/user.service.ts
@Injectable()
export class UserService {
  /**
   * Get all tenants a user belongs to (ユーザーが所属する全テナントを取得)
   */
  async getUserTenants(userCode: string): Promise<UserTenantAssociation[]> {
    const pk = `USER_TENANT${KEY_SEPARATOR}${COMMON_TENANT}`;

    // Query with SK prefix to find all tenant associations
    const result = await this.dataService.listItemsByPk(pk, {
      skPrefix: '', // Get all, then filter
    });

    return result.items.filter(item =>
      item.sk.endsWith(`${KEY_SEPARATOR}${userCode}`),
    );
  }

  /**
   * Add user to tenant (ユーザーをテナントに追加)
   */
  async addUserToTenant(
    userCode: string,
    tenantCode: string,
    role: string,
    invokeContext: IInvoke,
  ): Promise<void> {
    const pk = `USER_TENANT${KEY_SEPARATOR}${COMMON_TENANT}`;
    const sk = `${tenantCode}${KEY_SEPARATOR}${userCode}`;

    await this.commandService.publishSync({
      pk,
      sk,
      id: generateId(pk, sk),
      tenantCode: COMMON_TENANT,
      code: `${tenantCode}-${userCode}`,
      name: `User ${userCode} in ${tenantCode}`,
      type: 'USER_TENANT',
      attributes: {
        userCode,
        tenantCode,
        role,
        isDefault: false,
      },
    }, { invokeContext });
  }

  /**
   * Switch user's active tenant (ユーザーのアクティブテナントを切り替え)
   */
  async switchTenant(
    userCode: string,
    newTenantCode: string,
    invokeContext: IInvoke,
  ): Promise<{ token: string }> {
    // Verify user belongs to tenant
    const associations = await this.getUserTenants(userCode);
    const association = associations.find(a =>
      a.attributes.tenantCode === newTenantCode,
    );

    if (!association) {
      throw new ForbiddenException(
        `User does not belong to tenant: ${newTenantCode}`,
      );
    }

    // Generate new token with updated tenant context
    return this.authService.generateToken({
      userCode,
      tenantCode: newTenantCode,
      role: association.attributes.role,
    });
  }
}
```

## テナント間操作

### パターン1: テナント間のデータ同期

あるテナントから別のテナントへデータを同期します（例：マスターデータ配信）：

```typescript
// sync/tenant-sync.service.ts
@Injectable()
export class TenantSyncService {
  private readonly logger = new Logger(TenantSyncService.name);

  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
  ) {}

  /**
   * Sync master data from source to target tenants (マスターデータをソーステナントからターゲットテナントに同期)
   */
  async syncMasterData(
    sourceTenantCode: string,
    targetTenantCodes: string[],
    entityType: string,
    invokeContext: IInvoke,
  ): Promise<{ synced: number; errors: string[] }> {
    const sourcePk = `${entityType}${KEY_SEPARATOR}${sourceTenantCode}`;
    const sourceData = await this.dataService.listItemsByPk(sourcePk);

    let synced = 0;
    const errors: string[] = [];

    for (const targetTenant of targetTenantCodes) {
      for (const item of sourceData.items) {
        try {
          await this.syncItem(item, targetTenant, invokeContext);
          synced++;
        } catch (error) {
          errors.push(`Failed to sync ${item.id} to ${targetTenant}: ${error.message}`);
        }
      }
    }

    this.logger.log(`Synced ${synced} items to ${targetTenantCodes.length} tenants`);
    return { synced, errors };
  }

  private async syncItem(
    sourceItem: any,
    targetTenantCode: string,
    invokeContext: IInvoke,
  ): Promise<void> {
    // Create new keys for target tenant
    const pkParts = sourceItem.pk.split(KEY_SEPARATOR);
    const entityType = pkParts[0];
    const targetPk = `${entityType}${KEY_SEPARATOR}${targetTenantCode}`;
    const targetId = generateId(targetPk, sourceItem.sk);

    await this.commandService.publishSync({
      pk: targetPk,
      sk: sourceItem.sk,
      id: targetId,
      tenantCode: targetTenantCode,
      code: sourceItem.code,
      name: sourceItem.name,
      type: sourceItem.type,
      attributes: sourceItem.attributes,
      // Mark as synced from source
      metadata: {
        syncedFrom: sourceItem.id,
        syncedAt: new Date().toISOString(),
      },
    }, { invokeContext });
  }
}
```

### パターン2: テナント横断レポート

レポート用にテナント横断でデータを集計します：

```typescript
// reporting/cross-tenant-report.service.ts
@Injectable()
export class CrossTenantReportService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Get aggregated metrics across all tenants (全テナントの集計メトリクスを取得)
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const [totalProducts, productsByTenant, recentOrders] = await Promise.all([
      // Total count across all tenants
      this.prismaService.product.count({
        where: { isDeleted: false },
      }),

      // Count by tenant
      this.prismaService.product.groupBy({
        by: ['tenantCode'],
        _count: { id: true },
        where: { isDeleted: false },
      }),

      // Recent orders across all tenants (admin only)
      this.prismaService.order.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    return {
      totalProducts,
      productsByTenant: productsByTenant.map(t => ({
        tenantCode: t.tenantCode,
        count: t._count.id,
      })),
      recentOrdersCount: recentOrders.length,
    };
  }

  /**
   * Get tenant-specific metrics (テナント固有のメトリクスを取得)
   */
  async getTenantMetrics(tenantCode: string): Promise<TenantMetrics> {
    const [products, orders, users] = await Promise.all([
      this.prismaService.product.count({
        where: { tenantCode, isDeleted: false },
      }),
      this.prismaService.order.count({
        where: { tenantCode, isDeleted: false },
      }),
      this.prismaService.user.count({
        where: { tenantCode, isDeleted: false },
      }),
    ]);

    return { tenantCode, products, orders, users };
  }
}
```

## テナント設定

### テナント設定パターン

```typescript
// tenant/tenant-settings.service.ts
@Injectable()
export class TenantSettingsService {
  private readonly settingsCache = new Map<string, TenantSettings>();

  constructor(
    private readonly dataService: DataService,
    private readonly commandService: CommandService,
  ) {}

  /**
   * Get tenant settings with caching (キャッシュ付きでテナント設定を取得)
   */
  async getSettings(tenantCode: string): Promise<TenantSettings> {
    // Check cache first
    if (this.settingsCache.has(tenantCode)) {
      return this.settingsCache.get(tenantCode)!;
    }

    const pk = `SETTINGS${KEY_SEPARATOR}${tenantCode}`;
    const sk = 'config';

    try {
      const settings = await this.dataService.getItem({ pk, sk });
      this.settingsCache.set(tenantCode, settings.attributes);
      return settings.attributes;
    } catch (error) {
      // Return default settings if not found
      return this.getDefaultSettings();
    }
  }

  /**
   * Update tenant settings (テナント設定を更新)
   */
  async updateSettings(
    tenantCode: string,
    settings: Partial<TenantSettings>,
    invokeContext: IInvoke,
  ): Promise<TenantSettings> {
    const currentSettings = await this.getSettings(tenantCode);
    const mergedSettings = { ...currentSettings, ...settings };

    const pk = `SETTINGS${KEY_SEPARATOR}${tenantCode}`;
    const sk = 'config';

    await this.commandService.publishSync({
      pk,
      sk,
      id: generateId(pk, sk),
      tenantCode,
      code: 'config',
      name: 'Tenant Configuration',
      type: 'SETTINGS',
      attributes: mergedSettings,
    }, { invokeContext });

    // Invalidate cache
    this.settingsCache.delete(tenantCode);

    return mergedSettings;
  }

  private getDefaultSettings(): TenantSettings {
    return {
      timezone: 'Asia/Tokyo',
      locale: 'ja',
      dateFormat: 'YYYY-MM-DD',
      currency: 'JPY',
      features: {
        exportEnabled: true,
        importEnabled: true,
        apiEnabled: true,
      },
    };
  }
}

export interface TenantSettings {
  timezone: string;
  locale: string;
  dateFormat: string;
  currency: string;
  features: {
    exportEnabled: boolean;
    importEnabled: boolean;
    apiEnabled: boolean;
  };
}
```

## Prismaマルチテナントスキーマ

### マルチテナント用RDSスキーマ

```prisma
// prisma/schema.prisma

// Base fields for all entities (全エンティティの基本フィールド)
model Product {
  id         String   @id
  pk         String
  sk         String
  tenantCode String   // Tenant isolation field (テナント分離フィールド)

  code       String
  name       String
  attributes Json?

  version    Int
  isDeleted  Boolean  @default(false)
  createdAt  DateTime
  createdBy  String   @default("")
  updatedAt  DateTime
  updatedBy  String   @default("")

  // Unique constraint includes tenant (一意制約にテナントを含める)
  @@unique([tenantCode, code])
  @@unique([pk, sk])

  // Index for tenant queries (テナントクエリ用インデックス)
  @@index([tenantCode])
  @@index([tenantCode, name])
  @@index([tenantCode, createdAt])
}

// User-Tenant association (ユーザー・テナント関連)
model UserTenant {
  id         String   @id
  pk         String
  sk         String

  userCode   String
  tenantCode String
  role       String
  isDefault  Boolean  @default(false)

  createdAt  DateTime
  updatedAt  DateTime

  @@unique([userCode, tenantCode])
  @@index([userCode])
  @@index([tenantCode])
}

// Tenant settings (テナント設定)
model TenantSettings {
  id         String   @id
  tenantCode String   @unique
  settings   Json

  createdAt  DateTime
  updatedAt  DateTime
}
```

## ベストプラクティス

### 1. クエリには常にテナントを含める

```typescript
// Good: Tenant-scoped query (良い例：テナントスコープのクエリ)
const products = await prismaService.product.findMany({
  where: {
    tenantCode,
    isDeleted: false,
  },
});

// Bad: Missing tenant scope (data leak risk) (悪い例：テナントスコープがない、データ漏洩リスク)
const products = await prismaService.product.findMany({
  where: { isDeleted: false },
});
```

### 2. テナントアクセスをバリデーション

```typescript
// Always verify tenant access before operations (操作前に必ずテナントアクセスを検証)
async updateProduct(
  productId: string,
  updateDto: UpdateProductDto,
  invokeContext: IInvoke,
): Promise<ProductDataEntity> {
  const { tenantCode } = getCustomUserContext(invokeContext);

  // Verify product belongs to user's tenant
  const existing = await this.prismaService.product.findUnique({
    where: { id: productId },
  });

  if (existing?.tenantCode !== tenantCode) {
    throw new ForbiddenException('Access denied');
  }

  // Proceed with update
  return this.publishCommand(updateDto, invokeContext);
}
```

### 3. テナント認識ロギング

```typescript
// Include tenant in all logs for debugging (デバッグ用にすべてのログにテナントを含める)
this.logger.log({
  message: 'Processing order',
  tenantCode,
  orderId,
  userId: userContext.userId,
});
```

### 4. システム操作とテナント操作の分離

```typescript
// Use separate endpoints for system-wide vs tenant operations (システム全体とテナント操作で別のエンドポイントを使用)

@Controller('api/admin/tenants')
@UseGuards(SystemAdminGuard)
export class TenantAdminController {
  // System admin operations across tenants
}

@Controller('api/products')
@UseGuards(TenantGuard)
export class ProductController {
  // Tenant-scoped operations
}
```

## TenantModule APIリファレンス

`@mbc-cqrs-serverless/tenant`モジュールは、すぐに使えるテナント管理機能を提供します。

### インストール

```bash
npm install @mbc-cqrs-serverless/tenant
```

### モジュール登録

```typescript
import { TenantModule } from '@mbc-cqrs-serverless/tenant';

@Module({
  imports: [
    TenantModule.register({
      enableController: true,
      dataSyncHandlers: [TenantRdsSyncHandler], // Optional: sync to external systems
    }),
  ],
})
export class AppModule {}
```

### モジュールオプション

| オプション | 型 | 説明 |
|--------|------|-------------|
| `enableController` | `boolean` | テナントCRUD操作用のRESTエンドポイントを有効化 |
| `dataSyncHandlers` | `Type<IDataSyncHandler>[]` | テナントデータを外部システム（例：RDS）に同期するオプションハンドラー |

### TenantServiceメソッド

#### `getTenant(key: DetailKey): Promise<DataModel>`

指定されたキーに基づいてテナント詳細を取得します。

```typescript
const tenant = await tenantService.getTenant({
  pk: 'TENANT#mbc',
  sk: 'MASTER',
});
```

#### `createCommonTenant(dto, context): Promise<CommandModel>`

システム全体で共有される共通テナントを作成します。

```typescript
const tenant = await tenantService.createCommonTenant({
  name: 'Common',
  description: 'Shared tenant for common data',
}, { invokeContext });
```

#### `createTenant(dto, context): Promise<CommandModel>`

個別エンティティ用のテナントを作成します。

```typescript
const tenant = await tenantService.createTenant({
  name: 'MBC tenant',
  code: 'mbc',
  description: 'Main business tenant',
}, { invokeContext });
```

#### `updateTenant(key, dto, context): Promise<CommandModel>`

既存テナントの詳細を更新します。

```typescript
const tenant = await tenantService.updateTenant(
  { pk: 'TENANT#mbc', sk: 'MASTER' },
  { name: 'Updated MBC tenant', description: 'Updated description' },
  { invokeContext },
);
```

#### `deleteTenant(key, context): Promise<CommandModel>`

指定されたキーに基づいてテナントを削除します。

```typescript
await tenantService.deleteTenant(
  { pk: 'TENANT#mbc', sk: 'MASTER' },
  { invokeContext },
);
```

#### `addTenantGroup(dto, context): Promise<CommandModel>`

特定のテナントにグループを追加します。

```typescript
await tenantService.addTenantGroup({
  tenantCode: 'abc',
  groupId: '19',
  role: 'company',
}, { invokeContext });
```

#### `createTenantGroup(tenantGroupCode, dto, context): Promise<CommandModel>`

特定のテナントグループ内にテナントを作成します。

```typescript
await tenantService.createTenantGroup(
  'group-001',
  {
    code: 'mbc',
    name: 'MBC Tenant',
    description: 'Tenant in group-001',
  },
  { invokeContext },
);
```

#### `customizeSettingGroups(dto, context): Promise<CommandModel>`

テナントに関連付けられたグループの設定をカスタマイズします。

```typescript
await tenantService.customizeSettingGroups({
  tenantCode: 'mbc',
  settingGroups: ['19', '20'],
  role: 'company',
}, { invokeContext });
```

## 関連ドキュメント

- [バックエンド開発ガイド](./backend-development) - コアパターン
- [キーパターン](./key-patterns) - マルチテナント用PK/SK設計
- [認証](./authentication) - ユーザー認証
