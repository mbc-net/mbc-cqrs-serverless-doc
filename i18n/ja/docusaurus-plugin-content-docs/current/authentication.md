---
description: 認証と認可の使用方法とカスタマイズ方法を学びます。
---

# 認証

認証を理解することは、アプリケーションのデータを保護するために重要です。このページでは、認証を実装するためにどの mbc-cqrs-serverless 機能を使用するかを説明します。

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
import { ROLE_SYSTEM_ADMIN } from "@mbc-cqrs-severless/core";

export enum Role {
  SYSTEM_ADMIN = ROLE_SYSTEM_ADMIN,
  USER = "user",
  ADMIN = "admin",
}
```

:::tip

より洗練されたシステムではロールをデータベースに保存したり外部認証プロバイダーからロールを取得することも出来ます。

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

最後に現在のユーザに割り当てられているロールと現在処理中のルートで必要なロールを比較するカスタムロールガードクラスを作成します。

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
