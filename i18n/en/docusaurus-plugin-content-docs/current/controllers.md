---
description: Learn the fundamentals of routing.
---

# Controllers

Controllers are responsible for handling incoming **requests** and returning **responses** to the client.

Defining a controller in the MBC Serverless Framework is the same as in Nest.js, so please refer to this section using the [provided link](https://docs.nestjs.com/controllers).

:::note

To get the invoke context, you can provide the following argument in the controller function.

```ts
@INVOKE_CONTEXT() invokeContext: IInvoke,
```

:::

In the following example we'll use the `@Controller()` decorator, which is required to define a basic controller; `@Auth(ROLE_SYSTEM_ADMIN)` decorator, which is specified for authorization purpose; and `@ApiTags('cat')` to attach a controller to a specific tag.

```ts
import { ROLE_SYSTEM_ADMIN, INVOKE_CONTEXT, IInvoke, Auth } from '@mbc-cqrs-serverless/core';

@Auth(ROLE_SYSTEM_ADMIN)
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

## Decorators

The framework provides several decorators to simplify common patterns in your controllers.

### `@INVOKE_CONTEXT()`

Parameter decorator that extracts the invocation context from the request. This provides access to Lambda context, JWT claims, and request metadata.

```ts
import { INVOKE_CONTEXT, IInvoke } from '@mbc-cqrs-serverless/core';

@Get(':id')
async getItem(
  @INVOKE_CONTEXT() invokeContext: IInvoke,
  @Param('id') id: string
) {
  return this.service.getItem(id, { invokeContext });
}
```

### `@Auth(...roles)`

Method/class decorator that applies authentication and role-based access control. Combines RolesGuard with Swagger documentation (ApiBearerAuth, ApiUnauthorizedResponse).

```ts
import { Auth, ROLE_SYSTEM_ADMIN } from '@mbc-cqrs-serverless/core';

@Controller('admin')
@Auth(ROLE_SYSTEM_ADMIN)  // Class-level: applies to all methods
export class AdminController {

  @Post()
  @Auth(ROLE_SYSTEM_ADMIN)  // Method-level: override class decorator
  async create() {}
}
```

### `@HeaderTenant()`

Method/class decorator that adds tenant code header requirement to Swagger documentation. Use this when your endpoint requires a tenant code header.

```ts
import { HeaderTenant } from '@mbc-cqrs-serverless/core';

@Controller('items')
@HeaderTenant()  // Adds x-tenant-code header to Swagger docs
export class ItemController {

  @Get()
  async list() {
    // Tenant code available via invokeContext
  }
}
```

The decorator adds the following header to Swagger:
- **Header name**: `x-tenant-code`
- **Required**: `true`
- **Description**: Current working tenant code

### `@SwaggerResponse(ApiResponse, options?)`

Method decorator factory that applies standardized error response documentation. Use with Swagger response decorators to document error responses.

```ts
import { SwaggerResponse } from '@mbc-cqrs-serverless/core';
import { ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';

@Controller('items')
export class ItemController {

  @Get(':id')
  @SwaggerResponse(ApiNotFoundResponse, { description: 'Item not found' })
  @SwaggerResponse(ApiBadRequestResponse, { description: 'Invalid ID format' })
  async getItem(@Param('id') id: string) {}
}
```

This decorator automatically includes the standard HttpExceptionResponse schema with status and message fields.

### `@Roles(...roles)`

Method/class decorator that specifies which roles can access an endpoint. Used internally by `@Auth()` but can be used directly with custom guards.

```ts
import { Roles } from '@mbc-cqrs-serverless/core';
import { UseGuards } from '@nestjs/common';
import { CustomGuard } from './guards/custom.guard';

@Controller('custom')
export class CustomController {

  @Get()
  @Roles('admin', 'manager')
  @UseGuards(CustomGuard)
  async protectedEndpoint() {}
}
```
