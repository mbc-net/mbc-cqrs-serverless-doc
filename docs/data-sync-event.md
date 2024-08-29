---
description: { { description } }
---

# {{title}}

{{intro_text}}

{{helper_utilities_intro}}

{{handler_creation_intro}}

```ts
import { CommandModel, IDataSyncHandler } from "@mbc-cqrs-severless/core";
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

{{registration_intro}}

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
