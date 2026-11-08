---
description: CommandModuleとCommandServiceを使用してコマンドを発行・管理する方法を学びます。
---

# CommandService

## 概要 {#overview}

「CommandService」は、コマンドの管理と同期を容易にするフレームワークのコアコンポーネントです。主に、完全なコマンドと部分的なコマンドの両方を発行する方法を提供し、それらの処理を同期または非同期で行うことができるため、システム内のコマンド処理の全体的な効率と柔軟性が向上します。

## CommandModule設定 {#commandmodule-configuration}

![CommandModule構造](./images/CommandModule.png)

`CommandModule`は、データ同期ハンドラーを登録し、テーブル名に関連付けられたサービスを提供するために使用される動的モジュールです。このモジュールをインポートする際は、特定のオプションを指定する必要があります。

### 登録オプション

| プロパティ                  | 説明                                                      |
| ----------------------------- | -------------------------------------------------------------------- |
| `tableName: string`           | テーブル名を指定                                               |
| `skipError?: boolean`         | 将来の使用のために予約済み。未実装です。                    |
| `dataSyncHandlers?: Type<IDataSyncHandler>[]` | データ同期ハンドラーを登録                         |
| `disableDefaultHandler?: boolean` | `true`に設定すると、デフォルトのDynamoDBデータ同期ハンドラーを無効にします|

### 登録例

```typescript
import { CommandModule } from '@mbc-cqrs-serverless/core';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    CommandModule.register({
      tableName: 'cat',
      dataSyncHandlers: [CatDataSyncRdsHandler],
    }),
  ],
})
export class CatModule {}
```

ここでは、`CommandModule`を`cat`テーブル名で登録し、`CatDataSyncRdsHandler`をデータ同期ハンドラーに提供しています。

## CommandServiceの使用 {#using-commandservice}

以下のメソッドの例では、次のように `CommandModule` をモジュールにインポートすると仮定します。

```ts
import { CommandModule } from "@mbc-cqrs-serverless/core";
import { Module } from "@nestjs/common";

import { CatDataSyncRdsHandler } from "./handler/cat-rds.handler";
import { CatController } from "./cat.controller";
import { CatService } from "./cat.service";

@Module({
  imports: [
    CommandModule.register({
      tableName: "cat",
      dataSyncHandlers: [CatDataSyncRdsHandler],
    }),
  ],
  controllers: [CatController],
  providers: [CatService],
})
export class CatModule {}
```

これで、`CommandService` と `DataService` を他のサービスに挿入して使用できるようになります。

:::tip 実装パターンについて
CommandServiceを使用した完全なCRUD実装パターンについては、[Service実装パターン](/docs/service-patterns)を参照してください。
:::

## メソッド {#methods}

### *async* `publishAsync(input: CommandInputModel, options: ICommandOptions): Promise<CommandModel | null>` {#publishasync}

このメソッドを使用すると、コマンド データが **command** テーブルに挿入されるため、完全なコマンドを公開できます。

このメソッドはコマンド データをすぐに返すことによって即時フィードバックを提供するため、コマンドの処理を待たずに続行できます。その後、コマンドはバックグラウンドで非同期に処理され、処理中もアプリケーションの応答性が維持されます。

**戻り値:** `Promise<CommandModel | null>` を返します — 成功時はCommandModel、コマンドがdirtyでない場合（既存のコマンドと比較して変更が検出されない場合）は`null`を返します。

たとえば、次のように新しい cat コマンドを発行できます。

```ts
import { basename } from 'path';
import {
  generateId,
  getCommandSource,
  VERSION_FIRST,
} from "@mbc-cqrs-serverless/core";

// class CatCommandDto extends CommandDto {}

const catCommand = new CatCommandDto({
  pk: catPk,
  sk: catSk,
  tenantCode,
  id: generateId(catPk, catSk),
  code,
  type: "CAT",
  name: attributes.name,
  version: VERSION_FIRST,
  attributes,
});

const commandSource = getCommandSource(
  basename(__dirname),
  this.constructor.name,
  "createCatCommand"
);

const item = await this.commandService.publishAsync(catCommand, {
  source: commandSource,
  invokeContext,
});
```

### *async* `publishPartialUpdateAsync( input: CommandPartialInputModel, options: ICommandOptions): Promise<CommandModel | null>` {#publishpartialupdateasync}

この方法を使用すると、同じ `pk` および `sk` (主キー) 値を持つ前のコマンドに基づいて新しいコマンド データを作成できます。

`publishAsync` メソッドと同様に、このメソッドはコマンドの処理を待たずに、更新されたコマンド データをすぐに返します。

**戻り値:** `Promise<CommandModel | null>` を返します — 成功時はCommandModel、コマンドがdirtyでない場合（既存の部分コマンドと比較して変更が検出されない場合）は`null`を返します。

たとえば、猫の名前を更新したいとします。

```ts
import { basename } from 'path';
import { generateId, getCommandSource } from "@mbc-cqrs-serverless/core";

// ...

const catCommand: CommandPartialInputModel = {
  pk: catPk,
  sk: catSk,
  version: storedItem.version,
  name: attributes.name,
};

const commandSource = getCommandSource(
  basename(__dirname),
  this.constructor.name,
  "updateCatCommand"
);

const item = await this.commandService.publishPartialUpdateAsync(catCommand, {
  invokeContext,
});
```

### *async* `publishSync( input: CommandInputModel, options: ICommandOptions): Promise<CommandModel | null>` {#publishsync-audit-trail}

このメソッドは、`publishAsync` メソッドに相当する同期メソッドとして機能します。つまり、コマンドが完全に処理されるまでコードの実行を停止します。これにより、コード内で以降の操作を続行する前にコマンドの結果を確実に受け取ることができます。

