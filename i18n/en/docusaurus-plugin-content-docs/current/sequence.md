---
description: Sequence setup and usage.
---

# Sequence

## 1. Purpose

`SequenceModule`  is a service for managing dynamic sequences in the system using DynamoDB as the primary database.

This service is designed to:

- Generate unique sequence numbers based on parameters such as sequence type, tenant, or date.
- Automatically reset sequences based on cycles like:
  - Daily.
  - Monthly.
  - Yearly.
  - Fiscal Yearly.

Format sequence numbers according to specific system requirements (e.g., TODO-PERSONAL-72-001).
Ensure data consistency and integrity in multi-tenant systems.
## 2. Usage


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

Generates a new sequence based on the parameters provided in the GenSequenceDto object.

### Parameters

`dto: GenSequenceDto`
The data transfer object that customizes the behavior of the sequence generation. Its properties include:

- `date?: Date`
  - Default: Current date.
  - Description: Specifies the date for which the sequence is generated.

- `rotateBy?: RotateByEnum`
  - Default: none.
  - Options
    - fiscal_yearly
    - yearly
    - monthly
    - daily
    - none
  - Description: Determines the rotation type for the sequence.

- `tenantCode: string`
  - Required: Yes.
  - Description: Identifies the tenant and type code for the intended usage.
  
- `params: SequenceParamsDto`
  - Required: Yes.
  - Description: Defines parameters to identify the sequence.
    ```ts
    export class SequenceParamsDto {
      @IsString()
      code1: string

      @IsString()
      code2: string

      @IsOptional()
      @IsString()
      code3?: string

      @IsOptional()
      @IsString()
      code4?: string

      @IsOptional()
      @IsString()
      code5?: string

      constructor(partial: Partial<SequenceParamsDto>) {
        Object.assign(this, partial)
      }
    }
    ```
- `format?: string`
  - Default: %%no%%.
  - Description: Specifies a custom format for the sequence. Example format:
  ```
  %%code1#:0>4%%-%%code2#:0>5%%-%%fiscal_year#:0>2%%-%%no#:0>3%%

- `startMonth?: number`
  - Default: 4 (April).
  - Description: Specifies the starting month of the fiscal year.

- `registerDate?: Date`
  - Default: Not specified.
  - Description: Calculates the fiscal period based on the provided date.


