---
description: サブスクリプション管理、使用量追跡、課金連携を備えたマルチテナントSaaSアプリケーション例。
---

# SaaSアプリケーション例

この例では、MBC CQRS Serverlessを使用したサブスクリプション管理、使用量追跡、課金連携を備えたマルチテナントSaaSアプリケーションを示します。

## 概要

SaaSの例では以下をカバーします：

- テナント階層によるマルチテナント分離
- サブスクリプションとプラン管理
- 使用量計測とクォータ強制
- 課金イベント生成

## データモデル

### キー構造

```
パーティションキー (pk)           ソートキー (sk)
──────────────────────────────────────────────────
TENANT#acme-corp                 SUBSCRIPTION#SUB-001
TENANT#acme-corp                 USAGE#2024-01
TENANT#acme-corp                 USER#usr-001
TENANT#acme-corp                 APIKEY#key-001
MASTER#COMMON                    PLAN#starter
MASTER#COMMON                    PLAN#professional
MASTER#COMMON                    PLAN#enterprise
```

### エンティティ定義

```typescript
// Plan Entity (Master Data) (プランエンティティ（マスターデータ）)
export interface PlanAttributes {
  displayName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: PlanFeature[];
  limits: PlanLimits;
  isActive: boolean;
}

export interface PlanLimits {
  maxUsers: number;
  maxApiCalls: number;
  maxStorageGb: number;
  maxProjects: number;
}

// Subscription Entity (サブスクリプションエンティティ)
export interface SubscriptionAttributes {
  planCode: string;
  billingCycle: 'monthly' | 'yearly';
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  paymentMethodId?: string;
}

export type SubscriptionStatus =
  | 'active'
  | 'trial'
  | 'past_due'
  | 'cancelled'
  | 'expired';

// Usage Entity (使用量エンティティ)
export interface UsageAttributes {
  period: string; // YYYY-MM
  apiCalls: number;
  storageUsedGb: number;
  activeUsers: number;
  projectCount: number;
  lastUpdatedAt: string;
}
```

## テナント管理

### テナントサービス拡張

