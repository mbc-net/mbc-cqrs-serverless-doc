---
description: { { description } }
---

# {{title}}

![{{img_alt}}](./images/CommandModule.png)

## {{description_title}}

{{description_text}}

## {{method_title}}

### {{register_method_title}}

{{register_method_intro}}

| {{property_name}}                | {{property_description}}              |
| -------------------------------- | ------------------------------------- |
| `tableName: string`              | {{tableName_description}}             |
| `skipError?: boolean`            | {{skipError_description}}             |
| `dataSyncHandlers?: Type[]`      | {{dataSyncHandlers_description}}      |
| `disableDefaulHandler?: boolean` | {{disableDefaultHandler_description}} |

{{example_text}}

```ts
CommandModule.register({
  tableName: "cat",
  dataSyncHandlers: [CatDataSyncRdsHandler],
});
```

{{example_description}}
