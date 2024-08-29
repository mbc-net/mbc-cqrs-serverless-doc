---
description: { { description } }
---

# {{title}}

{{intro_text}}

{{ref_text}}

:::note

{{invoke_context_note}}

```ts
@INVOKE_CONTEXT() invokeContext: IInvoke,
```

:::

{{example_intro}}

```ts
@Auth(ROLE.ADMIN)
@Controller("api/cat")
@ApiTags("cat")
export class CatController {
  constructor(private readonly catService: CatService) {}

  @Post()
  async create(
    @INVOKE_CONTEXT() invokeContext: IInvoke,
    @Body() createCatDto: CreateCatDto
  ) {
    return this.catService.create(createCatDto, { invokeContext });
  }
}
```