```typescript
// tenant-setup.service.ts
import { Injectable } from '@nestjs/common';
import { TenantService, IInvoke } from '@mbc-cqrs-serverless/core';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class TenantSetupService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  // Create tenant with initial subscription (初期サブスクリプション付きでテナントを作成)
  async provisionTenant(dto: ProvisionTenantDto, context: IInvoke) {
    // Step 1: Create tenant (ステップ1: テナントを作成)
    const tenant = await this.tenantService.createTenant(
      {
        code: dto.companySlug,
        name: dto.companyName,
        attributes: {
          industry: dto.industry,
          country: dto.country,
          timezone: dto.timezone,
        },
      },
      context,
    );

    // Step 2: Create trial subscription (ステップ2: トライアルサブスクリプションを作成)
    await this.subscriptionService.createTrialSubscription(
      dto.companySlug,
      dto.planCode,
      context,
    );

    // Step 3: Initialize usage tracking (ステップ3: 使用量追跡を初期化)
    await this.initializeUsageTracking(dto.companySlug, context);

    return tenant;
  }

  private async initializeUsageTracking(
    tenantCode: string,
    context: IInvoke,
  ) {
    const currentPeriod = this.getCurrentPeriod();

    await this.commandService.publishAsync(
      {
        pk: generatePk(tenantCode),
        sk: `USAGE#${currentPeriod}`,
        code: currentPeriod,
        name: `Usage for ${currentPeriod}`,
        tenantCode,
        attributes: {
          period: currentPeriod,
          apiCalls: 0,
          storageUsedGb: 0,
          activeUsers: 0,
          projectCount: 0,
          lastUpdatedAt: new Date().toISOString(),
        },
      },
      { invokeContext: context },
    );
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
```

## サブスクリプション管理

### サブスクリプションサービス

```typescript
// subscription.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import {
  CommandService,
  DataService,
  MasterService,
  IInvoke,
  getUserContext,
  generatePk,
} from '@mbc-cqrs-serverless/core';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
    private readonly masterService: MasterService,
  ) {}

  // Create trial subscription (トライアルサブスクリプションを作成)
  async createTrialSubscription(
    tenantCode: string,
    planCode: string,
    context: IInvoke,
  ) {
    const plan = await this.masterService.getByCode('PLAN', planCode);
    if (!plan) {
      throw new BadRequestException(`Plan ${planCode} not found`);
    }

    const trialDays = 14;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + trialDays);

    const command = {
      pk: generatePk(tenantCode),
      sk: `SUBSCRIPTION#SUB-${Date.now()}`,
      code: `SUB-${Date.now()}`,
      name: `${plan.name} Subscription`,
      tenantCode,
      attributes: {
        planCode,
        billingCycle: 'monthly',
        status: 'trial' as SubscriptionStatus,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        autoRenew: true,
      },
    };

    return this.commandService.publishAsync(command, { invokeContext: context });
  }

  // Upgrade/Downgrade subscription (サブスクリプションのアップグレード/ダウングレード)
  async changePlan(
    subscriptionCode: string,
    newPlanCode: string,
    context: IInvoke,
  ) {
    const { tenantCode } = getUserContext(context);
    const pk = generatePk(tenantCode);
    const sk = `SUBSCRIPTION#${subscriptionCode}`;

    const current = await this.dataService.getItem({ pk, sk });
    if (!current) {
      throw new NotFoundException(`Subscription ${subscriptionCode} not found`);
    }

    // Validate plan exists (プランの存在を検証)
    const newPlan = await this.masterService.getByCode('PLAN', newPlanCode);
    if (!newPlan) {
      throw new BadRequestException(`Plan ${newPlanCode} not found`);
    }

    // Validate upgrade/downgrade is allowed (アップグレード/ダウングレードが許可されているか検証)
    await this.validatePlanChange(tenantCode, current.attributes, newPlan);

    const command = {
      ...current,
      version: current.version,
      attributes: {
        ...current.attributes,
        planCode: newPlanCode,
        planChangedAt: new Date().toISOString(),
      },
    };

    return this.commandService.publishAsync(command, { invokeContext: context });
  }

  // Cancel subscription (サブスクリプションをキャンセル)
  async cancelSubscription(
    subscriptionCode: string,
    reason: string,
    context: IInvoke,
  ) {
    const { tenantCode } = getUserContext(context);
    const pk = generatePk(tenantCode);
    const sk = `SUBSCRIPTION#${subscriptionCode}`;

    const current = await this.dataService.getItem({ pk, sk });
    if (!current) {
      throw new NotFoundException(`Subscription ${subscriptionCode} not found`);
    }

    const command = {
      ...current,
      version: current.version,
      attributes: {
        ...current.attributes,
        status: 'cancelled' as SubscriptionStatus,
        autoRenew: false,
        cancellationReason: reason,
        cancelledAt: new Date().toISOString(),
      },
    };

    return this.commandService.publishAsync(command, { invokeContext: context });
  }

  private async validatePlanChange(
    tenantCode: string,
    currentSub: SubscriptionAttributes,
    newPlan: any,
  ) {
    // Check current usage against new plan limits (新プランの制限に対して現在の使用量を確認)
    const usage = await this.getCurrentUsage(tenantCode);

    if (usage.activeUsers > newPlan.attributes.limits.maxUsers) {
      throw new BadRequestException(
        `Cannot downgrade: current users (${usage.activeUsers}) ` +
        `exceeds new plan limit (${newPlan.attributes.limits.maxUsers})`
      );
    }

    if (usage.storageUsedGb > newPlan.attributes.limits.maxStorageGb) {
      throw new BadRequestException(
        `Cannot downgrade: current storage (${usage.storageUsedGb}GB) ` +
        `exceeds new plan limit (${newPlan.attributes.limits.maxStorageGb}GB)`
      );
    }
  }
}
```

## 使用量計測

### 使用量サービス

```typescript
// usage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  CommandService,
  DataService,
  MasterService,
  IInvoke,
  getUserContext,
  generatePk,
} from '@mbc-cqrs-serverless/core';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
    private readonly masterService: MasterService,
  ) {}

  // Track API call (APIコールを追跡)
  async trackApiCall(context: IInvoke): Promise<void> {
    await this.incrementUsage(context, 'apiCalls', 1);
  }

  // Track storage usage (ストレージ使用量を追跡)
  async trackStorageChange(
    deltaGb: number,
    context: IInvoke,
  ): Promise<void> {
    await this.incrementUsage(context, 'storageUsedGb', deltaGb);
  }

  // Check if quota is exceeded (クォータ超過を確認)
  async checkQuota(
    metric: keyof UsageAttributes,
    context: IInvoke,
  ): Promise<QuotaCheckResult> {
    const { tenantCode } = getUserContext(context);

    const [usage, subscription] = await Promise.all([
      this.getCurrentUsage(tenantCode),
      this.getActiveSubscription(tenantCode),
    ]);

    const plan = await this.masterService.getByCode(
      'PLAN',
      subscription.attributes.planCode
    );

    const limit = this.getLimit(plan, metric);
    const current = usage.attributes[metric] as number;
    const percentage = (current / limit) * 100;

    return {
      metric,
      current,
      limit,
      percentage,
      isExceeded: current >= limit,
      isNearLimit: percentage >= 80,
    };
  }

  // Get usage summary for billing (課金用の使用量サマリーを取得)
  async getUsageSummary(
    tenantCode: string,
    period: string,
  ): Promise<UsageSummary> {
    const pk = generatePk(tenantCode);
    const sk = `USAGE#${period}`;

    const usage = await this.dataService.getItem({ pk, sk });
    if (!usage) {
      return {
        period,
        apiCalls: 0,
        storageUsedGb: 0,
        activeUsers: 0,
        projectCount: 0,
      };
    }

    return usage.attributes;
  }

  private async incrementUsage(
    context: IInvoke,
    metric: string,
    delta: number,
  ): Promise<void> {
    const { tenantCode } = getUserContext(context);
    const period = this.getCurrentPeriod();
    const pk = generatePk(tenantCode);
    const sk = `USAGE#${period}`;

    const current = await this.dataService.getItem({ pk, sk });

    if (!current) {
      // Create new usage record (新しい使用量レコードを作成)
      const command = {
        pk,
        sk,
        code: period,
        name: `Usage for ${period}`,
        tenantCode,
        attributes: {
          period,
          apiCalls: 0,
          storageUsedGb: 0,
          activeUsers: 0,
          projectCount: 0,
          [metric]: delta,
          lastUpdatedAt: new Date().toISOString(),
        },
      };
      await this.commandService.publishAsync(command, { invokeContext: context });
      return;
    }

    // Update existing record (既存レコードを更新)
    const command = {
      ...current,
      version: current.version,
      attributes: {
        ...current.attributes,
        [metric]: (current.attributes[metric] || 0) + delta,
        lastUpdatedAt: new Date().toISOString(),
      },
    };

    await this.commandService.publishAsync(command, { invokeContext: context });
  }

  private getLimit(plan: any, metric: string): number {
    const limitMapping: Record<string, string> = {
      apiCalls: 'maxApiCalls',
      storageUsedGb: 'maxStorageGb',
      activeUsers: 'maxUsers',
      projectCount: 'maxProjects',
    };

    return plan.attributes.limits[limitMapping[metric]] || Infinity;
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
```

### クォータガード

```typescript
// quota.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageService } from './usage.service';
import { getInvokeContext } from '@mbc-cqrs-serverless/core';

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usageService: UsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metric = this.reflector.get<string>('quota_metric', context.getHandler());
    if (!metric) {
      return true;
    }

    const ctx = getInvokeContext(context);
    const quota = await this.usageService.checkQuota(metric, ctx);

    if (quota.isExceeded) {
      throw new ForbiddenException(
        `Quota exceeded for ${metric}: ${quota.current}/${quota.limit}. ` +
        'Please upgrade your plan.'
      );
    }

    return true;
  }
}

