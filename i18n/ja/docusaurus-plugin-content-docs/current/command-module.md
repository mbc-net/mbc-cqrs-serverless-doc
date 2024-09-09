---
description: CommandModule の使用方法を学びましょう。
---

# CommandModule

![CommandModule の構造](./images/CommandModule.png)

## 説明

「CommandModule」は、データ同期ハンドラーを登録し、テーブル名に関連付けられたいくつかのサービスを提供するために使用される動的モジュールです。

## メソッド

### *static* `register(option)`

このモジュールをインポートするときは、使用する特定のオプションを指定する必要があります。このオプションには、構成できる 4 つのプロパティがあります。

| プロパティ                | 説明              |
| -------------------------------- | ------------------------------------- |
| `tableName: string`              | テーブル名を指定します。             |
| `skipError?: boolean`            | 「true」に設定すると、前のコマンドからのエラーがスキップされます。             |
| `dataSyncHandlers?: Type[]`      | データ同期ハンドラーを登録する      |
| `disableDefaulHandler?: boolean` | 「true」に設定すると、デフォルトのデータ同期ハンドラーがリセットされます。 |

例

```ts
CommandModule.register({
  tableName: "cat",
  dataSyncHandlers: [CatDataSyncRdsHandler],
});
```

ここで、`CommandModule` は `cat` テーブル名を登録し、データ同期ハンドラーに `CatDataSyncRdsHandler` を提供します。
