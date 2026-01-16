---
description: UI Settingモジュールを使用したUI設定とデータ構成の管理方法を学びます。
---

# UI設定モジュール

UI Settingパッケージは、コード変更なしで動的なアプリケーション設定を管理するための柔軟なフレームワークを提供します。管理者がカスタムフィールドを定義し、ユーザーがそのスキーマに準拠したデータを保存できるようにします。

## このパッケージを使用するタイミング

以下の場合にこのパッケージを使用します：

- 開発者の介入なしに管理者がカスタムフォームを定義できるようにする
- テナント固有の設定（テーマ、プリファレンス、制限）を保存する
- ユーザーが編集可能な通知やメールテンプレート設定を作成する
- 設定可能なドロップダウンリストやマスターデータテーブルを構築する

## このパッケージが解決する問題

| 問題 | 解決策 |
|---------|----------|
| 新しい設定ごとにコードのデプロイが必要 | APIを通じてスキーマを動的に定義 |
| テナント間で設定構造が異なる | マルチテナントスキーマサポート |
| ユーザー入力設定のバリデーションがない | フィールド定義でデータ型と制約を強制 |
| 設定用の管理UIを構築するのが困難 | スキーマイントロスペクション付きREST API |

## コアコンセプト

このモジュールは2つの主要コンポーネントで動作します：

1. **設定**: データエントリのスキーマ/構造を定義します。各設定にはコード、名前、およびデータ構造を記述するフィールドのリストがあります。

2. **データ設定**: 設定のスキーマに準拠する実際のデータエントリ。各データ設定は特定の設定コードに属します。

## インストール

```bash
npm install @mbc-cqrs-serverless/ui-setting
```

## モジュール設定

アプリケーションに`SettingModule`を登録します：

```typescript
import { Module } from '@nestjs/common';
import { SettingModule } from '@mbc-cqrs-serverless/ui-setting';

@Module({
  imports: [
    SettingModule.register({
      enableSettingController: true,  // Enable REST API for settings
      enableDataController: true,     // Enable REST API for data settings
    }),
  ],
})
export class AppModule {}
```

### 設定オプション

| オプション | 型 | 説明 |
|--------|------|-------------|
| `enableSettingController` | boolean | 設定REST APIコントローラーを有効化 |
| `enableDataController` | boolean | データ設定REST APIコントローラーを有効化 |

## Settingサービス

`SettingService`は設定定義を管理します。

### 利用可能なメソッド

```typescript
import { SettingService } from '@mbc-cqrs-serverless/ui-setting';

@Injectable()
export class MyService {
  constructor(private readonly settingService: SettingService) {}

  async example() {
    // List all settings for a tenant
    const settings = await this.settingService.list(tenantCode);

    // Get a specific setting
    const setting = await this.settingService.get({ pk, sk });

    // Create a new setting
    const newSetting = await this.settingService.create(
      tenantCode,
      createDto,
      { invokeContext }
    );

    // Update a setting
    const updated = await this.settingService.update(
      { pk, sk },
      updateDto,
      { invokeContext }
    );

    // Delete a setting
    const deleted = await this.settingService.delete(
      { pk, sk },
      { invokeContext }
    );

    // Check if a setting code exists
    const exists = await this.settingService.checkExistSettingCode(
      tenantCode,
      code
    );
  }
}
```

### 設定の作成

```typescript
const createDto: CreateSettingDto = {
  code: 'user-preferences',
  name: 'User Preferences',
  attributes: {
    description: 'User preference settings',
    fields: [
      {
        physicalName: 'theme',
        name: 'Theme',
        dataType: 'string',
        isRequired: true,
        isShowedOnList: true,
        defaultValue: 'light',
      },
      {
        physicalName: 'language',
        name: 'Language',
        dataType: 'string',
        isRequired: true,
        isShowedOnList: true,
        defaultValue: 'en',
      },
      {
        physicalName: 'pageSize',
        name: 'Page Size',
        dataType: 'number',
        isRequired: false,
        isShowedOnList: false,
        min: '10',
        max: '100',
        defaultValue: '20',
      },
    ],
  },
};
```

### フィールド定義

設定内の各フィールドには以下のプロパティを設定できます：

| プロパティ | 型 | 必須 | 説明 |
|----------|------|----------|-------------|
| `physicalName` | string | はい | フィールドの一意識別子 |
| `name` | string | はい | 表示名 |
| `description` | string | いいえ | フィールドの説明 |
| `dataType` | string | はい | データ型（string、number、booleanなど） |
| `min` | string | いいえ | 数値フィールドの最小値 |
| `max` | string | いいえ | 数値フィールドの最大値 |
| `length` | string | いいえ | 文字列フィールドの最大長 |
| `maxRow` | number | いいえ | 複数行テキストの最大行数 |
| `defaultValue` | string | いいえ | フィールドのデフォルト値 |
| `isRequired` | boolean | はい | フィールドが必須かどうか |
| `isShowedOnList` | boolean | はい | リストビューに表示するかどうか |
| `dataFormat` | string | いいえ | データのフォーマット指定 |

