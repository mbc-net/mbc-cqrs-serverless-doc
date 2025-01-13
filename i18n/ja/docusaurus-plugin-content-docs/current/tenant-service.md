---
description: Learn about the Tenant Service for managing tenant-level operations in a multi-tenant serverless CQRS architecture.
---

# テナントサービス

テナントサービスは、マルチテナントサーバーレスCQRSアーキテクチャにおけるテナントレベルの操作を管理する機能を提供します。テナントエンティティの管理、テナント間の適切な分離、およびシステム全体のデータ整合性を維持します。

## 概要

テナントサービスは以下の機能を提供します:
- テナントレベルのエンティティ操作の管理
- テナントエンティティのCRUD操作の実装
- 異なるテナント間の適切な分離の確保
- テナントコードの検証とテナントの整合性の維持

## インストール

```bash
npm install @mbc-cqrs-serverless/tenant
```

## 基本的な使用方法

```typescript
import { TenantService } from '@mbc-cqrs-serverless/tenant';

@Injectable()
export class YourService {
  constructor(private readonly tenantService: TenantService) {}

  async createTenant(tenantData: CreateTenantDto) {
    return await this.tenantService.create(tenantData);
  }
}
```

## APIリファレンス

### create(data: CreateTenantDto)

新しいテナントエンティティを作成します。

```typescript
const tenant = await tenantService.create({
  code: 'TENANT001',
  name: 'Example Tenant',
  // ... other tenant properties
});
```

### update(id: string, data: UpdateTenantDto)

既存のテナントエンティティを更新します。

```typescript
await tenantService.update('tenant-id', {
  name: 'Updated Tenant Name',
  // ... other properties to update
});
```

### delete(id: string)

テナントエンティティを削除します。

```typescript
await tenantService.delete('tenant-id');
```

### findById(id: string)

IDによってテナントを取得します。

```typescript
const tenant = await tenantService.findById('tenant-id');
```

### validateTenantCode(code: string)

テナントコードが存在し、有効であるかを検証します。

```typescript
const isValid = await tenantService.validateTenantCode('TENANT001');
```

## マスター設定との統合

テナントサービスは、テナント固有の設定を管理するためにマスター設定サービスと統合されています。 詳細については [マスターサービス](./master-service.md) のテナント固有のマスターデータと設定の管理に関するセクションを参照してください。
