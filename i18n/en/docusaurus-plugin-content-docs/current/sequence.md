---
description: Sequence setup and usage.
---

# Sequence

Sequence is **dynamic modules**. It's used for generating sequence in your application.

The solution for customizing the behavior of the `SequenceModule` is to pass it an options `object` in the static `register()` method. The options object is only contain one property:

- `enableController`: enable or disable default sequence controller.

We will create a simple example demonstrating how to use the sequence module and customize authentication for the sequence controller.

```ts
// seq.controller.ts
import { SequencesController } from "@mbc-cqrs-serverless/sequence";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Auth } from "src/auth/auth.decorator";
import { ROLE } from "src/auth/role.enum";

@Controller("api/sequence")
@ApiTags("sequence")
@Auth(ROLE.JCCI_ADMIN)
export class SeqController extends SequencesController {}
```

```ts
// seq.module.ts
import { SequencesModule } from "@mbc-cqrs-serverless/sequence";
import { Module } from "@nestjs/common";

import { SeqController } from "./seq.controller";

@Module({
  imports: [SequencesModule.register({ enableController: false })],
  controllers: [SeqController],
  exports: [SequencesModule],
})
export class SeqModule {}
```

Beside controller, we can directly use `SequenceService` to generating sequence by injecting service.

The `SequenceService` have only one public method:

```ts
async genNewSequence(
    dto: GenSequenceDto,
    opts: {
      invokeContext: IInvoke
    },
  )
```

You can modify the behavior of the function by providing a `GenSequenceDto` object with certain properties:

- `date?: Date`: By default, the function uses the current date, but if a specific date is provided, it will generate the sequence for that date instead.
- `rotateBy?: RotateByEnum`: You can select one of five values from the RotateByEnum: fiscal_yearly, yearly, monthly, daily, and none. By default, the none type is used.
- `tenantCode` and `typeCode`: You must provide the tenant code to identify the tenant and the type code for the intended purpose of usage.