## DataSettingサービス

`DataSettingService`は定義された設定のデータエントリを管理します。

### 利用可能なメソッド

```typescript
import { DataSettingService } from '@mbc-cqrs-serverless/ui-setting';

@Injectable()
export class MyService {
  constructor(private readonly dataSettingService: DataSettingService) {}

  async example() {
    // List data settings (optionally filter by setting code)
    const dataList = await this.dataSettingService.list(
      tenantCode,
      { settingCode: 'user-preferences' }
    );

    // Get a specific data setting
    const data = await this.dataSettingService.get({ pk, sk });

    // Create a new data setting
    const newData = await this.dataSettingService.create(
      tenantCode,
      createDto,
      { invokeContext }
    );

    // Update a data setting
    const updated = await this.dataSettingService.update(
      { pk, sk },
      updateDto,
      { invokeContext }
    );

    // Delete a data setting
    const deleted = await this.dataSettingService.delete(
      { pk, sk },
      { invokeContext }
    );

    // Check if a data code exists
    const exists = await this.dataSettingService.checkExistCode(
      tenantCode,
      settingCode,
      code
    );
  }
}
```

### データ設定の作成

```typescript
const createDto: CreateDataSettingDto = {
  settingCode: 'user-preferences',
  code: 'user-001',
  name: 'User 001 Preferences',
  attributes: {
    theme: 'dark',
    language: 'ja',
    pageSize: 50,
  },
};
```

## REST APIエンドポイント

コントローラーが有効な場合、以下のエンドポイントが利用可能です：

### 設定エンドポイント

| メソッド | エンドポイント | 説明 |
|--------|----------|-------------|
| GET | `/api/master-setting` | すべての設定を一覧表示 |
| GET | `/api/master-setting/:pk/:sk` | 特定の設定を取得 |
| POST | `/api/master-setting` | 新しい設定を作成 |
| PUT | `/api/master-setting/:pk/:sk` | 設定を更新 |
| DELETE | `/api/master-setting/:pk/:sk` | 設定を削除 |
| POST | `/api/master-setting/check-exist/:code` | 設定コードの存在確認 |

### データ設定エンドポイント

| メソッド | エンドポイント | 説明 |
|--------|----------|-------------|
| GET | `/api/master-data` | すべてのデータ設定を一覧表示 |
| GET | `/api/master-data/:pk/:sk` | 特定のデータ設定を取得 |
| POST | `/api/master-data` | 新しいデータ設定を作成 |
| PUT | `/api/master-data/:pk/:sk` | データ設定を更新 |
| DELETE | `/api/master-data/:pk/:sk` | データ設定を削除 |
| POST | `/api/master-data/check-exist/:settingCode/:code` | データ設定コードの存在確認 |

## マルチテナントサポート

このモジュールはマルチテナントのデータ分離を自動的に処理します。各テナントの設定とデータはテナント固有のキーで保存されます：

```typescript
// {{Settings are stored with tenant-prefixed keys}}
// pk: MASTER#<tenantCode>
// sk: MASTER_SETTING#<code>

// {{Data settings are stored with setting-prefixed keys}}
// pk: MASTER#<tenantCode>
// sk: <settingCode>#<code>
```

## Example Use Cases

### Use Case 1: User Notification Preferences

Scenario: Each user can configure their notification preferences (email on/off, SMS on/off).

Implementation: Create a "notification-settings" schema, then store each user's preferences as data entries.

```typescript
@Injectable()
export class AppConfigService {
  constructor(
    private readonly settingService: SettingService,
    private readonly dataSettingService: DataSettingService,
  ) {}

  async initializeDefaultSettings(tenantCode: string, invokeContext: IInvoke) {
    // Create a setting schema for notification preferences
    const settingDto: CreateSettingDto = {
      code: 'notification-settings',
      name: 'Notification Settings',
      attributes: {
        description: 'Configure notification preferences',
        fields: [
          {
            physicalName: 'emailEnabled',
            name: 'Email Notifications',
            dataType: 'boolean',
            isRequired: true,
            isShowedOnList: true,
            defaultValue: 'true',
          },
          {
            physicalName: 'smsEnabled',
            name: 'SMS Notifications',
            dataType: 'boolean',
            isRequired: true,
            isShowedOnList: true,
            defaultValue: 'false',
          },
        ],
      },
    };

    await this.settingService.create(tenantCode, settingDto, { invokeContext });
  }

  async getUserNotificationSettings(
    tenantCode: string,
    userId: string,
  ) {
    const { items } = await this.dataSettingService.list(tenantCode, {
      settingCode: 'notification-settings',
    });

    return items.find(item => item.code === userId);
  }
}
```
