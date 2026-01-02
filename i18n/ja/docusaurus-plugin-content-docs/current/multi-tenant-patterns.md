---
sidebar_position: 17
description: MBC CQRS Serverlessでのマルチテナントデータ分離とクロステナント操作の実装方法を学びます。
---

# マルチテナントパターン

このガイドでは、適切なデータ分離、共有リソース、クロステナント操作を備えたマルチテナントアプリケーションの実装パターンを説明します。

## このガイドの使用タイミング

以下が必要な場合にこのガイドを使用してください：

- テナント（顧客/組織）間のデータ分離
- 全テナント間での共通データ共有
- ユーザーが複数テナントに所属できるようにする
- テナント固有の設定の実装
- テナント間のデータ同期

## マルチテナントアーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                     アプリケーション                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│   │ テナント A   │   │ テナント B   │   │   共通      │           │
│   │  PK: X#A    │   │  PK: X#B    │   │ PK: X#common│           │
│   └─────────────┘   └─────────────┘   └─────────────┘           │
│          │                 │                  │                  │
│          ▼                 ▼                  ▼                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    DynamoDBテーブル                       │   │
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
 * 呼び出しコンテキストからカスタムユーザーコンテキストを取得
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
 * 共有データ用のデフォルトテナントコード
 */
export const DEFAULT_TENANT_CODE = 'common';

/**
 * ユーザーがテナントへのアクセス権を持っているか確認
 */
