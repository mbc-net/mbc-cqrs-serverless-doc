---
description: { { Learn how to use CommandService. } }
---

# {{CommandService}}

## {{Description}}

{{The `CommandService` is a core component of the framework that facilitates the management and synchronization of commands. It primarily provides methods for publishing both full commands and partial commands, allowing for their processing either synchronously or asynchronously, thereby enhancing the overall efficiency and flexibility of command handling within the system.}}

{{In the example for the method below, assume you import the `CommandModule` into your module as follows:}}

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

{{Then, the `CommandService` and `DataService` will be ready for injection into other services for your use.}}

## {{Methods}}

### {{*async* `publishAsync(input: CommandInputModel, options: ICommandOptions)`}}

{{Utilize this method to publish a full command, as it will insert the command data into the **command** table.}}

{{The method provides immediate feedback by returning the command data right away, allowing you to proceed without waiting for the command to be processed. Subsequently, the command is handled asynchronously in the background, ensuring that your application remains responsive while the processing occurs.}}

{{For example, you can publish a new cat command as bellow:}}

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

### {{*async* `publishPartialUpdateAsync( input: CommandPartialInputModel, options?: ICommandOptions)`}}

{{This method allows you to create new command data based on the previous command with the same `pk` and `sk` (primary key) values.}}

{{As same as the `publishAsync` method, the method immediately returns the updated command data without waiting for the command to be processed.}}

{{For example, you want to update cat's name:}}

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

### {{*async* `publishSync( input: CommandInputModel, options?: ICommandOptions)`}}

{{This method serves as a synchronous counterpart to the `publishAsync` method, meaning that it will halt the execution of the code until the command has been fully processed. This ensures that you receive the result of the command before proceeding with any further operations in your code.}}

{{For example:}}

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

### {{*async* `publishPartialUpdateSync( input: CommandPartialInputModel, options?: ICommandOptions)`}}

{{This method is a synchronous version of the `publishPartialUpdateAsync` method. It will block the execution of the code until the command is processed.}}

{{For example, you want to update cat's name:}}

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

### {{*async* `publish(input: CommandInputModel, options: ICommandOptions)` <span class="badge badge--warning">deprecated</span>}}

:::info

{{Deprecated, for removal: This API element is subject to removal in a future version. Use [`publishAsync` method](#async-publishasyncinput-commandinputmodel-options-icommandoptions) instead.}}

:::

{{For example, you can publish a new cat command as bellow:}}

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

{{The method returns the command data.}}

### {{*async* `publishPartialUpdate( input: CommandPartialInputModel, options?: ICommandOptions)` <span class="badge badge--warning">deprecated</span>}}

:::info

{{Deprecated, for removal: This API element is subject to removal in a future version. Use [`publishPartialUpdateAsync` method](#async-publishpartialupdateasync-input-commandpartialinputmodel-options-icommandoptions) instead.}}

:::

{{This method allows you to create new command data based on the previous command.}}

{{For example, you want to update cat's name:}}

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

{{The method returns the updated command data.}}

### {{*async* `reSyncData()`}}

{{If you want to reapply the data sync handler, this method is designed for you to use. You only need to call the function as follows:}}

```ts
await this.commandService.reSyncData();
```
