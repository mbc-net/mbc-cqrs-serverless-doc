---
description: マルチテナント環境でのマスターデータと設定を管理するためのマスターサービスについて学びます。
---

# マスターモジュール


マスターサービスは、マルチテナント環境でのマスターデータと設定の管理機能を提供します。
## 概要

マスターサービスは2つの主要コンポーネントで構成されています。


### Master Setting Service
- 階層的な設定管理を実装
- すべてのレベルでの設定作成をサポート
- テナント設定の更新および削除操作を提供
- 階層的な設定取得を実装


### マスターデータサービス
- マスターデータエンティティのCRUD操作を実装
- リストおよび取得機能を提供
- コード検証機能を含む
- テナント間のデータ整合性を確保

## アーキテクチャ

```mermaid
graph TB
    subgraph "設定の階層"
        A["共通"] --> B["テナント"]
        B --> C["グループ"]
        C --> D["ユーザー"]
    end

    subgraph "マスターデータ"
        E["マスターデータサービス"] --> F["コードテーブル"]
        E --> G["カテゴリ"]
        E --> H["ルックアップ値"]
    end
```

## インストール

```bash
npm install @mbc-cqrs-serverless/master
```

## 基本的な使い方

`MasterModule` の動作をカスタマイズするには、静的な `register()` メソッドでオプションの `object` を渡します。

### モジュールオプション

| オプション | 型 | 説明 |
|--------|------|-------------|
| `enableController` | `boolean` | デフォルトのマスターコントローラーを有効または無効にする |
| `dataSyncHandlers` | `Type<IDataSyncHandler>[]` | マスターデータを外部システム（例：RDS）に同期するオプションハンドラー |
| `prismaService` | `Type<any>` | RDSバッククエリ用のPrismaサービス。`enableController: true` の場合は必須 |

:::warning prismaServiceの要件
`enableController: true` の場合、`prismaService` パラメータは **必須** です。コントローラーが有効な状態で `prismaService` が提供されていない場合、起動時にエラーがスローされます。
:::

```ts
import { MasterModule } from '@mbc-cqrs-serverless/master'

@Module({
  imports: [ MasterModule.register({
      enableController: true,
      dataSyncHandlers: [MasterDataRdsSyncHandler],
      prismaService: PrismaService,
    })],
  controllers: [],
  exports: [],
})

```

## APIリファレンス

### マスター設定サービス
MasterSettingService インターフェースは、ユーザー、グループ、テナント、共通のさまざまなレベルで設定を管理します。設定の取得、更新、作成、削除を可能にします。

##### `getSetting(dto: GetSettingDto, context: { invokeContext: IInvoke }): Promise<MasterSettingEntity>`
指定された設定コードに基づいて特定の設定を取得します。
```ts
const masterSetting = await this.masterSettingService.getSetting(
  {
    code: "service",
  },
  { invokeContext }
);
```

#### `createCommonTenantSetting(dto: CommonSettingDto, context: { invokeContext: IInvoke }): Promise<CommandModel>`
システム全体で共有される共通のテナント設定を作成します。
```ts
const masterSetting = await this.masterSettingService.createCommonTenantSetting(
  {
    name: "common setting",
    code: "service",
    settingValue: {
      region: "US",
      plan: "common"
    }
  },
  { invokeContext }
);
```

#### `createTenantSetting(dto: TenantSettingDto, context: { invokeContext: IInvoke }): Promise<CommandModel>`
テナント固有の設定を作成します。
```ts
const masterSetting = await this.masterSettingService.createTenantSetting(
  {
    name: "tenant setting",
    code: "service",
    tenantCode: "mbc",
    settingValue: {
      region: "US",
      plan: "tenant"
    }
  },
  { invokeContext }
);
```

