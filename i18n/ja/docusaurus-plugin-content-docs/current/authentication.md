---
description: 認証と認可の使用方法とカスタマイズ方法を学びます。
---

# 認証

認証を理解することは、アプリケーションのデータを保護するために重要です。このページでは、認証を実装するためにどのMBC CQRS サーバーレスフレームワーク機能を使用するかを説明します。

開始する前にプロセスを3つの概念に分類すると役立ちます。

1. **認証**: ユーザーが本人であるかどうかを確認します。ユーザーは、ユーザ名やパスワード等自身が持っているもので自分の身元を証明する必要があります。

2. **セッション管理**: リクエスト全体でユーザー認証状態を追跡します。

3. **認可**: ユーザーがアクセスできるルートとデータを決定します。

このページの例ではユーザー認証を[Amazon Cognito](https://aws.amazon.com/cognito/) で行いAPI呼出時に認可を行っています。

## 認証 {#authentication}

[AWS Amplify](https://docs.amplify.aws/nextjs/) を使用して、Amazon Cognito をウェブおよびモバイルアプリと統合することをお勧めします。 <br/> 認証が完了すると、サーバーは認証を証明するために、後続のリクエストの認証ヘッダーで [ベアラー トークン](https://datatracker.ietf.org/doc/html/rfc6750) として送信できる JWT を発行します 。

## アプリクライアントの書き込み権限 {#app-client-write-attributes}

Cognito アプリクライアントには、ユーザーが書き込める属性を `name` のみに制限する明示的な許可リストを設定します。`custom:roles`、`custom:tenant`、`custom:groups` などの認可属性は、呼び出し元の権限を確認したうえでサーバー側の `AdminUpdateUserAttributes` で管理してください。

```ts
const userPoolClient = new cdk.aws_cognito.UserPoolClient(this, 'apigw-client', {
  userPool,
  authFlows: { userPassword: true, userSrp: true },
  writeAttributes: new cdk.aws_cognito.ClientAttributes().withStandardAttributes({
    fullname: true,
  }),
})
```

:::warning 既知の問題（v1.8.1 で修正）
v1.8.1 より前の CLI テンプレートは `writeAttributes` を省略していたため、ログイン済みユーザーは自身のアクセストークンで認可属性を書き換え、ロールの追加、テナントの変更、特権グループへの参加ができました。修正はテンプレートのみが対象です。既存プロジェクトでは自身のスタックを変更してデプロイし、フロントエンドの更新処理を見直し、全ユーザーを監査してください。パッケージ更新だけでは不十分です。

ECS の権限、一時対処、監査手順は[変更履歴 v1.8.1](/docs/changelog#v181)と[移行ガイド v1.8.1](/docs/migration/v1.8.1)を参照してください。
:::

## 認可 {#authorization}

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
// Checks required roles from the @Auth() decorator (@Auth()デコレーターから必要なロールを確認)
protected async verifyRole(context: ExecutionContext): Promise<boolean> {
  const requiredRoles = this.reflector.getAllAndOverride<string[]>(...)

  // If no roles required, allow all users (ロールが要求されていない場合、すべてのユーザーを許可)
  if (!requiredRoles || !requiredRoles.length) {
    return true
  }

  const { tenantRoles, tenantGroupIds } = getUserContext(context)

  // System admin bypasses all role checks (システム管理者はすべてのロールチェックをバイパス)
  if (tenantRoles.includes(ROLE_SYSTEM_ADMIN)) {
    return true
  }

  // Check direct tenant roles, then group-derived roles (直接テナントロールを確認し、次にグループ由来のロールを確認)
  if (this.hasAnyRole(requiredRoles, tenantRoles)) return true
  const groupRoles = await this.resolveGroupRoles(context, tenantGroupIds)
  return this.hasAnyRole(requiredRoles, groupRoles)
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

ガードとサービスが同じテナント選択とスコープ別のロール・グループ解決を使用するよう、core の `getUserContext()` を使用してください。既定では JWT のホームテナントが優先され、明示的な選択のオプトインは以下で説明します。

:::

:::danger テナントコード正規化 - 破壊的変更
`getUserContext()` が返す `tenantCode` は、大文字小文字を区別しないマッチングのために小文字に正規化されます。例えば、`TenantA`、`TENANTA`、`tenanta` はすべて `tenanta` として返されます。これにより、`custom:roles` クレーム内の `role.tenant` 値との一貫したマッチングが保証されます。

**パーティションキーへの影響:** テナントコードは通常パーティションキーに含まれるため（例：`PRODUCT#tenantCode`）、この正規化はデータアクセスに影響します。既存のデータがキーに大文字のテナントコードを使用している場合、クエリはそのデータを見つけることができません。

**参照:** マイグレーション戦略については[テナントコード正規化マイグレーション](/docs/data-migration-patterns#tenant-code-normalization-migration)を参照してください。
:::

テナント検証を拡張する場合は `super.verifyTenant(context)` を維持し、その後にアプリケーションの検証を追加してください。ヘッダーを無条件に信頼するヘルパーで core のテナント解決を置き換えないでください。

## グループベースのロール {#group-based-roles}

:::info バージョン情報
グループベースのロール認可（`@GroupRoleResolver`、`custom:groups` クレーム、`UserContext.tenantRoles` / `tenantGroupIds`）は [バージョン 1.3.1](/docs/changelog#v131) で追加されました。
:::

`RolesGuard` はユーザーの実効ロールを 2 段階で解決します:

1. **直接ロール** — アクティブテナントに対する JWT の `custom:roles` クレームから読み取ります。
2. **グループ由来ロール** — 直接ロールが必要なロールを満たさない場合、ガードは `custom:groups` クレーム（テナントスコープ）に列挙されたユーザーのグループからロールを解決します。

グループからロールへのマッピングは JWT には保存され**ません**。アプリケーション側がリゾルバを実装して提供します。

### JWT クレーム

```json
{
  "custom:roles": "[{\"tenant\":\"tenant-a\",\"role\":\"admin\"}]",
  "custom:groups": "[{\"tenant\":\"tenant-a\",\"groups\":[\"sales-team\"]}]"
}
```

`getUserContext()` はこれらを `tenantRoles`（直接ロールの配列）と `tenantGroupIds`（アクティブテナントのグループ ID）として公開します。単数の `tenantRole` は後方互換性のため維持されます。

### リゾルバの実装

アプリケーションごとに**1 つだけ**リゾルバを実装し、モジュールの `providers` に登録します。`AuthModule` は `AppModule.forRoot()` 経由で自動的にインポートされます。

```typescript
import {
  GroupRoleResolver,
  IGroupRoleResolver,
  ResolveGroupRolesInput,
} from "@mbc-cqrs-serverless/core";

// Do not add @Injectable() — @GroupRoleResolver() already registers a singleton provider (@Injectable() を付けないでください — @GroupRoleResolver() が既にシングルトンプロバイダとして登録します)
@GroupRoleResolver()
export class AppGroupRoleResolver implements IGroupRoleResolver {
  async resolveRoles({
    tenantCode,
    groupIds,
    claims,
  }: ResolveGroupRolesInput): Promise<string[]> {
    // Map the user's group IDs to roles for this tenant (DynamoDB/RDS/config) (このテナントについて、ユーザーのグループ ID をロールにマッピングします（DynamoDB/RDS/設定）)
    return [];
  }
}
```

:::warning リゾルバのガイドライン
- **シングルトンのみ** — リゾルバはブートストラップ時に一度だけ解決されます。`REQUEST`/`TRANSIENT` スコープは使用しないでください。同じクラスに `@Injectable()` を付与するとスコープが上書きされブートストラップが壊れることがあります。
- **失敗は伝播させる** — リゾルバのエラーは暗黙の 403 ではなく 5xx として表面化するため、バックエンド障害を本来のアクセス拒否と区別できます。例外を握りつぶして許可しないでください。
- **ロール名は大文字小文字を区別** — `custom:roles` のロール名の大文字小文字を `@Roles(...)` の値と一致させてください。
:::

## 明示的なテナント選択（オプトイン） {#explicit-tenant-selection}

既定では JWT の `custom:tenant` が `x-tenant-code` より優先されます。`EXPLICIT_TENANT_SELECTION_CODES=common` を設定すると、条件を満たす呼び出し元が `common` を明示的に選択できます。他の空でないテナントコードも対象にする場合は `common,*` を使用します。既定値は空（無効）で、リクエスト時に読み取られます。

```bash
EXPLICIT_TENANT_SELECTION_CODES=common,*
```

選択には、対象テナントの `custom:roles` に空でない直接ロールがあるか、いずれかのテナントまたはグローバルエントリに `system_admin` が必要です。グループ所属だけ、または無関係なグローバルの `admin` ロールだけでは選択できません。テナント選択後もルートのロール検証が適用されます。

許可された明示的選択では、`tenantCode`、`tenantRole`、`tenantRoles`、`tenantGroupIds` は選択先テナントを表します。そのテナントの直接ロールとグループ ID のみを使用し、`admin` などの無関係なグローバルロールは引き継ぎません。どのスコープの `system_admin` も `tenantRoles` に維持され、`tenantRole` では優先されます。グループリゾルバーには選択先テナントとそのグループが渡されます。

| リクエスト | 解決結果 |
|---|---|
| 名前指定の対象、条件を満たす呼び出し元 | JWT のホームと異なる場合もヘッダーのテナントを選択 |
| 名前指定の対象、条件を満たさない呼び出し元 | JWT のホームを維持。ホームがなければテナント未解決 |
| ワイルドカード対象、条件を満たさない呼び出し元 | テナント未解決として拒否。ホームへフォールバックしない |
| 有効時にヘッダーなし、空、または空白 | ホームを維持。ホームがなければ拒否 |
| 有効時にリテラルの `*` ヘッダー | `system_admin` でも拒否 |

設定順に関係なく、名前指定は `*` より優先されます。そのため `common,*` は名前指定の `common` の互換フォールバックを維持しますが、`*` のみでは `common` もワイルドカード対象となり、選択条件が必要です。`RolesGuard` はロールメタデータのないルートでもテナント未解決を拒否します。

設定値はカンマ区切りで、前後の空白と重複を除去し、大文字小文字を区別しません。空のエントリは無視します。オプトイン対象のヘッダー値と、それに対応するロール・グループのテナントコードは前後の空白を除去して小文字化します。対象外のヘッダーは従来の正規化を維持します。

設定を有効にする前に、テナント未選択時は `x-tenant-code` を送信しないクライアントを先にデプロイしてください。条件を満たす呼び出し元にとって、以前に固定送信していた `common` も含め、対象ヘッダーは明示的な選択になります。ホームの admin でも選択先が user なら選択先の user 権限のみとなり、ホームの user でも選択先が admin なら選択先の admin 権限となります。

このオプトインは `COMMON_TENANT_CODES`（既定 `common`）と `CROSS_TENANT_ROLES`（既定 `system_admin`）とは独立しており、既定値は変わりません。カスタムガードとパッケージ固有のポリシーも適用されます。特に master パッケージのオプションのアクセスポリシーは、core が選択を許可しても、ホームテナントがない呼び出し元による common 以外へのアクセスを独立して拒否する場合があります。

:::info バージョン情報
明示的なテナント選択は[バージョン 1.8.2](/docs/changelog#v182)で追加されました。[移行ガイド v1.8.2](/docs/migration/v1.8.2)、[環境変数設定](/docs/environment-variables#explicit-tenant-selection)、[コンテキストヘルパー](/docs/helpers#explicit-tenant-context)を参照してください。
:::

## テナント検証 {#tenant-verification}

`RolesGuard`にはテナント検証用の拡張可能なメソッドが含まれており、クロステナントアクセスの動作をカスタマイズできます。

:::info バージョン情報
拡張可能なテナント検証メソッドは[バージョン1.1.0](/docs/changelog#v110)で追加されました。
:::

### 組み込みメソッド

以下のprotectedメソッドをオーバーライドしてテナント検証をカスタマイズできます：

| メソッド | 説明 | デフォルト動作 |
|------------|-----------------|----------------------|
| `isHeaderOverride()` | テナントコードがヘッダーからのものかを検出 | 空でない解決済みテナントが JWT のホームテナントと異なる場合に true を返す |
| `canOverrideTenant()` | ユーザーがテナントをオーバーライドできるかチェック | 検証済みの明示的選択を許可し、それ以外は従来の common テナントまたはクロステナントロールのポリシーを使用 |
| `getCommonTenantCodes()` | 共通テナントコードのリストを取得 | commonまたはCOMMON_TENANT_CODES環境変数の値を返す |
| `getCrossTenantRoles()` | クロステナントアクセス可能なロールを取得 | system_adminまたはCROSS_TENANT_ROLES環境変数の値を返す |

### セキュリティ: テナントコードヘッダーオーバーライド {#tenant-code-header-security}

明示的な選択が無効な場合、JWT のホームテナントがヘッダーより優先されます。ホームと一致しないヘッダー由来のテナントには、従来の common テナントまたはクロステナントロールの検証が適用されます。明示的な選択が有効な場合、core は選択先に対する直接所属または `system_admin` 権限を先に検証し、[上記のルール](/docs/authentication#explicit-tenant-selection)を適用します。

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
import { RolesGuard, getUserContext, UserContext } from "@mbc-cqrs-serverless/core";
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
  protected canOverrideTenant(context: ExecutionContext, userContext: UserContext): boolean {
    // Allow specific users to override tenant (特定ユーザーにテナントオーバーライドを許可)
    if (userContext.tenantRole === 'regional_manager') {
      // Regional managers can only access tenants in their region (リージョナルマネージャーは自リージョンのテナントのみアクセス可能)
      return this.isRegionalManagerForTenant(userContext, context);
    }

    return super.canOverrideTenant(context, userContext);
  }

  private isRegionalManagerForTenant(userContext: UserContext, context: ExecutionContext): boolean {
    // Custom logic to verify regional access (リージョナルアクセスを検証するカスタムロジック)
    // ...
  }
}
```


## 関連ドキュメント

- [セキュリティベストプラクティス](/docs/security-best-practices) - セキュリティ実装ガイドライン
- [マルチテナントパターン](/docs/multi-tenant-patterns) - テナントベースのアクセス制御
- [コントローラー](/docs/controllers) - コントローラーの認証デコレーター
- [環境変数](/docs/environment-variables) - Cognito設定変数
- [よくある問題 — GroupRoleResolver の DI 競合](/docs/common-issues#authentication-errors) - AP027 のトラブルシューティング
- [インターフェース — IGroupRoleResolver](/docs/interfaces#authorization-interfaces) - TypeScript インターフェースリファレンス
- [ヘルパー](/docs/helpers) - getUserContextとコンテキストヘルパー関数
