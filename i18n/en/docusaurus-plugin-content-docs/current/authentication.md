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
import { ROLE_SYSTEM_ADMIN } from "@mbc-cqrs-serverless/core";

export enum Role {
  SYSTEM_ADMIN = ROLE_SYSTEM_ADMIN,
  USER = "user",
  ADMIN = "admin",
}
```

:::tip

In more sophisticated systems, you may store roles within a database, or pull them from the external authentication provider.

:::

### System Admin Bypass {#system-admin-bypass}

The framework includes a built-in system admin bypass mechanism. When a user has the `system_admin` role (defined as `ROLE_SYSTEM_ADMIN` constant), they automatically pass all role-based authorization checks, regardless of the specific roles required by the endpoint.

```ts
// The RolesGuard automatically checks for system_admin role
protected async verifyRole(context: ExecutionContext): Promise<boolean> {
  const requiredRoles = this.reflector.getAllAndOverride<string[]>(...)

  // If no roles required, allow all users
  if (!requiredRoles || !requiredRoles.length) {
    return true
  }

  const userRole = await this.getUserRole(context)

  // System admin bypasses all role checks
  if (userRole === ROLE_SYSTEM_ADMIN) {
    return true
  }

  return requiredRoles.includes(userRole)
}
```

:::warning System Admin Usage
The `system_admin` role should be assigned sparingly and only to trusted administrators who need full access to all API endpoints. This role bypasses all role-based restrictions.
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
//       "custom:tenant": "9999",
//       "custom:company_code": "999900000",
//       "custom:member_id": "MEMBER#9999#9999000000#99999",
//       "custom:roles": "[{\"tenant\":\"\",\"role\":\"user\"},{\"tenant\":\"9999\",\"role\":\"admin\"}]",
//       "exp": 1717662415,
//       "aud": "dnk8y7ii3wled35p3lw0l2cd7",
//       "iss": "http://localhost:9229/local_2G7noHgW"
//     }
//   }
import {
  extractInvokeContext,
  getAuthorizerClaims,
  getUserContext,
  HEADER_TENANT_CODE,
  IInvoke,
  UserContext,
} from "@mbc-cqrs-serverless/core";
import { ExecutionContext } from "@nestjs/common";
```

:::tip

The `getUserContext` function is provided by `@mbc-cqrs-serverless/core`. It automatically extracts `tenantCode` from `custom:tenant` claim and determines `tenantRole` by matching the tenant in the `custom:roles` JSON array.

:::

:::danger Tenant Code Normalization - Breaking Change
The `tenantCode` returned by `getUserContext()` is normalized to lowercase for case-insensitive matching. For example, `TenantA`, `TENANTA`, and `tenanta` are all returned as `tenanta`. This ensures consistent matching with `role.tenant` values in the `custom:roles` claim.

**Impact on partition keys:** Since tenant codes are typically included in partition keys (e.g., `PRODUCT#tenantCode`), this normalization affects data access. If your existing data uses uppercase tenant codes in keys, queries will fail to find that data.

