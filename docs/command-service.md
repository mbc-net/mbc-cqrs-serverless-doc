---
description: { { description } }
---

# {{title}}

## {{description_title}}

{{description_text}}

{{usage_example}}

```ts
import { CommandModule } from "@mbc-cqrs-severless/core";
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

{{usage_result}}

## {{method_title}}

### {{publish_method_title}}

{{publish_method_intro}}

{{publish_method_example}}

```ts
import {
  generateId,
  getCommandSource,
  VERSION_FIRST,
} from "@mbc-cqrs-severless/core";

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

{{publish_method_return}}

### {{publishPartialUpdate_method_title}}

{{publishPartialUpdate_method_intro}}

{{publishPartialUpdate_method_example}}

```ts
import {
  generateId,
  getCommandSource,
  VERSION_FIRST,
} from '@mbc-cqrs-severless/core'

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

{{publishPartialUpdate_method_return}}

### {{reSyncData_method_title}}

{{reSyncData_method_usage}}

```ts
await this.commandService.reSyncData();
```
