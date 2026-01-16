---
description: CommandModuleとCommandServiceを使用してコマンドを発行・管理する方法を学びます。
---

# CommandService

## 概要

「CommandService」は、コマンドの管理と同期を容易にするフレームワークのコアコンポーネントです。主に、完全なコマンドと部分的なコマンドの両方を発行する方法を提供し、それらの処理を同期または非同期で行うことができるため、システム内のコマンド処理の全体的な効率と柔軟性が向上します。

## CommandModule設定

![CommandModule構造](./images/CommandModule.png)

`CommandModule`は、データ同期ハンドラーを登録し、テーブル名に関連付けられたサービスを提供するために使用される動的モジュールです。このモジュールをインポートする際は、特定のオプションを指定する必要があります。

### 登録オプション

| プロパティ                  | 説明                                                      |
| ----------------------------- | -------------------------------------------------------------------- |
| `tableName: string`           | テーブル名を指定                                               |
| `skipError?: boolean`         | `true`に設定すると、以前のコマンドからのエラーをスキップします     |
| `dataSyncHandlers?: Type[]`   | データ同期ハンドラーを登録                                      |
| `disableDefaultHandler?: boolean` | `true`に設定すると、デフォルトのデータ同期ハンドラーをリセットします   |

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

## CommandServiceの使用

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
CommandServiceを使用した完全なCRUD実装パターンについては、[Service実装パターン](./service-patterns.md)を参照してください。
:::

## メソッド

### *async* `publishAsync(input: CommandInputModel, options: ICommandOptions)`

このメソッドを使用すると、コマンド データが **command** テーブルに挿入されるため、完全なコマンドを公開できます。

このメソッドはコマンド データをすぐに返すことによって即時フィードバックを提供するため、コマンドの処理を待たずに続行できます。その後、コマンドはバックグラウンドで非同期に処理され、処理中もアプリケーションの応答性が維持されます。

たとえば、次のように新しい cat コマンドを発行できます。

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
  "createCatCommand"
);

const item = await this.commandService.publishAsync(catCommand, {
  source: commandSource,
  invokeContext,
});
```

### *async* `publishPartialUpdateAsync( input: CommandPartialInputModel, options: ICommandOptions)`

この方法を使用すると、同じ `pk` および `sk` (主キー) 値を持つ前のコマンドに基づいて新しいコマンド データを作成できます。

`publishAsync` メソッドと同様に、このメソッドはコマンドの処理を待たずに、更新されたコマンド データをすぐに返します。

たとえば、猫の名前を更新したいとします。

```ts
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
  source: commandSource,
  invokeContext,
});
```

### *async* `publishSync( input: CommandInputModel, options: ICommandOptions)`

このメソッドは、`publishAsync` メソッドに相当する同期メソッドとして機能します。つまり、コマンドが完全に処理されるまでコードの実行を停止します。これにより、コード内で以降の操作を続行する前にコマンドの結果を確実に受け取ることができます。

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

### *async* `publishPartialUpdateSync( input: CommandPartialInputModel, options: ICommandOptions)`

このメソッドは、`publishPartialUpdateAsync` メソッドの同期バージョンです。コマンドが処理されるまでコードの実行がブロックされます。

たとえば、猫の名前を更新したいとします。

```ts
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

### *async* `publish(input: CommandInputModel, options: ICommandOptions)` <span class="badge badge--warning">非推奨</span>

:::info

非推奨、削除予定: この API 要素は将来のバージョンで削除される可能性があります。代わりに [`publishAsync` メソッド](#async-publishasyncinput-commandinputmodel-options-icommandoptions) を使用してください。

:::

たとえば、次のように新しい cat コマンドを発行できます。

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
  "createCatCommand"
);

const item = await this.commandService.publish(catCommand, {
  source: commandSource,
  invokeContext,
});
```

このメソッドはコマンド データを返します。

### *async* `publishPartialUpdate( input: CommandPartialInputModel, options: ICommandOptions)` <span class="badge badge--warning">非推奨</span>

:::info


非推奨、削除予定: この API 要素は将来のバージョンで削除される可能性があります。代わりに [`publishPartialUpdateAsync` メソッド](#async-publishpartialupdateasync-input-commandpartialinputmodel-options-icommandoptions) を使用してください。

:::

この方法では、以前のコマンドに基づいて新しいコマンド データを作成できます。

たとえば、猫の名前を更新したいとします。

```ts
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

### *async* `reSyncData()`

