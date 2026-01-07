---
sidebar_position: 17
description: {{Learn how to implement multi-tenant data isolation and cross-tenant operations in MBC CQRS Serverless.}}
---

# {{Multi-Tenant Patterns}}

{{This guide covers patterns for implementing multi-tenant applications with proper data isolation, shared resources, and cross-tenant operations.}}

## {{When to Use This Guide}}

{{Use this guide when you need to:}}

- {{Isolate data between tenants (customers/organizations)}}
- {{Share common data across all tenants}}
- {{Allow users to belong to multiple tenants}}
- {{Implement tenant-specific configuration}}
- {{Sync data between tenants}}

## {{Multi-Tenant Architecture}}

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

## {{Tenant Context}}

### {{Extracting Tenant Context}}

{{Create a helper to extract tenant information from invoke context:}}

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
 * {{Get custom user context from invoke context}}
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
 * {{Default tenant code for shared data}}
 */
export const DEFAULT_TENANT_CODE = 'common';

/**
 * {{Check if user has access to tenant}}
 */
export function hasTenanctAccess(
  userContext: CustomUserContext,
  targetTenantCode: string,
): boolean {
  // {{System admin can access all tenants}}
  if (userContext.role === 'SYSTEM_ADMIN') {
    return true;
  }

  // {{User can only access their own tenant}}
  return userContext.tenantCode === targetTenantCode;
}
```

### {{Tenant Guard}}

{{Implement a guard to enforce tenant access:}}

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

## {{Data Isolation Patterns}}

### {{Pattern 1: Tenant in Partition Key}}

{{Include tenant code in the partition key for complete isolation:}}

```typescript
// {{Standard tenant isolation pattern}}

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

### {{Pattern 2: Common Tenant for Shared Data}}

{{Use a common tenant code for data shared across all tenants:}}

```typescript
// {{Shared data pattern for master data and configurations}}

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

### {{Pattern 3: User-Tenant Association}}

{{Handle users belonging to multiple tenants:}}

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
   * {{Get all tenants a user belongs to}}
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
   * {{Add user to tenant}}
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
   * {{Switch user's active tenant}}
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

## {{Cross-Tenant Operations}}

### {{Pattern 1: Data Sync Between Tenants}}

{{Sync data from one tenant to another (e.g., master data distribution):}}

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
   * {{Sync master data from source to target tenants}}
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

### {{Pattern 2: Cross-Tenant Reporting}}

{{Aggregate data across tenants for reporting:}}

```typescript
// reporting/cross-tenant-report.service.ts
@Injectable()
export class CrossTenantReportService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * {{Get aggregated metrics across all tenants}}
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
   * {{Get tenant-specific metrics}}
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

## {{Tenant Configuration}}

### {{Tenant Settings Pattern}}

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
   * {{Get tenant settings with caching}}
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
   * {{Update tenant settings}}
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

## {{Prisma Multi-Tenant Schema}}

### {{RDS Schema for Multi-Tenant}}

```prisma
// prisma/schema.prisma

// {{Base fields for all entities}}
model Product {
  id         String   @id
  pk         String
  sk         String
  tenantCode String   // {{Tenant isolation field}}

  code       String
  name       String
  attributes Json?

  version    Int
  isDeleted  Boolean  @default(false)
  createdAt  DateTime
  createdBy  String   @default("")
  updatedAt  DateTime
  updatedBy  String   @default("")

  // {{Unique constraint includes tenant}}
  @@unique([tenantCode, code])
  @@unique([pk, sk])

  // {{Index for tenant queries}}
  @@index([tenantCode])
  @@index([tenantCode, name])
  @@index([tenantCode, createdAt])
}

// {{User-Tenant association}}
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

// {{Tenant settings}}
model TenantSettings {
  id         String   @id
  tenantCode String   @unique
  settings   Json

  createdAt  DateTime
  updatedAt  DateTime
}
```

## {{Best Practices}}

### {{1. Always Include Tenant in Queries}}

