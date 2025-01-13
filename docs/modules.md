---
description: Learn how to create modules.
---

# {{Modules}}

{{A module is a class annotated with a `@Module()` decorator. The `@Module()` decorator provides metadata that organize the application structure.}}

{{Defining a module in the MBC Serverless Framework is the same as in Nest.js, so please refer to this section using [the provided link](https://docs.nestjs.com/modules).}}

{{In the example below, the `CatModule` defines the `CatController`, provides and exports the `CatService`, and imports `CommandModule`. The `CommandModule` is a dynamic module that allows registering `tableName` and `dataSyncHandlers`, with options to enable or disable `skipError` and `disableDefaultHandler`.}}

```ts
@Module({
  imports: [
    CommandModule.register({
      tableName: "cat",
      dataSyncHandlers: [CatDataSyncRdsHandler],
    }),
  ],
  controllers: [CatController],
  providers: [CatService],
  exports: [CatService],
})
export class CatModule {}
```

{{For more details about the `CommandModule`, please refer to the [API reference](./command-module.md) section.}}