export function hasTenanctAccess(
  userContext: CustomUserContext,
  targetTenantCode: string,
): boolean {
  // システム管理者は全テナントにアクセス可能
  if (userContext.role === 'SYSTEM_ADMIN') {
    return true;
  }

  // ユーザーは自分のテナントのみアクセス可能
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

    // パスまたはボディからターゲットテナントを取得
    const targetTenant = request.params.tenantCode ||
                        request.body?.tenantCode ||
                        this.extractTenantFromPk(request.body?.pk);

    if (!targetTenant) {
      return true; // テナント未指定、ユーザーのテナントを使用
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

### パターン1：パーティションキーにテナントを含める

完全な分離のためにパーティションキーにテナントコードを含めます：

```typescript
// 標準的なテナント分離パターン

const PRODUCT_PK_PREFIX = 'PRODUCT';

function generateProductPk(tenantCode: string): string {
  return `${PRODUCT_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`;
}

// キーの例：
// PK: PRODUCT#tenant-a
// SK: 01HX7MBJK3V9WQBZ7XNDK5ZT2M

// テナントの全商品をクエリ
async function listProductsByTenant(tenantCode: string) {
  const pk = generateProductPk(tenantCode);
  return dataService.listItemsByPk(pk);
}
```

### パターン2：共有データ用の共通テナント

全テナント間で共有されるデータには共通テナントコードを使用します：

```typescript
// 共有データパターン（マスターデータ、設定）

const COMMON_TENANT = 'common';

// システム全体の設定
const settingsPk = `SETTINGS${KEY_SEPARATOR}${COMMON_TENANT}`;

// ユーザーデータ（ユーザーは複数テナントに所属可能）
const userPk = `USER${KEY_SEPARATOR}${COMMON_TENANT}`;

// 例：システム全体のメールテンプレートを取得
async function getEmailTemplates() {
  return dataService.listItemsByPk(`TEMPLATE${KEY_SEPARATOR}${COMMON_TENANT}`);
}
```

### パターン3：ユーザー・テナント関連付け

複数テナントに所属するユーザーを処理します：

```typescript
// user/dto/user-tenant.dto.ts
export interface UserTenantAssociation {
  pk: string;           // USER_TENANT#common
  sk: string;           // {tenantCode}#{userCode}
  tenantCode: string;
  userCode: string;
  role: string;         // このテナント内での役割
  isDefault: boolean;   // ユーザーのデフォルトテナント
}

// user/user.service.ts
@Injectable()
export class UserService {
  /**
   * ユーザーが所属する全テナントを取得
   */
  async getUserTenants(userCode: string): Promise<UserTenantAssociation[]> {
    const pk = `USER_TENANT${KEY_SEPARATOR}${COMMON_TENANT}`;

    // SKプレフィックスでクエリして全テナント関連付けを取得
    const result = await this.dataService.listItemsByPk(pk, {
      skPrefix: '', // 全件取得後フィルタ
    });

    return result.items.filter(item =>
      item.sk.endsWith(`${KEY_SEPARATOR}${userCode}`),
    );
  }

  /**
   * ユーザーをテナントに追加
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
   * ユーザーのアクティブテナントを切り替え
   */
  async switchTenant(
    userCode: string,
    newTenantCode: string,
    invokeContext: IInvoke,
  ): Promise<{ token: string }> {
    // ユーザーがテナントに所属しているか検証
    const associations = await this.getUserTenants(userCode);
    const association = associations.find(a =>
      a.attributes.tenantCode === newTenantCode,
    );

    if (!association) {
      throw new ForbiddenException(
        `User does not belong to tenant: ${newTenantCode}`,
      );
    }

    // 更新されたテナントコンテキストで新しいトークンを生成
    return this.authService.generateToken({
      userCode,
      tenantCode: newTenantCode,
      role: association.attributes.role,
    });
  }
}
```

## クロステナント操作

### パターン1：テナント間データ同期

あるテナントから別のテナントにデータを同期します（例：マスターデータ配布）：

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
   * マスターデータをソーステナントからターゲットテナントに同期
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
    // ターゲットテナント用の新しいキーを作成
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
      // ソースからの同期としてマーク
      metadata: {
        syncedFrom: sourceItem.id,
        syncedAt: new Date().toISOString(),
      },
    }, { invokeContext });
  }
}
```

### パターン2：クロステナントレポート

レポート用にテナント間でデータを集計します：

```typescript
// reporting/cross-tenant-report.service.ts
@Injectable()
export class CrossTenantReportService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 全テナントの集計メトリクスを取得
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const [totalProducts, productsByTenant, recentOrders] = await Promise.all([
      // 全テナントの合計数
      this.prismaService.product.count({
        where: { isDeleted: false },
      }),

      // テナント別の数
      this.prismaService.product.groupBy({
        by: ['tenantCode'],
        _count: { id: true },
        where: { isDeleted: false },
      }),

      // 全テナントの最近の注文（管理者のみ）
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
   * テナント固有のメトリクスを取得
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
   * キャッシュ付きでテナント設定を取得
   */
  async getSettings(tenantCode: string): Promise<TenantSettings> {
    // まずキャッシュを確認
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
      // 見つからない場合はデフォルト設定を返す
      return this.getDefaultSettings();
    }
  }

  /**
   * テナント設定を更新
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

    // キャッシュを無効化
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

// 全エンティティの基本フィールド
model Product {
  id         String   @id
  pk         String
  sk         String
  tenantCode String   // テナント分離フィールド

  code       String
  name       String
  attributes Json?

  version    Int
  isDeleted  Boolean  @default(false)
  createdAt  DateTime
  createdBy  String   @default("")
  updatedAt  DateTime
  updatedBy  String   @default("")

  // 一意制約にテナントを含める
  @@unique([tenantCode, code])
  @@unique([pk, sk])

  // テナントクエリ用インデックス
  @@index([tenantCode])
  @@index([tenantCode, name])
  @@index([tenantCode, createdAt])
}

// ユーザー・テナント関連
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

// テナント設定
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
// 良い例：テナントスコープのクエリ
const products = await prismaService.product.findMany({
  where: {
    tenantCode,
    isDeleted: false,
  },
});

// 悪い例：テナントスコープがない（データ漏洩リスク）
const products = await prismaService.product.findMany({
  where: { isDeleted: false },
});
```

### 2. テナントアクセスを検証

```typescript
// 操作前に必ずテナントアクセスを検証
async updateProduct(
  productId: string,
  updateDto: UpdateProductDto,
  invokeContext: IInvoke,
): Promise<ProductDataEntity> {
  const { tenantCode } = getCustomUserContext(invokeContext);

  // 商品がユーザーのテナントに属しているか検証
  const existing = await this.prismaService.product.findUnique({
    where: { id: productId },
  });

  if (existing?.tenantCode !== tenantCode) {
    throw new ForbiddenException('Access denied');
  }

  // 更新を続行
  return this.publishCommand(updateDto, invokeContext);
}
```

### 3. テナント対応ロギング

```typescript
// デバッグ用にすべてのログにテナントを含める
this.logger.log({
  message: 'Processing order',
  tenantCode,
  orderId,
  userId: userContext.userId,
});
```

### 4. システムとテナント操作を分離

```typescript
// システム全体とテナント操作で別のエンドポイントを使用

@Controller('api/admin/tenants')
@UseGuards(SystemAdminGuard)
export class TenantAdminController {
  // テナント間のシステム管理者操作
}

@Controller('api/products')
@UseGuards(TenantGuard)
export class ProductController {
  // テナントスコープの操作
}
```

## 関連ドキュメント

- [バックエンド開発ガイド](./backend-development.md) - コアパターン
- [キーパターン](./key-patterns.md) - マルチテナント用PK/SK設計
- [認証](./authentication.md) - ユーザー認証
- [テナントモジュール](./tenant.md) - テナント管理