#### `createGroupSetting(dto: GroupSettingDto, context: { invokeContext: IInvoke }): Promise<CommandModel>`
テナント内でグループ固有の設定を作成します。
```ts
const masterSetting = await this.masterSettingService.createGroupSetting(
  {
    name: "group setting",
    code: "service",
    tenantCode: "mbc",
    groupId: "12",
    settingValue: {
      region: "US",
      plan: "USER"
    }
  },
  { invokeContext }
);
```
#### `createUserSetting(dto: UserSettingDto, context: { invokeContext: IInvoke }): Promise<CommandModel>`
テナント内でユーザー固有の設定を作成します。
```ts
const masterSetting = await this.masterSettingService.createUserSetting(
  {
    name: "user setting",
    code: "service",
    tenantCode: "mbc",
    userId: "92ca4f68-9ac6-4080-9ae2-2f02a86206a4",
    settingValue: {
      region: "US",
      plan: "USER"
    }
  },
  { invokeContext }
);
```


#### `updateSetting(params: DetailKey, dto: UpdateSettingDto, context: { invokeContext: IInvoke }): Promise<CommandModel>`
既存の設定を更新します。
```ts
const masterSetting = await this.masterSettingService.updateSetting(
  {
    pk: "MASTER#abc",
    sk: "MASTER_SETTING#service"
  },
  {
    name: 'Example Master Setting',
    settingValue: {
      homepage: "url",
      desc: "string"
    }
  },
  { invokeContext }
);
```

#### `deleteSetting(key: DetailKey, context: { invokeContext: IInvoke }): Promise<CommandModel>`
指定されたキーに基づいて特定の設定を削除します。
```ts
const masterSetting = await this.masterSettingService.deleteSetting(
  {
    pk: "MASTER#abc",
    sk: "MASTER_SETTING#service"
  },
  { invokeContext }
);
```

#### `list(searchDto: MasterSettingSearchDto, invokeContext: IInvoke): Promise<MasterRdsListEntity>`
ページネーションとフィルタリングでマスター設定をリストします。RDS（Prisma）の設定が必要です。
```ts
const result = await this.masterSettingService.list(
  {
    name: "service",           // 名前の部分一致
    code: "SVC",               // コードの部分一致
    keyword: "description",    // attributes.description内を検索
    page: 1,
    pageSize: 10,
    orderBys: ["-createdAt"],
  },
  invokeContext
);
```

#### `getDetail(key: DetailDto): Promise<MasterRdsEntity>`
詳細なマスター設定を取得します。見つからない場合はNotFoundExceptionをスローします。
```ts
const masterSetting = await this.masterSettingService.getDetail({
  pk: "MASTER#mbc",
  sk: "MASTER_SETTING#service"
});
```

#### `create(createDto: CommonSettingDto, invokeContext: IInvoke): Promise<CommandModel>`
新しいテナント設定を作成します。コンテキストからテナントコードを自動抽出するcreateTenantSettingのラッパーです。
```ts
const masterSetting = await this.masterSettingService.create(
  {
    code: "service",
    name: "Service Setting",
    settingValue: { key: "value" }
  },
  invokeContext
);
```

#### `createBulk(createDto: CommonSettingBulkDto, invokeContext: IInvoke): Promise<CommandModel[]>`
複数の設定を一度に作成します。

