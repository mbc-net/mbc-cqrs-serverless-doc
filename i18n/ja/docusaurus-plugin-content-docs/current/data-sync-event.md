---
description: データ同期ハンドラーを作成して登録する方法を学習します。
---

# データ同期イベント

データ同期イベントは、アプリケーション内で最も一般的に登録されるイベントの 1 つであるため、特に重要なカスタム イベントです。このイベントのハンドラーは、異なるデータベース間のデータの一貫性と同期を確保する上で重要な役割を果たします。たとえば、ハンドラーは、DynamoDB から RDS へのデータの同期、登録メールの送信、およびアプリケーション全体のデータの整合性とフローを維持するその他の関連タスクの実行を担当する場合があります。


データ同期イベントの操作を簡単にするために、すぐに使用できるいくつかのヘルパー ユーティリティを作成しました。これらの事前に構築されたユーティリティを使用すると、開発プロセスを合理化し、必要なカスタム コードの量を削減し、イベント ハンドラーの効率性と信頼性を確保できます。

慣例により、以下の例のように、`IDataSyncHandler` を実装するクラスを作成し、up メソッドと down メソッドをオーバーライドします。

```ts
import { CommandModel, IDataSyncHandler } from "@mbc-cqrs-serverless/core";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma";

@Injectable()
export class CatDataSyncRdsHandler implements IDataSyncHandler {
  private readonly logger = new Logger(CatDataSyncRdsHandler.name);

  constructor(private readonly prismaService: PrismaService) {}

  async up(cmd: CommandModel): Promise<any> {
    this.logger.debug(cmd);
    // sync data
  }

  async down(cmd: CommandModel): Promise<any> {
    this.logger.debug(cmd);
  }
}
```

次に、このハンドラーを `CommandModule` に登録します。

```ts
@Module({
  imports: [
    CommandModule.register({
      tableName: 'cat',
      dataSyncHandlers: [CatDataSyncRdsHandler],
    }),
  ],
  ...
})
export class CatModule {}
```