:::danger 破壊的変更 (v1.2.0)
[v1.2.0](/docs/changelog#v120)以降、`publishSync()`と`publishPartialUpdateSync()`はコマンドに変更がない場合（no-op）に`null`を返します。プロパティにアクセスする前に必ずnullチェックを行ってください：

```ts
const result = await this.commandService.publishSync(command, { invokeContext });
if (!result) return; // no-op: command was not dirty, nothing was written (no-op: コマンドに変更なし、何も書き込まれていません)
console.log(result.pk); // safe after null check (nullチェック後は安全)
```
:::

:::info バージョンノート (v1.1.4+)
[v1.1.4](/docs/changelog#v114)以降、`publishSync`は非同期パイプラインと同等の完全な監査証跡を書き込みます：
- `syncMode: 'SYNC'`マーカー付きの不変イベントがCommandテーブルに書き込まれます
- Historyテーブルにデータが書き込まれ、完全なイベントソーシングの一致が実現されます
- コマンドライフサイクル: `publish_sync:STARTED` → `finish:FINISHED`（エラー時は`publish_sync:FAILED`）
- コマンドに変更がない場合は`null`を返します（`publishAsync`の動作と同一）
- DynamoDB Streamフィルターが`syncMode=SYNC`レコードを除外し、Step Functionsの二重実行を防止

v1.1.4以前は、`publishSync`はStep Functionsのトリガーを避けるためCommandテーブルをバイパスしており、監査証跡の欠落とHistoryテーブルへの書き込みがない状態でした。
:::

:::warning 既知の問題（v1.3.2 で修正）
v1.3.2 以前の `publishSync` には 2 つのバグがありました: ハンドラーディスパッチ前にバージョン付き `sk` が `command.sk` に代入されておらず（`IDataSyncHandler.up()` が誤ったソートキーを受け取っていた）、`updateStatus` のエラーがサイレントにマスクされていました。

参照: [変更履歴 v1.3.2](/docs/changelog#v132)
:::

変更が検出されない場合は`null`を返します（ダーティチェック最適化）。

例えば

```ts
import {
  generateId,
  getCommandSource,
  VERSION_FIRST,
} from "@mbc-cqrs-serverless/core";

// class CatCommandDto extends CommandDto {}

const catCommand = new CatCommandDto({
  pk: catPk,
  sk: catSk,
  tenantCode,
  id: generateId(catPk, catSk),
  code,
  type: "CAT",
  name: attributes.name,
  version: VERSION_FIRST,
  attributes,
});

const commandSource = getCommandSource(
  basename(__dirname),
  this.constructor.name,
  "createCatCommandSync"
);

const item = await this.commandService.publishSync(catCommand, {
  source: commandSource,
  invokeContext,
});
```

### *async* `publishPartialUpdateSync( input: CommandPartialInputModel, options: ICommandOptions): Promise<CommandModel | null>`

このメソッドは、`publishPartialUpdateAsync` メソッドの同期バージョンです。コマンドが処理されるまでコードの実行がブロックされます。

:::danger 破壊的変更 (v1.2.0)
[v1.2.0](/docs/changelog#v120)以降、このメソッドはコマンドに変更がない場合（no-op）に`null`を返します。結果を必ずnullチェックしてください。詳細は[publishSync null return](/docs/command-service#publishsync-audit-trail)を参照。
:::

:::warning バージョンマッチング
このメソッドでは、入力の `version` フィールドが既存アイテムの現在のバージョンと一致する必要があります。アイテムが見つからないかバージョンが一致しない場合、「Invalid input: item not found or version mismatch」というメッセージで `BadRequestException` がスローされます（v1.0.25 より前のバージョンではメッセージは「The input is not a valid, item not found or version not match」でした）。
:::

たとえば、猫の名前を更新したいとします。

```ts
import { basename } from 'path';
import { generateId, getCommandSource } from "@mbc-cqrs-serverless/core";

// ...

const catCommand: CommandPartialInputModel = {
  pk: catPk,
  sk: catSk,
  version: storedItem.version,
  name: attributes.name,
};

const commandSource = getCommandSource(
  basename(__dirname),
  this.constructor.name,
  "updateCatCommandSync"
);

const item = await this.commandService.publishPartialUpdateSync(catCommand, {
  source: commandSource,
  invokeContext,
});
```

### *async* `publish(input: CommandInputModel, options: ICommandOptions): Promise<CommandModel | null>` <span class="badge badge--danger">削除済み</span>

:::danger v1.1.0で削除

このメソッドは[v1.1.0](/docs/changelog#v110)で削除されました。代わりに[`publishAsync`メソッド](#publishasync)を使用してください。

:::

たとえば、次のように新しい cat コマンドを発行できます。

```ts
import { basename } from 'path';
import {
  generateId,
  getCommandSource,
  VERSION_FIRST,
} from "@mbc-cqrs-serverless/core";

// class CatCommandDto extends CommandDto {}

const catCommand = new CatCommandDto({
  pk: catPk,
  sk: catSk,
  tenantCode,
  id: generateId(catPk, catSk),
  code,
  type: "CAT",
  name: attributes.name,
  version: VERSION_FIRST,
  attributes,
});

const commandSource = getCommandSource(
  basename(__dirname),
  this.constructor.name,
  "createCatCommand"
);

const item = await this.commandService.publish(catCommand, {
  source: commandSource,
  invokeContext,
});
```

このメソッドはコマンド データを返します。

### *async* `publishPartialUpdate( input: CommandPartialInputModel, options: ICommandOptions): Promise<CommandModel | null>` <span class="badge badge--danger">削除済み</span>

:::danger v1.1.0で削除

このメソッドは[v1.1.0](/docs/changelog#v110)で削除されました。代わりに[`publishPartialUpdateAsync`メソッド](#publishpartialupdateasync)を使用してください。

:::

この方法では、以前のコマンドに基づいて新しいコマンド データを作成できます。

たとえば、猫の名前を更新したいとします。

```ts
import { basename } from 'path';
import { generateId, getCommandSource } from "@mbc-cqrs-serverless/core";

// ...

const catCommand: CommandPartialInputModel = {
  pk: catPk,
  sk: catSk,
  version: storedItem.version,
  name: attributes.name,
};

const commandSource = getCommandSource(
  basename(__dirname),
  this.constructor.name,
  "updateCatCommand"
);

const item = await this.commandService.publishPartialUpdate(catCommand, {
  source: commandSource,
  invokeContext,
});
```

このメソッドは更新されたコマンド データを返します。

### *async* `reSyncData(): Promise<void>`

データ同期ハンドラーを再適用する場合は、このメソッドを使用できるように設計されています。次のように関数を呼び出すだけです。

```ts
await this.commandService.reSyncData();
```

### *async* `getItem(key: DetailKey): Promise<CommandModel | null>`

プライマリキーでコマンドアイテムを取得します。ソートキーにバージョン区切り文字（`@`、例：`CAT#cat001@2`）が含まれていない場合、自動的に`getLatestItem`を呼び出して最新バージョンを取得します。アイテムが見つからない場合は`null`を返します。

```ts
import { DetailKey } from "@mbc-cqrs-serverless/core";

// Get a specific version of a command (特定バージョンのコマンドを取得)
const command = await this.commandService.getItem({
  pk: "CAT#tenant1",
  sk: "CAT#cat001@2", // Includes version number (バージョン番号を含む)
});

// If no version in sk, automatically gets latest version (skにバージョンがない場合、自動的に最新バージョンを取得)
const latestCommand = await this.commandService.getItem({
  pk: "CAT#tenant1",
  sk: "CAT#cat001",
});
```

### *async* `getLatestItem(key: DetailKey): Promise<CommandModel | null>`

プライマリキーでコマンドアイテムの最新バージョンを取得します。このメソッドは、データテーブルのバージョンから開始し、最新のコマンドバージョンを見つけるために上下に検索するルックアップアルゴリズムを使用します。アイテムが見つからない場合は`null`を返します。

```ts
import { DetailKey } from "@mbc-cqrs-serverless/core";

const latestCommand = await this.commandService.getLatestItem({
  pk: "CAT#tenant1",
  sk: "CAT#cat001", // Sort key without version (バージョンなしのソートキー)
});

if (latestCommand) {
  console.log(`Latest version: ${latestCommand.version}`);
}
```

### *async* `getNextCommand(currentKey: DetailKey): Promise<CommandModel | undefined>`

現在のコマンドのキーに基づいて、次のバージョンのコマンドを取得します。次のバージョンが存在しない場合は`undefined`を返します。コマンドチェーンの処理やリトライロジックの実装に役立ちます。

```ts
import { DetailKey } from "@mbc-cqrs-serverless/core";

const currentKey: DetailKey = {
  pk: "CAT#tenant1",
  sk: "CAT#cat001@2",
};

const nextCommand = await this.commandService.getNextCommand(currentKey);
// Returns command with sk: "CAT#cat001@3" if it exists, otherwise undefined (存在する場合はsk: "CAT#cat001@3"のコマンドを返し、存在しない場合はundefined)
if (nextCommand) {
  // Process the next command (次のコマンドを処理する)
}
```

### *async* `updateStatus(key: DetailKey, status: string, notifyId?: string): Promise<void>`

コマンドのステータスを更新し、SNS通知を送信します。これは、タスクやプロセスのステータスを更新し、変更をサブスクライバーに通知するために一般的に使用されます。

```ts
import { DetailKey } from "@mbc-cqrs-serverless/core";

const key: DetailKey = {
  pk: "CAT#tenant1",
  sk: "CAT#cat001@1",
};

// Update status and send SNS notification (ステータスを更新してSNS通知を送信)
await this.commandService.updateStatus(key, "COMPLETED");

// With custom notification ID (カスタム通知IDを指定)
await this.commandService.updateStatus(key, "FAILED", "custom-notify-id");
```

SNS通知ペイロードには以下が含まれます：
- `action`: `"command-status"`
- `pk`, `sk`: コマンドキー
- `table`: コマンドテーブル名
- `id`: 通知ID（カスタムまたは自動生成）
- `tenantCode`: pkから抽出
- `content`: `status`と`source`を含むオブジェクト

### *async* `duplicate(key: DetailKey, options: ICommandOptions): Promise<CommandModel>`

既存のコマンドをバージョン番号を増加させて複製します。複製されたコマンドは`source`が`"duplicated"`に設定され、メタデータ（タイムスタンプ、ユーザー、IP）が更新されます。

```ts
import { DetailKey, getCommandSource } from "@mbc-cqrs-serverless/core";
import { basename } from "path";

const key: DetailKey = {
  pk: "CAT#tenant1",
  sk: "CAT#cat001@1",
};

const commandSource = getCommandSource(
  basename(__dirname),
  this.constructor.name,
  "duplicateCatCommand"
);

const duplicatedCommand = await this.commandService.duplicate(key, {
  source: commandSource,
  invokeContext,
});

// The duplicated command has: (複製されたコマンドの内容:)
// - version incremented by 1 (- バージョンが1増加)
// - source set to "duplicated" (- sourceが"duplicated"に設定)
// - updated timestamps and user info (- タイムスタンプとユーザー情報が更新)
```

### *async* `updateTaskToken(key: DetailKey, token: string): Promise<CommandModel>` {#updatetasktoken}

コマンドアイテムにAWS Step Functionsタスクトークンを保存します。これは、Step Functionsと統合してコールバックパターンを有効にする際に使用されます。

```ts
import { DetailKey } from "@mbc-cqrs-serverless/core";

const key: DetailKey = {
  pk: "CAT#tenant1",
  sk: "CAT#cat001@1",
};

// Store the Step Functions task token (Step Functionsタスクトークンを保存)
await this.commandService.updateTaskToken(key, event.taskToken);

// Later, use the token to send task success/failure (後でトークンを使用してタスクの成功/失敗を送信)
// via SendTaskSuccessCommand or SendTaskFailureCommand (SendTaskSuccessCommandまたはSendTaskFailureCommandを使用)
```

### *async* `updateTtl(key: DetailKey): Promise<any | null>`

コマンドの前のバージョンのTTL（Time To Live）を更新します。これは通常、コマンド履歴の保持を管理するために内部的に使用されます。バージョンが低すぎるか、前のコマンドが存在しない場合は`null`を返します。

```ts
import { DetailKey } from "@mbc-cqrs-serverless/core";

const key: DetailKey = {
  pk: "CAT#tenant1",
  sk: "CAT#cat001@3", // Version 3 (バージョン3)
};

// Updates TTL of version 2 (previous version) (バージョン2(前のバージョン)のTTLを更新)
const result = await this.commandService.updateTtl(key);
```

:::note
このメソッドは主にフレームワークがコマンド履歴管理のために内部的に使用します。アプリケーションコードでの直接使用はほとんど必要ありません。
:::

### `dataSyncHandlers` (getter): IDataSyncHandler[]

このCommandServiceインスタンスに登録されているデータ同期ハンドラーの配列を返します。ハンドラーをプログラムで検査または反復処理する必要がある場合に便利です。

```ts
// Get all registered data sync handlers (登録済みのすべてのデータ同期ハンドラーを取得)
const handlers = this.commandService.dataSyncHandlers;

handlers.forEach((handler) => {
  console.log(`Handler: ${handler.constructor.name}, Type: ${handler.type}`);
});
```

### `getDataSyncHandler(name: string): IDataSyncHandler | undefined`

クラス名で特定のデータ同期ハンドラーを取得します。指定された名前のハンドラーが見つからない場合は`undefined`を返します。

```ts
// Get a specific handler by name (名前で特定のハンドラーを取得)
const rdsHandler = this.commandService.getDataSyncHandler('CatDataSyncRdsHandler');

if (rdsHandler) {
  // Use the handler directly (ハンドラーを直接使用)
  await rdsHandler.up(commandModel);
}
```

### `isNotCommandDirty(item: CommandModel, input: CommandInputModel): boolean`

既存のコマンドアイテムと新しい入力を比較して、実際に変更があるかどうかを判定します。コマンドがdirtyでない場合（変更なし）は`true`を返し、変更がある場合は`false`を返します。

このメソッドは、変更が検出されない場合に不要な書き込みをスキップするためにpublishメソッド内部で使用されます。publishを呼び出す前に更新で変更が発生するかどうかを直接確認することもできます。

```ts
// Check if an update would result in changes (更新で変更が発生するか確認)
const existingCommand = await this.commandService.getItem({ pk, sk });

if (existingCommand && this.commandService.isNotCommandDirty(existingCommand, newInput)) {
  // No changes detected, skip the update (変更が検出されないため、更新をスキップ)
  console.log('Command has no changes, skipping update');
  return existingCommand;
}

// Proceed with the update (更新を続行)
const result = await this.commandService.publishAsync(newInput, options);
```

### `tableName` (getter/setter): string

このCommandServiceインスタンスのDynamoDBテーブル名を取得または設定します。テーブル名は`CommandModule`を登録する際に設定されますが、必要に応じて実行時に変更することもできます。

```ts
// Get the current table name (現在のテーブル名を取得)
const currentTable = this.commandService.tableName;
console.log(`Operating on table: ${currentTable}`);

// Set a different table name (別のテーブル名を設定)
this.commandService.tableName = 'another-table';
```

:::note
実行時にテーブル名を変更することは高度なユースケースです。ほとんどのアプリケーションでは、`CommandModule.register()`でテーブル名を設定し、その後は変更しないでください。
:::

---

## コマンドアドミッション条件 {#command-admission}

:::info バージョンノート
`getCommandAdmissionConditions` フックとコマンドアドミッションの例外は [バージョン 1.7.0](/docs/changelog#v170) で追加されました。
:::

運用によっては、特定のコマンドの受け付けを一時的に止める必要があります。たとえば、メンテナンス中に他のコマンドは継続させつつ設定の更新だけを凍結する場合です。発行前にメンテナンスゲートを確認するだけでは競合が残ります。確認の後、コマンドが書き込まれる前にゲートが閉じる（さらに再び開く）可能性があるためです。ゲートは別の項目なので、コマンドのバージョンチェックでもこれは検出できません。

アドミッションフックはこの隙間を埋めます。`CommandService` のサブクラスが DynamoDB の `ConditionCheck` エントリを返し、フレームワークがそれらを初回コマンドと同じ `TransactWriteItems` リクエストで書き込みます。コマンドが書き込まれてすべてのチェックが成功するか、何も書き込まれないかのどちらかです。

### フック {#command-admission-hook}

```ts
protected async getCommandAdmissionConditions(
  command: Readonly<CommandModel>,
  options: ICommandOptions,
): Promise<ConditionCheck[]> // ConditionCheck from @aws-sdk/client-dynamodb (@aws-sdk/client-dynamodb の ConditionCheck)
```

- デフォルト実装は空の配列を返します。チェックがない場合、コマンドは従来どおり通常の条件付き `PutItem` で書き込まれます。
- チェックがある場合、`DynamoDbService.putItemWithConditions` は、コマンドの `Put`（`attribute_not_exists(pk) AND attribute_not_exists(sk)` 条件を維持）とそれに続くチェックを含む 1 つの `TransactWriteItems` リクエストを送信します。シリアライズ、大きな属性の S3 オフロード、TTL、履歴、セッションは通常の書き込みと同じように動作します。
- フックは `publishSync`、`publishAsync`、`publishPartialUpdateSync`、`publishPartialUpdateAsync`、`duplicate` で、入力とバージョンの検証の後、初回コマンドの書き込み直前に実行されます。フックはバージョン付きのソートキー（例: `CONFIG#main@13`）を持つコマンドを受け取ります。何も変更しない更新は、フックを呼ばずに返ります。
- ステータス更新、TTL 更新、タスクトークン更新、データ同期ハンドラー、すでに受け付けられたコマンドはフックを呼びません。ゲートを閉じても、すでに受け付けられた処理は拒否されません。
- チェックには DynamoDB の AttributeValue マップを使います。チェックは最大 99 件で、すべてのテーブルが同じアカウント・リージョンにある必要があり、コマンド項目自体を対象にしてはいけません。

### 例: 設定の更新を凍結する {#command-admission-example}

次のサブクラスは、設定コマンド（`CONFIG#` ソートキー）をテナント単位のゲートで保護します。`AdmissionContext` はアプリケーションが所有するプロバイダーで、リクエストが更新内容を読み込んで構築する**前に**ゲートの世代を取得しています。フックは取得済みの witness をチェックに変換するだけで、ゲートを読み直してはいけません。

```ts
import { ConditionCheck } from '@aws-sdk/client-dynamodb';
import { CommandModel, CommandService } from '@mbc-cqrs-serverless/core';
import { Inject, Injectable } from '@nestjs/common';

import { AdmissionContext } from './admission-context';

@Injectable()
export class ConfigurationCommandService extends CommandService {
  @Inject(AdmissionContext)
  private readonly admission: AdmissionContext;

  protected async getCommandAdmissionConditions(
    command: Readonly<CommandModel>,
  ): Promise<ConditionCheck[]> {
    // Decide from the server-owned key, never from a client-supplied flag (クライアントから渡されたフラグではなく、サーバー所有のキーで判定する)
    if (!command.sk.startsWith('CONFIG#')) return [];

    // Witness captured before the update was read and built (更新内容を読み込み・構築する前に取得した witness)
    const witness = this.admission.witness;
    if (!witness) throw new Error('Missing admission witness');

    return [
      {
        TableName: this.admission.gateTableName,
        Key: {
          pk: { S: `TENANT#${witness.tenant}` },
          sk: { S: 'CONFIGURATION_ADMISSION' },
        },
        ConditionExpression: '#active = :active AND #generation = :generation',
        ExpressionAttributeNames: {
          '#active': 'active',
          '#generation': 'generation',
        },
        ExpressionAttributeValues: {
          ':active': { BOOL: true },
          ':generation': { N: String(witness.generation) },
        },
      },
    ];
  }
}
```

ゲートを閉じるときも再び開くときも、それぞれ `generation` を増やす必要があります。これにより、世代 7 を取得したリクエストは、その後ゲートが閉じて再び開いた場合でも拒否されます。

サブクラスは、`CommandModule.register()` が返す**同じ**動的モジュールに登録してください。そうすることで、モジュールのイベントハンドラーと `Repository` もサブクラスを解決します。インポート側のモジュールだけで提供すると、`CommandModule` 内には元の `CommandService` が残ります。

```ts
import { CommandModule, CommandService } from '@mbc-cqrs-serverless/core';
import { DynamicModule } from '@nestjs/common';

import { AdmissionContext } from './admission-context';
import { ConfigurationCommandService } from './configuration-command.service';

export function configurationCommandModule(tableName: string): DynamicModule {
  const registered = CommandModule.register({ tableName });
  return {
    ...registered,
    providers: [
      ...(registered.providers ?? []),
      AdmissionContext,
      // Replace CommandService inside the registered CommandModule (登録した CommandModule 内の CommandService を置き換える)
      { provide: CommandService, useClass: ConfigurationCommandService },
    ],
    exports: [...(registered.exports ?? []), AdmissionContext],
  };
}
```

テスト済みの完全な実装（`AsyncLocalStorage` による witness の取得、テナントのチェック、ゲートの背後でのデータマイグレーション、DynamoDB Local のテスト）については、フレームワークの[コマンドアドミッションガイド](https://github.com/mbc-net/mbc-cqrs-serverless/blob/v1.7.0/docs/development/command-admission.md)と[実行可能なサンプル](https://github.com/mbc-net/mbc-cqrs-serverless/tree/v1.7.0/examples/command-admission)を参照してください。

### 拒否と HTTP レスポンス {#command-admission-errors}

トランザクションがキャンセルされると、フレームワークはキャンセル理由によって分類します。最初に一致した行が適用されます:

| キャンセル理由 | 例外 | HTTP | 呼び出し側の対応 |
|---|---|---|---|
| いずれかのチェックが `ConditionalCheckFailed` | `CommandAdmissionRejectedException` | 409 | 中止する。新たに試行する場合は witness を取得し直し、再読み込みして更新内容を構築し直す |
| コマンドの `Put` が `ConditionalCheckFailed` | `ConditionalCheckFailedException` | 409 | 通常のバージョン競合として扱う: 再読み込みして構築し直す |
| いずれかのエントリが `TransactionConflict` | `CommandAdmissionContentionException` | 503 | 後でリトライする。その場合も witness を取得し直し、構築し直す |
| 上記以外、または理由なし | 元の `TransactionCanceledException` | 500 | サーバーエラーとして扱う |

フレームワークはリトライしません。いずれの結果もコマンドが受け付けられたことを意味しません。新しい 2 つの例外は AWS のエラーを `cause` として保持するため、アプリケーションはこれらを捕捉して、計画メンテナンス中の 503 など別のレスポンスを返せます。[エラーカタログ](/docs/error-catalog#command-admission-rejected)を参照してください。

### IAM 権限 {#command-admission-iam}

トランザクションには、コマンドテーブルに対する `dynamodb:PutItem` と、すべての witness テーブルに対する `dynamodb:ConditionCheckItem` が必要です。v1.7.0 以降、CLI のインフラテンプレートは、名前がスタックのプレフィックスで始まるテーブルに両方を付与します。以前のテンプレートから生成したプロジェクトは `dynamodb:ConditionCheckItem` を自分で追加する必要があります（[CDK インフラストラクチャ](/docs/architecture/cdk-infrastructure#iam-permissions)を参照）。権限がない場合、リクエストは拒否ではなくアクセス拒否エラーで失敗します。

### 注意事項 {#command-admission-caveats}

- **読み込む前に取得する**: 更新内容を読み込んで構築する前に witness を取得し、観測したコマンドのバージョンを保持してください。フックの中で新しい witness を読み込んだり、古いペイロードを新しい世代でリトライしたりしないでください。古い処理を承認することになります。
- **キャパシティ**: トランザクション内のすべての項目は、キャンセルされた場合でも 2 倍の書き込みキャパシティを消費します。チェックの分だけ、保護されたコマンドのコストが増えます。
- **競合（未計測）**: AWS のドキュメントによると、同じ witness 項目を含む同時実行トランザクションは、ゲートが開いている間でも `TransactionConflict` で互いにキャンセルし合う可能性があります。これは DynamoDB サービス上で計測されておらず、DynamoDB Local では再現しません。想定される同時実行数で実環境の負荷テストを行い、競合が多い場合は witness の範囲を狭めてください。ゲートを更新するコントローラーも `TransactionConflictException` でリトライする必要があります。
- **S3 オブジェクト**: 大きな属性はトランザクションの前に S3 にアップロードされるため、拒否されたコマンドは、通常の書き込みが失敗した場合と同様に孤立した S3 オブジェクトを残すことがあります。
- **完全なメンテナンスシステムではない**: フックは認証、メンテナンスのオーケストレーション、受け付け済みコマンドのドレインを実装しません。`CommandService` を経由しない書き込みには別の制御が必要です。
- **ユニットテスト**: `CommandService` は `DynamoDbService.putItemWithConditions` 経由で書き込むようになりました。[ユニットテスト](/docs/unit-test#mocking-dynamodbservice)を参照してください。

---

## Read-Your-Writes（RYW）一貫性 {#read-your-writes}

:::info バージョンノート
Read-Your-Writes一貫性は[v1.2.0](/docs/changelog#v120)で追加されました。
:::

### 問題: publishAsync後の古いデータ読み取り

`publishAsync`はCommandテーブルへの書き込み後すぐに返り、その後DynamoDB StreamパイプラインがデータをReadモデル（Dataテーブル）に非同期で同期します。この間、同一ユーザーによる後続の読み取りは古いデータを返してしまいます。例えば「注文作成」ボタンが正常に送信されてユーザーが注文一覧にリダイレクトされても、新しい注文がまだ表示されない状態です。

```text
User Action                 DynamoDB Stream          User Sees
──────────────────────────────────────────────────────────────────
POST /orders ──────────► publishAsync() ─────► Command table ✓
                                                      │
GET  /orders ──────────► DataService.list() ─► Data table   ✗  ← stale!
                                                      │
                         [Stream sync ~1-3s]          │
                                          ↓           ▼
GET  /orders ──────────► DataService.list() ─► Data table   ✓  ← fresh
```

### 解決策: セッションベースのマージ

RYWはこのギャップを、保留中のコマンドのバージョン番号を短命なセッションテーブルに一時キャッシュすることで解消します。`Repository`経由で読み取る際、セッションエントリが検出され、保留中のコマンドがCommandテーブルから取得されてレスポンスにマージされます — これにより書き込みを行ったユーザーには即座に反映されます。

```text
User Action                 With RYW                 User Sees
──────────────────────────────────────────────────────────────────
POST /orders ──────────► publishAsync()
                         ├─► Command table ✓
                         └─► Session table (TTL=5m)

GET  /orders ──────────► Repository.listItemsByPk()
                         ├─► Session table ─► found! version=3
                         ├─► Command table  ─► fetch pending cmd
                         └─► merge into result     ✓  ← fresh!
```

### 動作の仕組み（内部処理）

1. **書き込みパス** — `publishAsync`成功後、`CommandService`が`{NODE_ENV}-{APP_NAME}-session`テーブルにセッションエントリを書き込みます：
   - PK: `{userId}#{tenantCode}`
   - SK: `{moduleTableName}#{itemId}`
   - `version`: 発行されたコマンドのバージョン番号
   - `ttl`: 現在時刻 + `RYW_SESSION_TTL_MINUTES`秒（DynamoDB TTLがエントリを自動削除）
   - **注意**: `RYW_SESSION_TTL_MINUTES`未設定の場合、この書き込みは完全にスキップされます。`Repository`の読み取りは正しく動作します — セッションエントリが見つからず`DataService`にフォールバックするだけです。

2. **読み取りパス** — `Repository`はデータを返す前にセッションテーブルを確認します：
   - `getItem`の場合: セッションエントリが存在すれば、バージョン付きコマンドを取得して既存のデータアイテムとマージ
   - `listItemsByPk`の場合: ユーザー/テナント/モジュールのセッションエントリを全取得し、更新・削除・新規作成を基底リスト結果に適用
   - `listItems`（RDS等の外部ソース）の場合: 同様のマージロジックで、`transformCommand`でコマンドを外部クエリの形に変換。`listItemsByPk`（`pk`引数から`tenantCode`を取得）とは異なり、`listItems`は`getUserContext(options.invokeContext)`から`tenantCode`を取得するため、RYWを有効にするには有効な`invokeContext`を持つ`options`が必要

3. **セッション期限切れ** — DynamoDB TTLにより自動的に期限切れになります。Streamの同期が完了すると（通常1〜3秒）、セッションエントリは不要となりTTL期間内にクリーンアップされます。

### プロアクティブなセッションクリーンアップ（v1.2.6以降） {#ryw-session-cleanup}

:::info バージョンノート
プロアクティブなRYWセッションクリーンアップと `getVersion` ショートサーキットは [v1.2.6](/docs/changelog#v126) で追加されました。
:::

v1.2.6以前は、対応する書き込みがデータテーブルに反映された後もRYWセッションがTTL切れまで残存していました。これは「stale override」のウィンドウを生み、他のユーザーや外部システムが同じアイテムをさらに新しいバージョンに更新しても、セッションのために書き込んだ本人が自分の古いコマンドをデータテーブル上にマージして見続けてしまう状態 — 実質的にTTL経過まで可視状態が巻き戻る — を引き起こしていました。

v1.2.6以降、`Repository` はデータテーブルのバージョンがセッションバージョンに達するか上回った時点で、バックグラウンドでセッションを能動的にパージします。これにより以下が保証されます：

- Stream同期が完了すれば、書き込んだユーザーは即座に最新データを参照できる — stale-overrideウィンドウは消滅
- 後続の読み取りは不要なCommandテーブル参照をスキップし、レイテンシが低減
- 設定TTLが長めでもセッションテーブルが肥大化しない

クリーンアップは **fire-and-forget** で実行され、失敗時は警告ログ（`Failed to delete RYW session (non-fatal): ...`）が出力されるのみで、読み取りパスをブロックすることはありません。すべての挙動は `RYW_SESSION_TTL_MINUTES` が有効な場合に自動で動作し、アプリケーションコードの変更は不要です。

#### オプション: RDSリードモデル向けの `getVersion` ショートサーキット

`Repository.listItems()`（RDSパス）は、オプションの `mergeOptions.getVersion` コールバックを受け付けるようになりました。RDS行にすでに `version` カラムが含まれている場合、このコールバックを渡すと、既存RDS行が追いついていることを証明できるケースでマージループでの追加DynamoDB GetItemをスキップできます：

```ts
await repository.listItems(
  () => rdsQuery(),
  {
    latestFlg: true,
    transformCommand: (cmd) => ({
      id: cmd.id,
      version: cmd.version,
      // ...他のCommandModelフィールドをRDS行の形にマッピング
    }),
    getVersion: (item) => item.version, // new in v1.2.6 (v1.2.6で追加)
  },
  options,
)
```

**注意:** `getVersion` がショートサーキットするのは **update パス**（セッションの `itemId` が既存のRDS行とマッチする場合）のみです。create-new アイテム（セッションがあるがまだRDSに未反映）は従来通りコマンドを取得します — バージョンを取得できる既存行が存在しないためです。

### RYWの有効化 {#enabling-ryw}

#### ステップ1: 環境変数を設定する

[`RYW_SESSION_TTL_MINUTES`](/docs/environment-variables#ryw-session-configuration)を正の整数に設定します。`5`（分）が安全なデフォルト値です — Streamの同期遅延をカバーしつつセッションテーブルを小さく保てます。

```bash
RYW_SESSION_TTL_MINUTES=5
```

未設定（または0や非数値に設定）の場合、機能は完全に無効になります：セッション書き込みはスキップされ、`Repository`は`DataService`と同じ動作をします。

#### ステップ2: セッションDynamoDBテーブルを作成する

`dynamodbs/session.json`をプロジェクトに追加します（他のテーブル定義と同じ場所）：

```json
{
  "TableName": "${NODE_ENV}-${APP_NAME}-session",
  "BillingMode": "PAY_PER_REQUEST",
  "KeySchema": [
    { "AttributeName": "pk", "KeyType": "HASH" },
    { "AttributeName": "sk", "KeyType": "RANGE" }
  ],
  "AttributeDefinitions": [
    { "AttributeName": "pk", "AttributeType": "S" },
    { "AttributeName": "sk", "AttributeType": "S" }
  ],
  "TimeToLiveSpecification": {
    "AttributeName": "ttl",
    "Enabled": true
  }
}
```

テーブル名は`{NODE_ENV}-{APP_NAME}-session`として自動計算されます（例: `dev-myapp-session`）。

### Repositoryの使い方 {#repository-api}

`Repository`はRYW一貫性が必要な読み取り操作において`DataService`の代替として使用できます。`@mbc-cqrs-serverless/core`（`CommandModule`経由）からエクスポートされています。モジュールに登録してサービスにインジェクトしてください。

#### モジュールへの登録

```ts
import { CommandModule } from '@mbc-cqrs-serverless/core'

@Module({
  imports: [
    CommandModule.register({
      tableName: 'order',
      dataSyncHandlers: [OrderDataSyncHandler],
    }),
  ],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
```

`Repository`は`CommandModule.register()`によって自動的にプロバイドおよびエクスポートされます — 追加の設定は不要です。

#### `getItem` — RYWマージ付き単一アイテム取得

```ts
import { DetailKey, ICommandOptions, Repository } from '@mbc-cqrs-serverless/core'
import { Injectable } from '@nestjs/common'

@Injectable()
export class OrderService {
  constructor(private readonly repository: Repository) {}

  async getOrder(key: DetailKey, options: ICommandOptions) {
    // If the user just published an async command for this item, (このアイテムに対してユーザーが直前にasyncコマンドを発行した場合、)
    // the pending version is merged in — the user always sees their own write. (保留バージョンがマージされます — ユーザーは常に自分の書き込みを見ることができます。)
    return this.repository.getItem(key, options)
  }
}
```

#### `listItemsByPk` — RYWマージ付きDynamoDBリスト取得

マージを有効にするには第3引数に`{ latestFlg: true }`を渡します。`mergeOptions`を省略するか`latestFlg`が`false`/`undefined`の場合、`DataService.listItemsByPk`と同じ動作です。

```ts
async listOrders(pk: string, options: ICommandOptions) {
  return this.repository.listItemsByPk(
    pk,
    { limit: 20, order: 'desc' },  // standard DynamoDB query options (標準DynamoDBクエリオプション)
    { latestFlg: true },            // enable RYW merge (RYWマージを有効化)
    options,
  )
}
```

操作ごとのマージ動作：

| 操作 | 結果 |
|---|---|
| 新規作成 | リストの先頭に追加（複数の保留作成がある場合は`updatedAt`降順でソート） |
| 更新 | 元の位置で置き換え — 元のソート順を保持 |
| 削除 | 結果から除外 |

:::note 新規作成後のソート順
新規作成されたアイテムはリストの先頭に追加されます。呼び出し元のソート順（`name`や`code`順など）には統合されません。DynamoDB Streamの同期が完了して次の読み取りで完全にソートされたデータが返るまで先頭に表示されます。これは意図的な動作です — RYWが保証するのは*可視性*であり、ソート位置ではありません。
:::

#### `listItems` — RYWマージ付き外部ソース（RDS / Elasticsearch）クエリ

外部ソース（TypeORMやPrismaを使用したRDSなど）をクエリするサービスでは、`listItems`と`transformCommand`関数を使用して保留中のコマンドをクエリ結果と同じ形に変換します。

```ts
import { IMergeOptions, ICommandOptions, Repository } from '@mbc-cqrs-serverless/core'
import { Injectable } from '@nestjs/common'
import { OrderDto } from './dto/order.dto'

@Injectable()
export class OrderService {
  constructor(
    private readonly repository: Repository,
    private readonly orderRepository: TypeOrmOrderRepository,
  ) {}

  async searchOrders(
    filter: OrderFilterDto,
    options: ICommandOptions,
  ): Promise<{ total: number; items: OrderDto[] }> {
    const mergeOptions: IMergeOptions<OrderDto> = {
      latestFlg: true,

      // Convert a pending CommandModel into an OrderDto (保留中のCommandModelをOrderDtoに変換)
      transformCommand: (cmd, existing) => ({
        id: cmd.id,
        code: cmd.code,
        name: cmd.name,
        status: cmd.attributes?.status ?? existing?.status,
        // carry over join fields that don't exist in the command (コマンドに存在しないJOINフィールドを引き継ぐ)
        customerName: existing?.customerName ?? '',
        createdAt: cmd.createdAt,
        updatedAt: cmd.updatedAt,
      }),

      // Only prepend create-new items that match the current search filter (現在の検索フィルターにマッチする新規作成アイテムのみを先頭に追加)
      matchesFilter: (item) =>
        !filter.status || item.status === filter.status,
    }

    return this.repository.listItems(
      // The base query — runs as normal (基底クエリ — 通常通り実行)
      () => this.orderRepository.search(filter),
      mergeOptions,
      options,
    )
  }
}
```

:::note listItemsのページネーション
マージ後に`total`が調整されます（新規作成でインクリメント、削除でデクリメント）。ただし先頭に追加されたアイテムはRDSの`LIMIT`/`OFFSET`ウィンドウの外にあるため、Streamの同期が完了するまでページ2以降で1アイテムの重複またはギャップが生じる場合があります。ほとんどのUXパターン（書き込み後リダイレクト、楽観的UI）では気になりません。
:::

### 動作サマリー

| シナリオ | `RYW_SESSION_TTL_MINUTES`未設定 | `RYW_SESSION_TTL_MINUTES=5` |
|---|---|---|
| `getItem` — 直前に作成したアイテム | 古いデータを返す（空） | 保留中のコマンドデータを返す |
| `getItem` — Streamの同期後 | 最新データを返す | 最新データを返す（セッション期限切れまたは未存在） |
| `listItemsByPk`（`latestFlg`あり） | 古いリストを返す | 保留アイテムを先頭に追加したリストを返す |
| パフォーマンスオーバーヘッド | なし | 保留アイテムごとに1〜2回の追加DynamoDB読み取り |
| 既存コードへの影響 | なし | なし — `DataService`は変更なし |

### 制限とトレードオフ

- **可視性の保証であり、順序ではない**: 保留中の新規作成アイテムはリストの先頭に表示されますが、呼び出し元のソート順には統合されません。
- **単一ユーザースコープ**: RYWはコマンドを発行したユーザーにのみ適用されます。他のユーザーはStreamの同期が完了するまで結果整合性の読み取りが返ります。
- **`listItems`のページネーション重複**: ページネーションされた外部クエリ（RDS）では、新規作成アイテムがページ1（先頭追加）とページ2（同期後）の両方に表示される場合があります。次の完全なリロードで解消されます。
- **セッションテーブルのコスト**: `publishAsync`の呼び出しごとに更新エンティティ1件につきDynamoDBアイテムを1件書き込みます。`RYW_SESSION_TTL_MINUTES=5`の場合、アイテムは小さく短命です。一般的なワークロードではコストは無視できます。


## 関連ドキュメント

- [データサービス](/docs/data-service) - DynamoDBを使ったデータクエリ
- [ユニットテスト](/docs/unit-test) - モックを使用したCommandServiceのユニットテスト
- [サービスパターン](/docs/service-patterns) - 完全なCRUDサービス実装パターン
- [イベント処理パターン](/docs/event-handling-patterns) - データ同期ハンドラーの作成
- [バージョン競合ガイド](/docs/version-conflict-guide) - 楽観的ロック競合の処理
- [エラーカタログ](/docs/error-catalog#command-admission-rejected) - コマンドアドミッションの例外
- [インターフェース](/docs/interfaces) - CommandInputModelなどのTypeScriptインターフェース
- [バージョン管理ルール](/docs/version-rules) - VERSION_FIRST、バージョンシーケンス、楽観的ロックのセマンティクス
- [シリアライゼーション](/docs/serialization) - class-transformerによるコマンドデータのシリアライゼーション
