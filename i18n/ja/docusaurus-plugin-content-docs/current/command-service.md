---
description: CommandService の使用方法を学びましょう。
---

# CommandService

## 詳細

「CommandService」は、コマンドの管理と同期を容易にするフレームワークのコアコンポーネントです。主に、完全なコマンドと部分的なコマンドの両方を発行する方法を提供し、それらの処理を同期または非同期で行うことができるため、システム内のコマンド処理の全体的な効率と柔軟性が向上します。

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

## メソッド

### *async* `publishAsync(入力: CommandInputModel、オプション: ICommandOptions)`

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

### *async* `publishPartialUpdateAsync( input: CommandPartialInputModel, options?: ICommandOptions)`

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

### *async* `publishSync( input: CommandInputModel, options?: ICommandOptions)`

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

### *async* `publishPartialUpdateSync( input: CommandPartialInputModel, options?: ICommandOptions)`

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

### *async* `publishPartialUpdate( input: CommandPartialInputModel, options?: ICommandOptions)` <span class="badge badge--warning">非推奨</span>

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
