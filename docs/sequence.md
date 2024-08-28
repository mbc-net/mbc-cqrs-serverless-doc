---
description: { { description } }
---

# {{title}}

{{intro_text}}

{{customization_intro}}

- {{option_1}}

{{example_intro}}

```ts
// seq.controller.ts
import { SequencesController } from "@mbc-cqrs-severless/sequence";
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
import { SequencesModule } from "@mbc-cqrs-severless/sequence";
import { Module } from "@nestjs/common";

import { SeqController } from "./seq.controller";

@Module({
  imports: [SequencesModule.register({ enableController: false })],
  controllers: [SeqController],
  exports: [SequencesModule],
})
export class SeqModule {}
```

{{usage_intro}}

{{service_method_description}}

```ts
async genNewSequence(
    dto: GenSequenceDto,
    opts: {
      invokeContext: IInvoke
    },
  )
```

{{dto_properties_intro}}

- {{property_1}}
- {{property_2}}
- {{property_3}}