データ同期ハンドラーを再適用する場合は、このメソッドを使用できるように設計されています。次のように関数を呼び出すだけです。

```ts
await this.commandService.reSyncData();
```

### *async* `getItem(key: DetailKey): Promise<CommandModel>`

プライマリキーでコマンドアイテムを取得します。ソートキーにバージョン区切り文字が含まれていない場合、自動的に`getLatestItem`を呼び出して最新バージョンを取得します。

```ts
import { DetailKey } from "@mbc-cqrs-serverless/core";

// Get a specific version of a command (特定バージョンのコマンドを取得)
const command = await this.commandService.getItem({
  pk: "CAT#tenant1",
  sk: "CAT#cat001#00000002", // Includes version number (バージョン番号を含む)
});

// If no version in sk, automatically gets latest version (skにバージョンがない場合、自動的に最新バージョンを取得)
const latestCommand = await this.commandService.getItem({
  pk: "CAT#tenant1",
  sk: "CAT#cat001",
});
```

### *async* `getLatestItem(key: DetailKey): Promise<CommandModel>`

プライマリキーでコマンドアイテムの最新バージョンを取得します。このメソッドは、データテーブルのバージョンから開始し、最新のコマンドバージョンを見つけるために上下に検索するルックアップアルゴリズムを使用します。

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

### *async* `getNextCommand(currentKey: DetailKey): Promise<CommandModel>`

現在のコマンドのキーに基づいて、次のバージョンのコマンドを取得します。これは、コマンドチェーンの処理やリトライロジックの実装に役立ちます。

```ts
import { DetailKey } from "@mbc-cqrs-serverless/core";

const currentKey: DetailKey = {
  pk: "CAT#tenant1",
  sk: "CAT#cat001#00000002",
};

const nextCommand = await this.commandService.getNextCommand(currentKey);
// Returns command with sk: "CAT#cat001#00000003" if exists (存在する場合、sk: "CAT#cat001#00000003"のコマンドを返す)
```

### *async* `updateStatus(key: DetailKey, status: string, notifyId?: string): Promise<void>`

コマンドのステータスを更新し、SNS通知を送信します。これは、タスクやプロセスのステータスを更新し、変更をサブスクライバーに通知するために一般的に使用されます。

```ts
import { DetailKey } from "@mbc-cqrs-serverless/core";

const key: DetailKey = {
  pk: "CAT#tenant1",
  sk: "CAT#cat001#00000001",
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
  sk: "CAT#cat001#00000001",
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

### *async* `updateTaskToken(key: DetailKey, token: string): Promise<CommandModel>`

コマンドアイテムにAWS Step Functionsタスクトークンを保存します。これは、Step Functionsと統合してコールバックパターンを有効にする際に使用されます。

```ts
import { DetailKey } from "@mbc-cqrs-serverless/core";

const key: DetailKey = {
  pk: "CAT#tenant1",
  sk: "CAT#cat001#00000001",
};

// Store the Step Functions task token (Step Functionsタスクトークンを保存)
await this.commandService.updateTaskToken(key, event.taskToken);

// Later, use the token to send task success/failure (後でトークンを使用してタスクの成功/失敗を送信)
// via SendTaskSuccessCommand or SendTaskFailureCommand (SendTaskSuccessCommandまたはSendTaskFailureCommandを使用)
```

### *async* `updateTtl(key: DetailKey): Promise<CommandModel | null>`

コマンドの前のバージョンのTTL（Time To Live）を更新します。これは通常、コマンド履歴の保持を管理するために内部的に使用されます。バージョンが低すぎるか、前のコマンドが存在しない場合は`null`を返します。

```ts
import { DetailKey } from "@mbc-cqrs-serverless/core";

const key: DetailKey = {
  pk: "CAT#tenant1",
  sk: "CAT#cat001#00000003", // Version 3 (バージョン3)
};

// Updates TTL of version 2 (previous version) (バージョン2（前のバージョン）のTTLを更新)
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

### `getDataSyncHandler(name: string): IDataSyncHandler`

クラス名で特定のデータ同期ハンドラーを取得します。指定された名前のハンドラーが見つからない場合は`undefined`を返します。

```ts
// Get a specific handler by name (名前で特定のハンドラーを取得)
const rdsHandler = this.commandService.getDataSyncHandler('CatDataSyncRdsHandler');

if (rdsHandler) {
  // Use the handler directly (ハンドラーを直接使用)
  await rdsHandler.up(commandModel);
}
```