// Usage in controller (コントローラーでの使用)
@Controller('projects')
export class ProjectController {
  @Post()
  @UseGuards(QuotaGuard)
  @SetMetadata('quota_metric', 'projectCount')
  async create(@Body() dto: CreateProjectDto, @Req() req: IInvoke) {
    // ...
  }
}
```

## 課金連携

### 課金イベントハンドラー

```typescript
// billing-event.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { DataSyncHandler, IDataSyncHandler } from '@mbc-cqrs-serverless/core';

@DataSyncHandler({ tableName: 'data-table' })
@Injectable()
export class BillingEventHandler implements IDataSyncHandler {
  private readonly logger = new Logger(BillingEventHandler.name);

  constructor(private readonly billingService: BillingService) {}

  async handleSync(event: DataSyncEvent): Promise<void> {
    // Handle subscription changes (サブスクリプション変更を処理)
    if (event.sk.startsWith('SUBSCRIPTION#')) {
      await this.handleSubscriptionChange(event);
      return;
    }

    // Handle usage updates (使用量更新を処理)
    if (event.sk.startsWith('USAGE#')) {
      await this.handleUsageChange(event);
      return;
    }
  }

  private async handleSubscriptionChange(event: DataSyncEvent) {
    const { old: prev, new: current } = event;

    // New subscription (新規サブスクリプション)
    if (!prev && current) {
      this.logger.log(`New subscription: ${current.code}`);

      if (current.attributes.status === 'active') {
        await this.billingService.createBillingCycle({
          tenantCode: current.tenantCode,
          subscriptionCode: current.code,
          planCode: current.attributes.planCode,
          billingCycle: current.attributes.billingCycle,
          startDate: current.attributes.startDate,
        });
      }
      return;
    }

    // Subscription cancelled (サブスクリプションキャンセル)
    if (
      prev?.attributes.status !== 'cancelled' &&
      current?.attributes.status === 'cancelled'
    ) {
      this.logger.log(`Subscription cancelled: ${current.code}`);
      await this.billingService.cancelBillingCycle(current.code);
      return;
    }

    // Plan changed (プラン変更)
    if (prev?.attributes.planCode !== current?.attributes.planCode) {
      this.logger.log(
        `Plan changed: ${prev.attributes.planCode} -> ${current.attributes.planCode}`
      );
      await this.billingService.prorate({
        subscriptionCode: current.code,
        oldPlanCode: prev.attributes.planCode,
        newPlanCode: current.attributes.planCode,
        changeDate: current.attributes.planChangedAt,
      });
    }
  }

