---
description: { { description } }
---

# {{title}}

{{intro_text}}

{{concepts_intro}}

1. **{{auth_concept}}**: {{auth_description}}

2. **{{session_concept}}**: {{session_description}}

3. **{{authorization_concept}}**: {{authorization_description}}

{{examples_intro}}

<!-- ![{{image_alt_text}}]({{image_url}}) -->

## {{auth_section_title}}

{{auth_section_text}}

## {{authorization_section_title}}

{{authorization_section_text}}

{{role_enum_intro}}

```ts
// role.enum.ts
import { ROLE_SYSTEM_ADMIN } from "@mbc-cqrs-severless/core";

export enum Role {
  SYSTEM_ADMIN = ROLE_SYSTEM_ADMIN,
  USER = "user",
  ADMIN = "admin",
}
```

:::tip

{{role_enum_hint}}

:::

{{role_enum_usage}}

```ts
@Post()
@Auth(Role.SYSTEM_ADMIN)
async create(
  @INVOKE_CONTEXT() invokeContext: IInvoke,
  @Body() createCatDto: CreateCatDto,
) {
  return this.catsService.create(createCatDto, { invokeContext })
}
```

{{context_helper_function_intro}}

```ts
// Event body example
// {
//     "claims": {
//       "cognito:username": "9999#admin",
//       "auth_time": 1717576015,
//       "email_verified": false,
//       "event_id": "b6642f6e-baf7-4a83-a912-ad559a87c327",
//       "iat": 1717576015,
//       "jti": "ee7bef16-0ea5-451a-a715-7e8baf1e6cdc",
//       "sub": "92ca4f68-9ac6-4080-9ae2-2f02a86206a4",
//       "token_use": "id",
//       "custom:cci_code": "9999",
//       "custom:company_code": "999900000",
//       "custom:member_id": "MEMBER#9999#9999000000#99999",
//       "custom:user_type": "admin",
//       "exp": 1717662415,
//       "aud": "dnk8y7ii3wled35p3lw0l2cd7",
//       "iss": "http://localhost:9229/local_2G7noHgW"
//     }
//   }
import {
  extractInvokeContext,
  getAuthorizerClaims,
  HEADER_TENANT_CODE,
  IInvoke,
  UserContext,
} from "@mbc-cqrs-severless/core";
import { ExecutionContext } from "@nestjs/common";

export const getUserContext = (
  ctx: IInvoke | ExecutionContext
): UserContext => {
  if ("getHandler" in ctx) {
    ctx = extractInvokeContext(ctx);
  }
  const claims = getAuthorizerClaims(ctx);

  const userId = claims.sub;
  const tenantCode =
    claims["custom:cci_code"] ||
    (ctx?.event?.headers || {})[HEADER_TENANT_CODE];
  const tenantRole = claims["custom:user_type"];
  return {
    userId,
    tenantRole,
    tenantCode,
  };
};
```

{{custom_role_guard_intro}}

```ts
import { RolesGuard } from "@mbc-cqrs-severless/core";
import { ExecutionContext, Injectable } from "@nestjs/common";

import { getUserContext } from "./user.context";

@Injectable()
export class CustomRoleGuard extends RolesGuard {
  protected async getUserRole(context: ExecutionContext): Promise<string> {
    const userContext = getUserContext(context);

    return userContext.tenantRole;
  }

  protected async verifyTenant(context: ExecutionContext): Promise<boolean> {
    const userContext = getUserContext(context);

    return !!userContext.tenantCode;
  }
}
```
