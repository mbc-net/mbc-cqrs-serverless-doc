---
description: モジュールの作成方法を学びます。
---

# モジュール

モジュールは、`@Module()` デコレータで注釈が付けられたクラスです。 `@Module()` デコレーターは、アプリケーション構造を編成するメタデータを提供します。

MBC サーバーレス フレームワークでのモジュールの定義は Nest.js の場合と同じであるため、[Nest.js内のリンク](https://docs.nestjs.com/modules) を使用してこのセクションを参照してください。

以下の例では、`CatModule` は `CatController` を定義し、`CatService` を提供およびエクスポートし、`CommandModule` をインポートします。 `CommandModule` は、`skipError` および `disableDefaultHandler` を有効または無効にするオプションを使用して、`tableName` および `dataSyncHandlers` を登録できる動的モジュールです。

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

「`CommandModule` の詳細については、[API リファレンス](./command-module.md) セクションを参照してください。
