---
description: 認証と認可の使用方法とカスタマイズ方法を学びます。
---

# 認証

認証を理解することは、アプリケーションのデータを保護するために重要です。このページでは、認証を実装するためにどのMBC CQRS サーバーレスフレームワーク機能を使用するかを説明します。

開始する前にプロセスを3つの概念に分類すると役立ちます。

1. **認証**: ユーザが本人であるかどうかを確認します。ユーザは、ユーザ名やパスワード等自身が持っているもので自分の身元を証明する必要があります。

2. **セッション管理**: リクエスト全体でユーザー認証状態を追跡します。

3. **認可**: ユーザがアクセスできるルートとデータを決定します。

このページの例ではユーザ認証を[Amazon Cognito](https://aws.amazon.com/cognito/) で行いAPI呼出時に認可を行っています。

## 認証

[AWS Amplify](https://docs.amplify.aws/nextjs/) を使用して、Amazon Cognito をウェブおよびモバイルアプリと統合することをお勧めします。 <br/> 認証が完了すると、サーバーは認証を証明するために、後続のリクエストの認証ヘッダーで [ベアラー トークン](https://datatracker.ietf.org/doc/html/rfc6750) として送信できる JWT を発行します 。

## 認可

ユーザーが認証されると、ユーザーがアプリケーション内でアクセスおよび実行できる内容を制御するための認可を実装できます。認可は直交しており、認証とは独立しています。ただし、認可には認証メカニズムが必要です。 <br/> 当社はオプティミスティックタイプの認可チェックを使用します。ユーザーがルートにアクセスするか、Cookie に保存されているセッションデータを使用してアクションを実行することが認可されているかどうかをチェックします。具体的には、ロールベースのアクセス制御 (RBAC) を実装します。

まずはじめにシステム内のロールを列挙型として定義しましょう。

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

より洗練されたシステムではロールをデータベースに保存したり外部認証プロバイダーからロールを取得することも出来ます。

:::

### システム管理者バイパス {#system-admin-bypass}

フレームワークには、組み込みのシステム管理者バイパス機構が含まれています。ユーザーが`system_admin`ロール（`ROLE_SYSTEM_ADMIN`定数として定義）を持っている場合、エンドポイントで要求される特定のロールに関係なく、すべてのロールベースの認可チェックを自動的にパスします。

```ts
// The RolesGuard automatically checks for system_admin role (RolesGuardはsystem_adminロールを自動的にチェック)
protected async verifyRole(context: ExecutionContext): Promise<boolean> {
  const requiredRoles = this.reflector.getAllAndOverride<string[]>(...)

  // If no roles required, allow all users (ロールが要求されていない場合、すべてのユーザーを許可)
  if (!requiredRoles || !requiredRoles.length) {
    return true
  }

  const userRole = await this.getUserRole(context)

  // System admin bypasses all role checks (システム管理者はすべてのロールチェックをバイパス)
  if (userRole === ROLE_SYSTEM_ADMIN) {
    return true
  }

  return requiredRoles.includes(userRole)
}
```

:::warning システム管理者の使用について
`system_admin`ロールは、すべてのAPIエンドポイントへの完全なアクセスが必要な信頼できる管理者にのみ、慎重に割り当てる必要があります。このロールはすべてのロールベースの制限をバイパスします。
:::

任意のルートハンドラーで先程のカスタムロールを使用する事が出来ます。

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

そして、コンテキストから情報を抽出するヘルパー関数を作成します。

```ts
// Event body example (イベントボディ例)
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

`getUserContext` 関数は `@mbc-cqrs-serverless/core` から提供されています。`custom:tenant` クレームから `tenantCode` を自動的に抽出し、`custom:roles` JSON配列内のテナントとマッチングして `tenantRole` を決定します。

:::

:::danger テナントコード正規化 - 破壊的変更
`getUserContext()` が返す `tenantCode` は、大文字小文字を区別しないマッチングのために小文字に正規化されます。例えば、`TenantA`、`TENANTA`、`tenanta` はすべて `tenanta` として返されます。これにより、`custom:roles` クレーム内の `role.tenant` 値との一貫したマッチングが保証されます。

**パーティションキーへの影響:** テナントコードは通常パーティションキーに含まれるため（例：`PRODUCT#tenantCode`）、この正規化はデータアクセスに影響します。既存のデータがキーに大文字のテナントコードを使用している場合、クエリはそのデータを見つけることができません。

**参照:** マイグレーション戦略については[テナントコード正規化マイグレーション](./data-migration-patterns#tenant-code-normalization-migration)を参照してください。
:::

カスタムロジックが必要な場合は、独自のヘルパー関数を実装できます：

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
  // Normalize tenant code to lowercase for case-insensitive matching (大文字小文字を区別しないマッチングのため小文字に正規化)
  const tenantCode = (
    claims["custom:tenant"] ||
    (ctx?.event?.headers || {})[HEADER_TENANT_CODE]
  )?.toLowerCase();

  // Parse roles from JSON array and find matching tenant role (JSON配列からロールをパースし、マッチするテナントロールを見つける)
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

最後に現在のユーザに割り当てられているロールと現在処理中のルートで必要なロールを比較するカスタムロールガードクラスを作成します。

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

## テナント検証 {#tenant-verification}

`RolesGuard`にはテナント検証用の拡張可能なメソッドが含まれており、クロステナントアクセスの動作をカスタマイズできます。

:::info Version Note
拡張可能なテナント検証メソッドは[バージョン1.1.0](/docs/changelog#v110)で追加されました。
:::

### 組み込みメソッド

以下のprotectedメソッドをオーバーライドしてテナント検証をカスタマイズできます：

| メソッド | Description | デフォルト動作 |
|------------|-----------------|----------------------|
| `isHeaderOverride()` | テナントコードがヘッダーからのものかを検出 | x-tenant-codeヘッダーがCognitoのcustom:tenantと異なる場合trueを返す |
| `canOverrideTenant()` | ユーザーがテナントをオーバーライドできるかチェック | system_adminロールの場合trueを返す |
| `getCommonTenantCodes()` | 共通テナントコードのリストを取得 | commonまたはCOMMON_TENANT_CODES環境変数の値を返す |
| `getCrossTenantRoles()` | クロステナントアクセス可能なロールを取得 | system_adminまたはCROSS_TENANT_ROLES環境変数の値を返す |

### セキュリティ: テナントコードヘッダーオーバーライド {#tenant-code-header-security}

デフォルトでは、`system_admin`ロールを持つユーザーのみが`x-tenant-code`ヘッダーでテナントコードをオーバーライドできます。これにより、不正なクロステナントアクセスを防止します。

```ts
// Default behavior in RolesGuard (RolesGuardのデフォルト動作)
protected canOverrideTenant(context: ExecutionContext): boolean {
  const userContext = getUserContext(context);
  const crossTenantRoles = this.getCrossTenantRoles();
  return crossTenantRoles.includes(userContext.tenantRole);
}
```

:::warning セキュリティ注意
v1.1.0より前のバージョンでは、`custom:tenant` Cognito属性を持たないユーザーが`x-tenant-code`ヘッダー経由で任意のテナントを指定でき、他のテナントのデータにアクセスできる可能性がありました。このセキュリティ問題はv1.1.0で修正されました。
:::

### 環境変数の設定

環境変数で共通テナントコードとクロステナントロールを設定できます：

```bash
# Comma-separated list of common tenant codes (カンマ区切りの共通テナントコードリスト)
COMMON_TENANT_CODES=common,shared,global

# Comma-separated list of roles that can access cross-tenant data (クロステナントデータにアクセスできるロールのカンマ区切りリスト)
CROSS_TENANT_ROLES=system_admin,general_manager
```

### カスタム実装例

カスタムクロステナントアクセスロジックを実装するには、`RolesGuard`を拡張して関連メソッドをオーバーライドします：

```ts
import { RolesGuard, getUserContext } from "@mbc-cqrs-serverless/core";
import { ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class CustomRolesGuard extends RolesGuard {
  // Allow additional roles to access cross-tenant data (追加ロールにクロステナントデータへのアクセスを許可)
  protected getCrossTenantRoles(): string[] {
    return ['system_admin', 'regional_manager', 'auditor'];
  }

  // Add custom common tenant codes (カスタム共通テナントコードを追加)
  protected getCommonTenantCodes(): string[] {
    return ['common', 'shared', 'template'];
  }

  // Custom logic for tenant override permission (テナントオーバーライド権限のカスタムロジック)
  protected canOverrideTenant(context: ExecutionContext): boolean {
    const userContext = getUserContext(context);

    // Allow specific users to override tenant (特定ユーザーにテナントオーバーライドを許可)
    if (userContext.tenantRole === 'regional_manager') {
      // Regional managers can only access tenants in their region (リージョナルマネージャーは自リージョンのテナントのみアクセス可能)
      return this.isRegionalManagerForTenant(userContext, context);
    }

    return super.canOverrideTenant(context);
  }

  private isRegionalManagerForTenant(userContext: UserContext, context: ExecutionContext): boolean {
    // Custom logic to verify regional access (リージョナルアクセスを検証するカスタムロジック)
    // ...
  }
}
```
