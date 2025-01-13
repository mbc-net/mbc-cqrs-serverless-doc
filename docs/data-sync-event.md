---
description: { { Learn how to create and register data sync handler. } }
---

# {{Data sync event}}

{{The data sync event is a particularly significant custom event because it is one of the most commonly registered events within the application. Handlers for this event play a crucial role in ensuring data consistency and synchronization between different databases. For example, a handler might be responsible for syncing data from DynamoDB to RDS, sending registration emails, and executing other related tasks that maintain the integrity and flow of data across the application.}}

{{To make working with the data sync event easier, we've created several helper utilities that are ready for you to use. By using these pre-built utilities, you can streamline your development process, reduce the amount of custom code needed, and ensure that your event handlers are efficient and reliable.}}

{{By convention, you create a class that implements `IDataSyncHandler` and then override the up and down methods as below example:}}

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

{{Then, you register this handler to `CommandModule`:}}

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
