---
description: { { description } }
---

# {{title}}

{{intro_text}}

{{module_definition_text}}

{{module_example_intro}}

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

{{command_module_details}}
