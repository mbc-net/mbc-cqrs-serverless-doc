# マスターサービス

マスターサービスは、マルチテナント環境でのマスターデータと設定の管理機能を提供します。異なるレベル（ユーザー、グループ、テナント、共通）間での階層的データ管理をサポートし、テナント間の適切なデータ分離を確保します。

## 概要

マスターサービスは2つの主要なコンポーネントで構成されています：

### マスターデータサービス
- マスターデータエンティティのCRUD操作を実装
- 一覧表示と取得機能を提供
- コード検証機能を含む
- テナント間のデータ整合性を確保

### マスター設定サービス
- 階層的設定管理を実装
- すべてのレベルでの設定作成をサポート
- テナント設定の更新と削除操作を提供
- 階層的設定の取得を実装

## インストール

```bash
npm install @mbc-cqrs-serverless/master
```

## 基本的な使用方法

```typescript
import { MasterDataService, MasterSettingService } from '@mbc-cqrs-serverless/master';

@Injectable()
export class YourService {
  constructor(
    private readonly masterDataService: MasterDataService,
    private readonly masterSettingService: MasterSettingService
  ) {}

  async getMasterData(code: string) {
    return await this.masterDataService.findByCode(code);
  }

  async getSettings(userId: string) {
    return await this.masterSettingService.getSettings(userId);
  }
}
```

## API リファレンス

### MasterDataService

#### create(data: CreateMasterDataDto)

新しいマスターデータエンティティを作成します。

```typescript
const masterData = await masterDataService.create({
  code: 'MASTER001',
  name: 'マスターデータ例',
  // ... その他のプロパティ
});
```

#### update(id: string, data: UpdateMasterDataDto)

既存のマスターデータエンティティを更新します。

```typescript
await masterDataService.update('master-id', {
  name: '更新されたマスターデータ',
  // ... 更新する他のプロパティ
});
```

### MasterSettingService

#### createSetting(level: SettingLevel, data: CreateSettingDto)

指定されたレベルで新しい設定を作成します。

```typescript
await masterSettingService.createSetting('tenant', {
  code: 'SETTING001',
  value: { /* 設定値 */ },
  // ... その他のプロパティ
});
```

#### getSettings(userId: string)

ユーザーの設定を階層的に取得します。

```typescript
const settings = await masterSettingService.getSettings('user-id');
// ユーザー → グループ → テナント → 共通レベルからのマージされた設定を返します
```

## 階層的設定管理

設定は4つのレベルで階層的に管理されます：

1. ユーザーレベル：個々のユーザーの設定
2. グループレベル：ユーザーグループで共有される設定
3. テナントレベル：組織全体の設定
4. 共通レベル：システム全体のデフォルト設定

設定は階層的に取得され、より具体的な設定が一般的な設定よりも優先されます：

```typescript
const settings = await masterSettingService.getSettings('user-id');
// すべてのレベルの設定を組み合わせ、ユーザーレベルの設定が優先されます
```

## テナントサービスとの統合

マスターサービスは、適切なデータ分離とアクセス制御を確保するためにテナントサービスと連携して動作します。テナント管理の詳細については、[テナントサービス](./tenant-service.md)を参照してください。