```typescript
// {{Good: Tenant-scoped query}}
const products = await prismaService.product.findMany({
  where: {
    tenantCode,
    isDeleted: false,
  },
});

// {{Bad: Missing tenant scope (data leak risk)}}
const products = await prismaService.product.findMany({
  where: { isDeleted: false },
});
```

### {{2. Validate Tenant Access}}

```typescript
// {{Always verify tenant access before operations}}
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

### {{3. Tenant-Aware Logging}}

```typescript
// {{Include tenant in all logs for debugging}}
this.logger.log({
  message: 'Processing order',
  tenantCode,
  orderId,
  userId: userContext.userId,
});
```

### {{4. Separate System and Tenant Operations}}

```typescript
// {{Use separate endpoints for system-wide vs tenant operations}}

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

## {{TenantModule API Reference}}

{{The `@mbc-cqrs-serverless/tenant` module provides ready-to-use tenant management functionality.}}

### {{Installation}}

```bash
npm install @mbc-cqrs-serverless/tenant
```

### {{Module Registration}}

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

### {{Module Options}}

| {{Option}} | {{Type}} | {{Description}} |
|--------|------|-------------|
| `enableController` | `boolean` | {{Enable REST endpoints for tenant CRUD operations}} |
| `dataSyncHandlers` | `Type<IDataSyncHandler>[]` | {{Optional handlers to sync tenant data to external systems (e.g., RDS)}} |

### {{TenantService Methods}}

#### {{`getTenant(key: DetailKey): Promise<DataModel>`}}

{{Retrieves tenant details based on the given key.}}

```typescript
const tenant = await tenantService.getTenant({
  pk: 'TENANT#mbc',
  sk: 'MASTER',
});
```

#### {{`createCommonTenant(dto, context): Promise<CommandModel>`}}

{{Creates a common tenant that is shared across the entire system.}}

```typescript
const tenant = await tenantService.createCommonTenant({
  name: 'Common',
  description: 'Shared tenant for common data',
}, { invokeContext });
```

#### {{`createTenant(dto, context): Promise<CommandModel>`}}

{{Creates a tenant for an individual entity.}}

```typescript
const tenant = await tenantService.createTenant({
  name: 'MBC tenant',
  code: 'mbc',
  description: 'Main business tenant',
}, { invokeContext });
```

#### {{`updateTenant(key, dto, context): Promise<CommandModel>`}}

{{Updates an existing tenant's details.}}

```typescript
const tenant = await tenantService.updateTenant(
  { pk: 'TENANT#mbc', sk: 'MASTER' },
  { name: 'Updated MBC tenant', description: 'Updated description' },
  { invokeContext },
);
```

#### {{`deleteTenant(key, context): Promise<CommandModel>`}}

{{Deletes a tenant based on the provided key.}}

```typescript
await tenantService.deleteTenant(
  { pk: 'TENANT#mbc', sk: 'MASTER' },
  { invokeContext },
);
```

#### {{`addTenantGroup(dto, context): Promise<CommandModel>`}}

{{Adds a group to a specific tenant.}}

```typescript
await tenantService.addTenantGroup({
  tenantCode: 'abc',
  groupId: '19',
  role: 'company',
}, { invokeContext });
```

#### {{`createTenantGroup(tenantGroupCode, dto, context): Promise<CommandModel>`}}

{{Creates a tenant within a specific tenant group.}}

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

#### {{`customizeSettingGroups(dto, context): Promise<CommandModel>`}}

{{Customizes the settings of groups associated with a tenant.}}

```typescript
await tenantService.customizeSettingGroups({
  tenantCode: 'mbc',
  settingGroups: ['19', '20'],
  role: 'company',
}, { invokeContext });
```

## {{Related Documentation}}

- {{[Backend Development Guide](./backend-development) - Core patterns}}
- {{[Key Patterns](./key-patterns) - PK/SK design for multi-tenant}}
- {{[Authentication](./authentication) - User authentication}}