  private async handleUsageChange(event: DataSyncEvent) {
    const usage = event.new;
    if (!usage) return;

    // Check for overage (超過を確認)
    const subscription = await this.getActiveSubscription(usage.tenantCode);
    const plan = await this.masterService.getByCode(
      'PLAN',
      subscription.attributes.planCode
    );

    const overages = this.calculateOverages(usage.attributes, plan.attributes.limits);

    if (overages.length > 0) {
      this.logger.log(`Overage detected for ${usage.tenantCode}`, overages);
      await this.billingService.recordOverage({
        tenantCode: usage.tenantCode,
        period: usage.attributes.period,
        overages,
      });
    }
  }

  private calculateOverages(
    usage: UsageAttributes,
    limits: PlanLimits,
  ): Overage[] {
    const overages: Overage[] = [];

    if (usage.apiCalls > limits.maxApiCalls) {
      overages.push({
        metric: 'apiCalls',
        limit: limits.maxApiCalls,
        actual: usage.apiCalls,
        overage: usage.apiCalls - limits.maxApiCalls,
      });
    }

    if (usage.storageUsedGb > limits.maxStorageGb) {
      overages.push({
        metric: 'storageUsedGb',
        limit: limits.maxStorageGb,
        actual: usage.storageUsedGb,
        overage: usage.storageUsedGb - limits.maxStorageGb,
      });
    }

    return overages;
  }
}
```

## APIキー管理

### APIキーサービス

```typescript
// api-key.service.ts
import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import {
  CommandService,
  DataService,
  IInvoke,
  getUserContext,
  generatePk,
} from '@mbc-cqrs-serverless/core';

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
  ) {}

  // Generate new API key (新しいAPIキーを生成)
  async createApiKey(dto: CreateApiKeyDto, context: IInvoke) {
    const { tenantCode, userId } = getUserContext(context);

    // Generate secure API key (安全なAPIキーを生成)
    const rawKey = `mbc_${randomBytes(32).toString('hex')}`;
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 11); // Show first 11 chars (最初の11文字を表示)

    const command = {
      pk: generatePk(tenantCode),
      sk: `APIKEY#${keyHash}`,
      code: keyHash,
      name: dto.name,
      tenantCode,
      attributes: {
        keyPrefix,
        keyHash,
        createdBy: userId,
        scopes: dto.scopes || ['read'],
        expiresAt: dto.expiresAt,
        lastUsedAt: null,
        isActive: true,
      },
    };

    await this.commandService.publishAsync(command, { invokeContext: context });

    // Return raw key only once (生キーを一度だけ返す)
    return {
      key: rawKey,
      keyPrefix,
      name: dto.name,
      scopes: dto.scopes,
    };
  }

  // Validate API key (APIキーを検証)
  async validateApiKey(rawKey: string): Promise<ApiKeyValidation> {
    const keyHash = this.hashKey(rawKey);

    // Search across all tenants - use GSI in production (全テナントを検索 - 本番ではGSIを使用)
    const result = await this.dataService.query({
      indexName: 'GSI-APIKEY',
      pk: keyHash,
    });

    if (!result.items.length) {
      return { valid: false, reason: 'Key not found' };
    }

    const apiKey = result.items[0];

    if (!apiKey.attributes.isActive) {
      return { valid: false, reason: 'Key is inactive' };
    }

    if (
      apiKey.attributes.expiresAt &&
      new Date(apiKey.attributes.expiresAt) < new Date()
    ) {
      return { valid: false, reason: 'Key expired' };
    }

    // Update last used timestamp asynchronously (最終使用タイムスタンプを非同期で更新)
    this.updateLastUsed(apiKey).catch(() => {});

    return {
      valid: true,
      tenantCode: apiKey.tenantCode,
      scopes: apiKey.attributes.scopes,
    };
  }

  // Revoke API key (APIキーを失効)
  async revokeApiKey(keyPrefix: string, context: IInvoke) {
    const { tenantCode } = getUserContext(context);
    const pk = generatePk(tenantCode);

    // Find key by prefix (プレフィックスでキーを検索)
    const keys = await this.dataService.listItemsByPk(pk, {
      sk: { $beginsWith: 'APIKEY#' },
    });

    const apiKey = keys.items.find(
      (k) => k.attributes.keyPrefix === keyPrefix
    );

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const command = {
      ...apiKey,
      version: apiKey.version,
      attributes: {
        ...apiKey.attributes,
        isActive: false,
        revokedAt: new Date().toISOString(),
      },
    };

    return this.commandService.publishAsync(command, { invokeContext: context });
  }

  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }
}
```

## APIエンドポイント

| メソッド | エンドポイント | 説明 |
|------------|--------------|-----------------|
| POST | `/tenants/provision` | 新規テナントをプロビジョニング |
| GET | `/subscription` | 現在のサブスクリプションを取得 |
| PATCH | `/subscription/plan` | プランを変更 |
| POST | `/subscription/cancel` | Cancel subscription (サブスクリプションをキャンセル) |
| GET | `/usage` | 現在の使用量を取得 |
| GET | `/usage/:period` | 期間の使用量を取得 |
| POST | `/api-keys` | APIキーを作成 |
| DELETE | `/api-keys/:prefix` | Revoke API key (APIキーを失効) |

## ベストプラクティス

### 1. テナント分離

常にテナントでデータアクセスをスコープしてください：

```typescript
const { tenantCode } = getUserContext(context);
const pk = generatePk(tenantCode);
```

### 2. 使用量追跡

リクエストごとではなく、インクリメンタルに使用量を追跡してください：

```typescript
// Batch updates using a buffer (バッファを使用したバッチ更新)
private usageBuffer = new Map<string, number>();

async trackApiCall(tenantCode: string) {
  const current = this.usageBuffer.get(tenantCode) || 0;
  this.usageBuffer.set(tenantCode, current + 1);

  // Flush every 100 calls or 60 seconds (100コールまたは60秒ごとにフラッシュ)
  if (current + 1 >= 100) {
    await this.flushUsage(tenantCode);
  }
}
```

### 3. 課金イベント

同期呼び出しではなく、課金にはイベントハンドラーを使用してください：

```typescript
// Good: Event-driven billing (良い例: イベント駆動の課金)
@DataSyncHandler({ tableName: 'data-table' })
export class BillingEventHandler {
  // Async, decoupled, reliable (非同期、疎結合、信頼性)
}

// Avoid: Synchronous billing calls (避けるべき: 同期課金呼び出し)
async createSubscription() {
  await this.createInStripe(); // Can fail, blocks user (失敗する可能性があり、ユーザーをブロック)
}
```

## 関連項目

- [テナントモジュール](./tenant)
- [マスターモジュール](./master)
- [マルチテナントパターン](./multi-tenant-patterns)
- [イベント処理パターン](./event-handling-patterns)