:::warning 新規作成のみの操作
`createBulk`は内部的に各アイテムに対して`create`を呼び出します。設定が既に存在する場合（例: `"Setting already exists: {code}"`）、`BadRequestException`をスローします。このメソッドは既存の設定の更新には使用できません。upsert動作（作成または更新）が必要な場合は、以下の[Upsertパターン](#upsert-pattern)セクションを参照してください。
:::

```ts
const settings = await this.masterSettingService.createBulk(
  {
    items: [
      { code: "setting1", name: "Setting 1", settingValue: {} },
      { code: "setting2", name: "Setting 2", settingValue: {} }
    ]
  },
  invokeContext
);
```

#### `update(key: DetailDto, updateDto: MasterSettingUpdateDto, invokeContext: IInvoke): Promise<CommandModel>`
マスター設定を更新します。
```ts
const result = await this.masterSettingService.update(
  { pk: "MASTER#mbc", sk: "MASTER_SETTING#service" },
  {
    name: "Updated Setting",
    attributes: { newKey: "newValue" }
  },
  invokeContext
);
```

#### `delete(key: DetailDto, invokeContext: IInvoke): Promise<CommandModel>`
マスター設定を削除します。deleteSettingのラッパーです。
```ts
await this.masterSettingService.delete(
  { pk: "MASTER#mbc", sk: "MASTER_SETTING#service" },
  invokeContext
);
```

#### `checkExistCode(code: string, invokeContext: IInvoke): Promise<boolean>`
現在のテナントに設定コードが既に存在するかどうかを確認します。
```ts
const exists = await this.masterSettingService.checkExistCode("service", invokeContext);
if (exists) {
  // 重複コードの処理
}
```

#### `copy(masterCopyDto: MasterCopyDto, opts: { invokeContext: IInvoke }): Promise<any>`
Step Functionsを使用して、マスター設定とデータを他のテナントに非同期でコピーします。既存のマスターデータで新しいテナントを初期化するのに便利です。
```ts
const task = await this.masterSettingService.copy(
  {
    masterSettingId: "MASTER#mbc#MASTER_SETTING#service",
    targetTenants: ["tenant1", "tenant2"],
    copyType: CopyType.BOTH,   // CopyType.SETTING_ONLY、CopyType.DATA_ONLY、またはCopyType.BOTH
    dataCopyOption: {
      mode: DataCopyMode.ALL,  // またはDataCopyMode.PARTIAL
      // id: ["id1", "id2"]    // modeがPARTIALの場合は必須
    }
  },
  { invokeContext }
);
// タスクエンティティを返します - コピー操作は非同期で実行されます
```

コピータイプ:
- `CopyType.SETTING_ONLY`: 設定のみをコピー
- `CopyType.DATA_ONLY`: データのみをコピー
- `CopyType.BOTH`: 設定とデータの両方をコピー

データコピーモード（copyTypeがDATA_ONLYまたはBOTHの場合に使用）:
- `DataCopyMode.ALL`: 設定下のすべてのマスターデータをコピー
- `DataCopyMode.PARTIAL`: 指定されたIDのみをコピー

### マスターデータサービス
MasterDataService サービスは、マスターデータと操作を管理するためのメソッドを提供します。これには、リスト、取得、作成、更新、削除、および特定のコードの存在確認が含まれます。

#### `list(searchDto: MasterDataSearchDto): Promise<MasterDataListEntity>`
指定された検索条件に基づいてマスターデータをリストします。注: このメソッドはinvokeコンテキストを必要としません。
```ts
const masterData = await this.masterDataService.list({
  tenantCode: "mbc",
  settingCode: "service"
});
```

#### `get(key: DetailDto): Promise<MasterDataEntity>`
主キー (pk) およびソートキー (sk) によるマスターデータの取得。

```ts
const masterData = await this.masterDataService.get(
  {
    pk:"MASTER#abc", 
    sk:"MASTER_DATA#service#01"
  }
);
```

  
#### `create(data: CreateMasterDataDto, context: { invokeContext: IInvoke }): Promise<MasterDataEntity>`

新しいマスターデータエンティティを作成します。

```ts
const masterData = await this.masterDataService.create(
  {
    code: 'MASTER001',
    name: 'Example Master Data',
    settingCode: "service",
    tenantCode: "common",
    attributes: {
      homepage: "http://mbc.com",
      desc: "description for mbc"
    }
  },
  { invokeContext }
);
```

#### `update(key: DetailDto, updateDto: UpdateDataSettingDto, context: { invokeContext: IInvoke }): Promise<MasterDataEntity>`
既存のマスターデータを更新します。

```ts
const masterData = await this.masterDataService.update(
  {
    pk: "MASTER#abc",
    sk: "MASTER_DATA#service#01"
  },
  {
    name: 'Example Master Data',
    attributes: {
      homepage: "http://mbc.com",
      desc: "description for mbc"
    }
  },
  { invokeContext }
);
```


#### `delete(key: DetailDto, opts: { invokeContext: IInvoke }): Promise<MasterDataEntity>`
指定されたキーに基づいて特定のマスターデータを削除します。
```ts
const masterData = await this.masterDataService.delete(
  {
    pk: "MASTER#abc",
    sk: "MASTER_DATA#service#01"
  },
  { invokeContext }
);
```

#### `checkExistCode(tenantCode: string, type: string, code: string): Promise<boolean>`
指定されたテナントとタイプ内で特定のコードが存在するかどうかを確認します。

```ts
const exists = await this.masterDataService.checkExistCode("mbc", "service", "01");
if (exists) {
  // 既存コードの処理
}
```

#### `getDetail(key: DetailDto): Promise<MasterRdsEntity>`
関連情報を含む詳細なマスターデータを取得します。見つからない場合はNotFoundExceptionをスローします。

```ts
const masterData = await this.masterDataService.getDetail({
  pk: "MASTER#mbc",
  sk: "MASTER_DATA#service#01"
});
```

#### `createSetting(createDto: MasterDataCreateDto, invokeContext: IInvoke): Promise<MasterDataEntity>`
新しいマスターデータエンティティを作成します。シーケンスが指定されていない場合は自動生成されます。

:::warning 新規作成のみの操作
`createSetting`はマスターデータが既に存在する場合（例: `"Master data already exists: {code}"`）、`BadRequestException`をスローします。upsert動作（作成または更新）が必要な場合は、以下の[Upsertパターン](#upsert-pattern)セクションを参照してください。
:::

```ts
const masterData = await this.masterDataService.createSetting(
  {
    code: 'MASTER001',
    name: 'Example Master Data',
    settingCode: "service",
    tenantCode: "mbc",
    attributes: {
      homepage: "http://mbc.com",
      desc: "description for mbc"
    }
  },
  invokeContext
);
```

#### `createBulk(createDto: MasterDataCreateBulkDto, invokeContext: IInvoke): Promise<MasterDataEntity[]>`
複数のマスターデータエンティティを一括作成します。

:::warning 新規作成のみの操作
`createBulk`は内部的に各アイテムに対して`createSetting`を呼び出します。既に存在するアイテムがある場合、`BadRequestException`をスローします。upsert動作が必要な場合は、以下の[Upsertパターン](#upsert-pattern)セクションを参照してください。
:::

```ts
const masterDataList = await this.masterDataService.createBulk(
  {
    items: [
      {
        code: 'MASTER001',
        name: 'First Master Data',
        settingCode: "service",
        tenantCode: "mbc",
        attributes: {}
      },
      {
        code: 'MASTER002',
        name: 'Second Master Data',
        settingCode: "service",
        tenantCode: "mbc",
        attributes: {}
      }
    ]
  },
  invokeContext
);
```

#### `updateSetting(key: DetailDto, updateDto: MasterDataUpdateDto, invokeContext: IInvoke): Promise<MasterDataEntity>`
既存のマスターデータエンティティを更新します。

```ts
const masterData = await this.masterDataService.updateSetting(
  {
    pk: "MASTER#mbc",
    sk: "MASTER_DATA#service#01"
  },
  {
    name: 'Updated Master Data',
    attributes: {
      homepage: "http://updated-mbc.com"
    }
  },
  invokeContext
);
```

#### `deleteSetting(key: DetailDto, invokeContext: IInvoke): Promise<MasterDataEntity>`
キーでマスターデータエンティティを削除します。

```ts
const result = await this.masterDataService.deleteSetting(
  {
    pk: "MASTER#mbc",
    sk: "MASTER_DATA#service#01"
  },
  invokeContext
);
```

#### `listByRds(searchDto: CustomMasterDataSearchDto, context: { invokeContext: IInvoke }): Promise<MasterRdsListEntity>`
フィルタリングとページネーションでRDS内のマスターデータを検索します。このメソッドはPrismaサービスが設定されている場合に使用されます。

```ts
const result = await this.masterDataService.listByRds(
  {
    settingCode: "service",    // マスタータイプコードの完全一致
    keyword: "example",        // 名前の部分一致（大文字小文字を区別しない）
    code: "001",               // マスターコードの部分一致（大文字小文字を区別しない）
    page: 1,
    pageSize: 10,
    orderBys: ["seq", "masterCode"],
  },
  { invokeContext }
);
```

##### 検索パラメータ {#search-parameters}

| パラメータ | 型 | 必須 | マッチタイプ | 説明 |
|---------------|----------|--------------|----------------|-----------------|
| `settingCode` | `string` | いいえ | 完全一致 | マスタータイプコード（masterTypeCode）でフィルタ |
| `keyword` | `string` | いいえ | 部分一致（大文字小文字を区別しない） | 名前フィールドでフィルタ |
| `code` | `string` | いいえ | 部分一致（大文字小文字を区別しない） | マスターコードでフィルタ |
| `page` | `number` | いいえ | - | ページ番号（デフォルト: 1） |
| `pageSize` | `number` | いいえ | - | 1ページあたりの項目数（デフォルト: 10） |
| `orderBys` | `string[]` | いいえ | - | ソート順（デフォルト: ["seq", "masterCode"]） |
| `isDeleted` | `boolean` | いいえ | 完全一致 | 削除ステータスでフィルタ |

:::warning 既知の問題（v1.0.17で修正済み）
v1.0.17より前のバージョンでは、`settingCode` パラメータが誤って完全一致ではなく部分一致（`contains`）を使用していました。これにより意図しない検索結果が返される問題がありました。例えば、「PRODUCT」を検索すると「PRODUCT_TYPE」や「MY_PRODUCT」も返されていました。

v1.0.16以前をご使用で、`settingCode` の完全一致が必要な場合は、v1.0.17以降にアップグレードしてください。

参照： [変更履歴 v1.0.17](./changelog#v1017)
:::

## ビルトインUpsert API {#upsert-pattern}

フレームワークは、新規レコードの作成と既存レコードの更新の両方を自動的に処理するビルトインupsertメソッドを提供します。これらのメソッドはDynamoDBで既存データを確認し、作成または更新を判断し、変更のないレコードはスキップして効率化します。

:::info バージョンノート
ビルトインupsertメソッド（`upsert`、`upsertBulk`、`upsertSetting`、`upsertTenantSetting`）は[バージョン1.1.2](/docs/changelog#v112)で追加されました。それ以前のバージョンでは、カスタムupsertロジックの実装が必要です（下記の[レガシーUpsertパターン](#legacy-upsert-pattern)を参照）。
:::

### MasterSettingService Upsertメソッド

#### `upsertTenantSetting(dto: TenantSettingDto, options: { invokeContext: IInvoke }): Promise<CommandModel>`
テナント設定を作成または更新します。設定が存在し変更がある場合は更新します。設定が存在するが変更がない場合は、新しいコマンドを作成せずに既存のデータを返します。設定が削除されている場合は再作成します。

```ts
const result = await this.masterSettingService.upsertTenantSetting(
  {
    tenantCode: "mbc",
    code: "service",
    name: "Service Setting",
    settingValue: { region: "US", plan: "Premium" },
  },
  { invokeContext }
);
```

#### `upsertSetting(createDto: CommonSettingDto, invokeContext: IInvoke): Promise<CommandModel>`
コンテキストからテナントコードを自動抽出する`upsertTenantSetting`のラッパーです。

```ts
const result = await this.masterSettingService.upsertSetting(
  {
    code: "service",
    name: "Service Setting",
    settingValue: { region: "US", plan: "Premium" },
  },
  invokeContext
);
```

#### `upsertBulk(createDto: CommonSettingBulkDto, invokeContext: IInvoke): Promise<CommandModel[]>`
複数の設定を順次upsertします。レースコンディションを回避するため、アイテムは1つずつ処理されます。

```ts
const results = await this.masterSettingService.upsertBulk(
  {
    items: [
      { code: "setting1", name: "Setting 1", settingValue: { key: "value1" } },
      { code: "setting2", name: "Setting 2", settingValue: { key: "value2" } },
    ]
  },
  invokeContext
);
```

### MasterDataService Upsertメソッド

#### `upsert(createDto: CreateMasterDataDto, opts: { invokeContext: IInvoke }): Promise<MasterDataEntity>`
マスターデータエンティティを作成または更新します。`create`と同じ動作ですが、レコードが既に存在する場合にエラーをスローしません。

```ts
const result = await this.masterDataService.upsert(
  {
    code: 'MASTER001',
    name: 'Example Master Data',
    settingCode: "service",
    tenantCode: "mbc",
    attributes: { homepage: "http://mbc.com" },
  },
  { invokeContext }
);
```

#### `upsertSetting(createDto: MasterDataCreateDto, invokeContext: IInvoke): Promise<MasterDataEntity>`
自動シーケンス生成とテナントコード抽出を備えた`upsert`のラッパーです。

```ts
const result = await this.masterDataService.upsertSetting(
  {
    code: 'MASTER001',
    name: 'Example Master Data',
    settingCode: "service",
    attributes: { homepage: "http://mbc.com" },
  },
  invokeContext
);
```

#### `upsertBulk(createDto: MasterDataCreateBulkDto, invokeContext: IInvoke): Promise<MasterDataEntity[]>`
複数のマスターデータエンティティを順次upsertします。seqのレースコンディションを回避するため、アイテムは1つずつ処理されます。

```ts
const results = await this.masterDataService.upsertBulk(
  {
    items: [
      { code: 'DATA001', name: 'First Data', settingCode: "service", attributes: {} },
      { code: 'DATA002', name: 'Second Data', settingCode: "service", attributes: {} },
    ]
  },
  invokeContext
);
```

### 統合バルクUpsert API（MasterBulkController） {#unified-bulk-upsert}

コントローラーが有効（`enableController: true`）の場合、フレームワークは設定とデータの両方を1つのリクエストで処理できる統合`/api/master-bulk/`エンドポイントを提供します。アイテムは`settingCode`の有無に基づいてルーティングされます：

- **`settingCode`あり**: `MasterDataService.upsertBulk`にルーティング
- **`settingCode`なし**: `MasterSettingService.upsertBulk`にルーティング

```ts
// POST /api/master-bulk/
const requestBody = {
  items: [
    // This item has settingCode → treated as master data (settingCodeあり → マスターデータとして扱う)
    {
      name: "Data Item",
      code: "DATA001",
      settingCode: "UserList",
      seq: 1,
      attributes: { field: "value" },
    },
    // This item has no settingCode → treated as master setting (settingCodeなし → マスター設定として扱う)
    {
      name: "Setting Item",
      code: "SettingA",
      attributes: { description: "A setting" },
    },
  ]
};
```

レスポンスは元の入力順序を保持します。テナントコードバリデーションが適用されます：アイテムに`tenantCode`が指定されている場合、認証ユーザーのテナントと一致する必要があります。

#### リクエストボディ

| フィールド | 型 | 必須 | 説明 |
|-----------|----------|--------------|-----------------|
| `items` | `MasterBulkItemDto[]` | はい | upsertするアイテムの配列（最大100件） |

#### MasterBulkItemDto

| フィールド | 型 | 必須 | 説明 |
|-----------|----------|--------------|-----------------|
| `name` | `string` | はい | 設定またはデータの名前 |
| `code` | `string` | はい | 設定またはデータのコード |
| `tenantCode` | `string` | いいえ | テナントコード（指定する場合は認証ユーザーのテナントと一致する必要があります） |
| `settingCode` | `string` | いいえ | 存在する場合はマスターデータ、存在しない場合はマスター設定として扱われます |
| `seq` | `number` | いいえ | ソート順序（マスターデータで使用） |
| `attributes` | `object` | はい | 属性オブジェクト。設定の場合、settingValueとして使用されます |

### Upsert動作の詳細 {#upsert-behavior}

upsertメソッドは以下のルールに従います：

1. **新規レコード**: 既存レコードが見つからない場合、新規作成します（バージョンは0から開始）
2. **変更のある既存レコード**: レコードが存在し入力が異なる場合、既存のバージョン番号を使用して更新します
3. **変更のない既存レコード**: レコードが存在し入力が同一の場合、更新をスキップして既存データを返します
4. **削除済みレコード**: レコードが存在するが削除マーク（`isDeleted: true`）の場合、既存のバージョン番号を使用して再作成します

### レガシーUpsertパターン {#legacy-upsert-pattern}

:::warning 非推奨パターン
The custom upsert pattern below was required in versions prior to 1.1.2. For new projects, use the [built-in upsert methods](#upsert-pattern) instead.
:::

For versions prior to 1.1.2, implement a custom upsert service that checks for existing records before deciding whether to call create or update. See the [v1.1.1 documentation](https://github.com/mbc-net/mbc-cqrs-serverless/tree/v1.1.1) for the full legacy pattern.
