---
description: CommandService の使用方法を学びましょう。
---

# CommandService

## 説明

このサービスのメソッドは主にコマンド テーブルを操作するために使用されます。

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

### *async* `publish(input: CommandInputModel, opts: ICommandOptions)`

このメソッドを使用すると、**コマンド** テーブルにデータが直接挿入されるため、完全なコマンドを公開できます。

たとえば、次のように新しい cat コマンドを発行できます。

```ts
import {
  generateId,
  getCommandSource,
  VERSION_FIRST,
} from "@mbc-cqrs-serverless/core";

// ...

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

### *async* `publishPartialUpdate( input: CommandPartialInputModel, opts?: ICommandOptions)`

このメソッドは、以前のコマンドに基づいて新しいコマンド データを発行します。

たとえば、猫の名前を更新するとします。

```ts
import {
  generateId,
  getCommandSource,
  VERSION_FIRST,
} from '@mbc-cqrs-serverless/core'

// ...

  const catCommand = new CatCommandDto({
    pk: catPk,
    sk: catSk,
    tenantCode,
    id: generateId(catPk, catSk),
    code,
    type: 'CAT',
    name: attributes.name,
    version: VERSION_FIRST,
    attributes,
  })
  
  const commandSource = getCommandSource(
    basename(__dirname),
    this.constructor.name,
    'createCatCommand',
  )
  
  const item = await this.commandService.publish(catCommand,{
    source: commandSource,
    invokeContext,
  })
```

このメソッドはコマンド データを返します。

### async reSyncData()

データ同期ハンドラーを再適用する場合は、このメソッドを使用できるように設計されています。次のように関数を呼び出すだけです。

```ts
await this.commandService.reSyncData();
```
