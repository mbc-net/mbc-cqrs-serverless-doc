---
description: Learn how to use CommandModule.
---

# CommandModule

![CommandModule structure](./images/CommandModule.png)

## Description

The `CommandModule` is a dynamic module used to register data sync handlers and provide some services associated with the table name.

## Methods

### *static* `register(option)`

When import this module, you must provide a specific option for use. The option has 4 properties that you can configure:

| Properties                | Description              |
| -------------------------------- | ------------------------------------- |
| `tableName: string`              | provide table name             |
| `skipError?: boolean`            | If set to `true`, it will skip errors from previous commands.             |
| `dataSyncHandlers?: Type[]`      | register data sync handler      |
| `disableDefaulHandler?: boolean` | If set to `true`, it will reset default data sync handlers |

For example:

```ts
CommandModule.register({
  tableName: "cat",
  dataSyncHandlers: [CatDataSyncRdsHandler],
});
```

Here, the `CommandModule` registers with the `cat` table name and provides the `CatDataSyncRdsHandler` to the data sync handlers.