**See also:** [Tenant Code Normalization Migration](./data-migration-patterns#tenant-code-normalization-migration) for migration strategies.
:::

If you need custom logic, you can implement your own helper function:

```ts
import {
  extractInvokeContext,
  getAuthorizerClaims,
  HEADER_TENANT_CODE,
  IInvoke,
  CustomRole,
} from "@mbc-cqrs-serverless/core";
import { ExecutionContext } from "@nestjs/common";

interface UserContext {
  userId: string;
  tenantRole: string;
  tenantCode: string;
}

export const getCustomUserContext = (
  ctx: IInvoke | ExecutionContext
): UserContext => {
  if ("getHandler" in ctx) {
    ctx = extractInvokeContext(ctx);
  }
  const claims = getAuthorizerClaims(ctx);

  const userId = claims.sub;
  // Normalize tenant code to lowercase for case-insensitive matching
  const tenantCode = (
    claims["custom:tenant"] ||
    (ctx?.event?.headers || {})[HEADER_TENANT_CODE]
  )?.toLowerCase();

  // Parse roles from JSON array and find matching tenant role
  const roles = (
    JSON.parse(claims["custom:roles"] || "[]") as CustomRole[]
  ).map((role) => ({ ...role, tenant: (role.tenant || "").toLowerCase() }));

  let tenantRole = "";
  for (const { tenant, role } of roles) {
    if (tenant === "" || tenant === tenantCode) {
      tenantRole = role;
      if (tenant !== "") {
        break;
      }
    }
  }

  return {
    userId,
    tenantRole,
    tenantCode,
  };
};
```

Finally, we create a CustomRoleGuard class which will compare the roles assigned to the current user to the actual roles required by the current route being processed.

```ts
import { RolesGuard } from "@mbc-cqrs-serverless/core";
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

## Tenant Verification {#tenant-verification}

The `RolesGuard` includes extensible methods for tenant verification, allowing you to customize cross-tenant access behavior.

:::info Version Note
Extensible tenant verification methods were added in [version 1.1.0](/docs/changelog#v110).
:::

### Built-in Methods

The following protected methods can be overridden to customize tenant verification:

| Method | Description | Default Behavior |
|------------|-----------------|----------------------|
| `isHeaderOverride()` | Detect if tenant code comes from header | Returns true if x-tenant-code header differs from Cognito custom:tenant |
| `canOverrideTenant()` | Check if user can override tenant | Returns true for system_admin role |
| `getCommonTenantCodes()` | Get list of common tenant codes | Returns common or value from COMMON_TENANT_CODES env var |
| `getCrossTenantRoles()` | Get roles that can access cross-tenant | Returns system_admin or value from CROSS_TENANT_ROLES env var |

### Security: Tenant Code Header Override {#tenant-code-header-security}

By default, only users with the `system_admin` role can override the tenant code via the `x-tenant-code` header. This prevents unauthorized cross-tenant access.

```ts
// Default behavior in RolesGuard
protected canOverrideTenant(context: ExecutionContext): boolean {
  const userContext = getUserContext(context);
  const crossTenantRoles = this.getCrossTenantRoles();
  return crossTenantRoles.includes(userContext.tenantRole);
}
```

:::warning Security Note
In versions prior to v1.1.0, users without a `custom:tenant` Cognito attribute could specify any tenant via the `x-tenant-code` header, potentially accessing data from other tenants. This security issue has been fixed in v1.1.0.
:::

### Environment Variable Configuration

You can configure common tenant codes and cross-tenant roles via environment variables:

```bash
# Comma-separated list of common tenant codes
COMMON_TENANT_CODES=common,shared,global

# Comma-separated list of roles that can access cross-tenant data
CROSS_TENANT_ROLES=system_admin,general_manager
```

### Custom Implementation Example

To implement custom cross-tenant access logic, extend `RolesGuard` and override the relevant methods:

```ts
import { RolesGuard, getUserContext } from "@mbc-cqrs-serverless/core";
import { ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class CustomRolesGuard extends RolesGuard {
  // Allow additional roles to access cross-tenant data
  protected getCrossTenantRoles(): string[] {
    return ['system_admin', 'regional_manager', 'auditor'];
  }

  // Add custom common tenant codes
  protected getCommonTenantCodes(): string[] {
    return ['common', 'shared', 'template'];
  }

  // Custom logic for tenant override permission
  protected canOverrideTenant(context: ExecutionContext): boolean {
    const userContext = getUserContext(context);

    // Allow specific users to override tenant
    if (userContext.tenantRole === 'regional_manager') {
      // Regional managers can only access tenants in their region
      return this.isRegionalManagerForTenant(userContext, context);
    }

    return super.canOverrideTenant(context);
  }

  private isRegionalManagerForTenant(userContext: UserContext, context: ExecutionContext): boolean {
    // Custom logic to verify regional access
    // ...
  }
}
```
