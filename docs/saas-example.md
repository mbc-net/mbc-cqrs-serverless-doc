---
description: {{Multi-tenant SaaS application example with subscription management, usage tracking, and billing integration.}}
---

# {{SaaS Application Example}}

{{This example demonstrates a multi-tenant SaaS application with subscription management, usage tracking, and billing integration using MBC CQRS Serverless.}}

## {{Overview}}

{{The SaaS example covers:}}

- {{Multi-tenant isolation with tenant hierarchy}}
- {{Subscription and plan management}}
- {{Usage metering and quota enforcement}}
- {{Billing event generation}}

## {{Data Model}}

### {{Key Structure}}

```
{{Partition Key (pk)}}           {{Sort Key (sk)}}
──────────────────────────────────────────────────
TENANT#acme-corp                 SUBSCRIPTION#SUB-001
TENANT#acme-corp                 USAGE#2024-01
TENANT#acme-corp                 USER#usr-001
TENANT#acme-corp                 APIKEY#key-001
MASTER#COMMON                    PLAN#starter
MASTER#COMMON                    PLAN#professional
MASTER#COMMON                    PLAN#enterprise
```

### {{Entity Definitions}}

```typescript
// {{Plan Entity (Master Data)}}
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

// {{Subscription Entity}}
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

// {{Usage Entity}}
export interface UsageAttributes {
  period: string; // YYYY-MM
  apiCalls: number;
  storageUsedGb: number;
  activeUsers: number;
  projectCount: number;
  lastUpdatedAt: string;
}
```

## {{Tenant Management}}

### {{Tenant Service Extension}}

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

  // {{Create tenant with initial subscription}}
  async provisionTenant(dto: ProvisionTenantDto, context: IInvoke) {
    // {{Step 1: Create tenant}}
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

    // {{Step 2: Create trial subscription}}
    await this.subscriptionService.createTrialSubscription(
      dto.companySlug,
      dto.planCode,
      context,
    );

    // {{Step 3: Initialize usage tracking}}
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

## {{Subscription Management}}

### {{Subscription Service}}

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

  // {{Create trial subscription}}
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

  // {{Upgrade/Downgrade subscription}}
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

    // {{Validate plan exists}}
    const newPlan = await this.masterService.getByCode('PLAN', newPlanCode);
    if (!newPlan) {
      throw new BadRequestException(`Plan ${newPlanCode} not found`);
    }

    // {{Validate upgrade/downgrade is allowed}}
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

  // {{Cancel subscription}}
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
    // {{Check current usage against new plan limits}}
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

## {{Usage Metering}}

### {{Usage Service}}

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

  // {{Track API call}}
  async trackApiCall(context: IInvoke): Promise<void> {
    await this.incrementUsage(context, 'apiCalls', 1);
  }

  // {{Track storage usage}}
  async trackStorageChange(
    deltaGb: number,
    context: IInvoke,
  ): Promise<void> {
    await this.incrementUsage(context, 'storageUsedGb', deltaGb);
  }

  // {{Check if quota is exceeded}}
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

  // {{Get usage summary for billing}}
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
      // {{Create new usage record}}
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

    // {{Update existing record}}
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

### {{Quota Guard}}

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

// {{Usage in controller}}
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

## {{Billing Integration}}

### {{Billing Event Handler}}

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
    // {{Handle subscription changes}}
    if (event.sk.startsWith('SUBSCRIPTION#')) {
      await this.handleSubscriptionChange(event);
      return;
    }

    // {{Handle usage updates}}
    if (event.sk.startsWith('USAGE#')) {
      await this.handleUsageChange(event);
      return;
    }
  }

  private async handleSubscriptionChange(event: DataSyncEvent) {
    const { old: prev, new: current } = event;

    // {{New subscription}}
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

    // {{Subscription cancelled}}
    if (
      prev?.attributes.status !== 'cancelled' &&
      current?.attributes.status === 'cancelled'
    ) {
      this.logger.log(`Subscription cancelled: ${current.code}`);
      await this.billingService.cancelBillingCycle(current.code);
      return;
    }

    // {{Plan changed}}
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

    // {{Check for overage}}
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

## {{API Key Management}}

### {{API Key Service}}

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

  // {{Generate new API key}}
  async createApiKey(dto: CreateApiKeyDto, context: IInvoke) {
    const { tenantCode, userId } = getUserContext(context);

    // {{Generate secure API key}}
    const rawKey = `mbc_${randomBytes(32).toString('hex')}`;
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 11); // {{Show first 11 chars}}

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

    // {{Return raw key only once}}
    return {
      key: rawKey,
      keyPrefix,
      name: dto.name,
      scopes: dto.scopes,
    };
  }

  // {{Validate API key}}
  async validateApiKey(rawKey: string): Promise<ApiKeyValidation> {
    const keyHash = this.hashKey(rawKey);

    // {{Search across all tenants - use GSI in production}}
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

    // {{Update last used timestamp asynchronously}}
    this.updateLastUsed(apiKey).catch(() => {});

    return {
      valid: true,
      tenantCode: apiKey.tenantCode,
      scopes: apiKey.attributes.scopes,
    };
  }

  // {{Revoke API key}}
  async revokeApiKey(keyPrefix: string, context: IInvoke) {
    const { tenantCode } = getUserContext(context);
    const pk = generatePk(tenantCode);

    // {{Find key by prefix}}
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

## {{API Endpoints}}

| {{Method}} | {{Endpoint}} | {{Description}} |
|------------|--------------|-----------------|
| POST | `/tenants/provision` | {{Provision new tenant}} |
| GET | `/subscription` | {{Get current subscription}} |
| PATCH | `/subscription/plan` | {{Change plan}} |
| POST | `/subscription/cancel` | {{Cancel subscription}} |
| GET | `/usage` | {{Get current usage}} |
| GET | `/usage/:period` | {{Get usage for period}} |
| POST | `/api-keys` | {{Create API key}} |
| DELETE | `/api-keys/:prefix` | {{Revoke API key}} |

## {{Best Practices}}

### {{1. Tenant Isolation}}

{{Always scope data access by tenant:}}

```typescript
const { tenantCode } = getUserContext(context);
const pk = generatePk(tenantCode);
```

### {{2. Usage Tracking}}

{{Track usage incrementally, not on every request:}}

```typescript
// {{Batch updates using a buffer}}
private usageBuffer = new Map<string, number>();

async trackApiCall(tenantCode: string) {
  const current = this.usageBuffer.get(tenantCode) || 0;
  this.usageBuffer.set(tenantCode, current + 1);

  // {{Flush every 100 calls or 60 seconds}}
  if (current + 1 >= 100) {
    await this.flushUsage(tenantCode);
  }
}
```

### {{3. Billing Events}}

{{Use event handlers for billing, not synchronous calls:}}

```typescript
// {{Good: Event-driven billing}}
@DataSyncHandler({ tableName: 'data-table' })
export class BillingEventHandler {
  // {{Async, decoupled, reliable}}
}

// {{Avoid: Synchronous billing calls}}
async createSubscription() {
  await this.createInStripe(); // {{Can fail, blocks user}}
}
```

## {{See Also}}

- [{{Tenant Module}}](./tenant)
- [{{Master Module}}](./master)
- [{{Multi-Tenant Patterns}}](./multi-tenant-patterns)
- [{{Event Handling Patterns}}](./event-handling-patterns)
