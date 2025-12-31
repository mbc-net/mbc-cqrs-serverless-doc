---
description: {{Learn the fundamentals of routing.}}
---

# {{Controllers}}

{{Controllers are responsible for handling incoming **requests** and returning **responses** to the client.}}

{{Defining a controller in the MBC Serverless Framework is the same as in Nest.js, so please refer to this section using the [provided link](https://docs.nestjs.com/controllers).}}

:::note

{{To get the invoke context, you can provide the following argument in the controller function.}}

```ts
@INVOKE_CONTEXT() invokeContext: IInvoke,
```

:::

{{In the following example we'll use the `@Controller()` decorator, which is required to define a basic controller; `@Auth(ROLE.ADMIN)` decorator, which is specified for authorization purpose; and `@ApiTags('cat')` to attach a controller to a specific tag.}}

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
