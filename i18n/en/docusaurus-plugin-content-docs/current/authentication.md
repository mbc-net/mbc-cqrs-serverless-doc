---
description: Learn how to use and customize authentication and authorization.
---

# Authentication

Understanding authentication is crucial for protecting your application's data. This page will guide you through what mbc-cqrs-serverless features to use to implement auth.

Before starting, it helps to break down the process into three concepts:

1. **Authentication**: Verifies if the user is who they say they are. It requires the user to prove their identity with something they have, such as a username and password.

2. **Session Management**: Tracks the user's auth state across requests.

3. **Authorization**: Decides what routes and data the user can access.

The examples on this page walk through an [Amazon Cognito](https://aws.amazon.com/cognito/) app client, you can invoke API operations for authentication and authorization of your users.

## Authentication

We recommend you use [AWS Amplify](https://docs.amplify.aws/nextjs/) to integrate Amazon Cognito with your web and mobile apps. <br/> Once authenticated, the server will issue a JWT that can be sent as a [bearer token](https://datatracker.ietf.org/doc/html/rfc6750) in an authorization header on subsequent requests to prove authentication.

## Authorization

Once a user is authenticated, you can implement authorization to control what the user can access and do within your application. Authorization is orthogonal and independent from authentication. However, authorization requires an authentication mechanism. <br/> We use optimistic types of authorization check: Checks if the user is authorized to access a route or perform an action using the session data stored in the cookie. Specifically, we implement Role-Based Access Control (RBAC).

First, let's create a Role enum representing roles in the system:

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

In more sophisticated systems, you may store roles within a database, or pull them from the external authentication provider.

:::

Now that we have a custom Roles enum, we can use it to any route handler.

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

Then, we create a helper function that extracts information from the context.

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

Finally, we create a CustomRoleGuard class which will compare the roles assigned to the current user to the actual roles required by the current route being processed.

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
