---
description: ルーティング、認証、テナントコンテキスト用のMBC CQRS Serverlessデコレーターを使ったNestJSコントローラーの作成方法を学びます。
---

# コントローラ

コントローラーは、受信した **リクエスト**を処理し、**レスポンス**をクライアントに返す責務があります。

MBC サーバーレス フレームワークでのコントローラーの定義は NestJS の場合と同じであるため、[こちらのリンク](https://docs.nestjs.com/controllers) を参照してください。

:::note

コントローラ内で呼び出されたコンテキストを使用するには次の関数で取得します。

```ts
@INVOKE_CONTEXT() invokeContext: IInvoke,
```

:::

次の例では、基本的なコントローラーを定義するために必要な `@Controller()` デコレーターを使用します。 基本コントローラに `@Auth(ROLE_SYSTEM_ADMIN)` デコレータを認可の目的で指定します。そして `@ApiTags('cat')` を使用してコントローラーを特定のタグにアタッチします。

```ts
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ROLE_SYSTEM_ADMIN, INVOKE_CONTEXT, IInvoke, Auth } from '@mbc-cqrs-serverless/core';
import { CatService } from './cat.service';
import { CreateCatDto } from './create-cat.dto';

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

## デコレーター {#decorators}

フレームワークは、コントローラーでよく使用されるパターンを簡略化するためのいくつかのデコレーターを提供しています。

### `@INVOKE_CONTEXT()`

リクエストから呼び出しコンテキストを抽出するパラメーターデコレーター。Lambdaコンテキスト、JWTクレーム、リクエストメタデータへのアクセスを提供します。

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

認証とロールベースアクセス制御を適用するメソッド/クラスデコレーター。RolesGuardとSwaggerドキュメント（ApiBearerAuth、ApiUnauthorizedResponse）を組み合わせます。

```ts
import { Auth, ROLE_SYSTEM_ADMIN } from '@mbc-cqrs-serverless/core';

@Controller('admin')
@Auth(ROLE_SYSTEM_ADMIN)  // Class-level: applies to all methods (クラスレベル: すべてのメソッドに適用)
export class AdminController {

  @Post()
  @Auth(ROLE_SYSTEM_ADMIN)  // Method-level: override class decorator (メソッドレベル: クラスデコレーターを上書き)
  async create() {}
}
```

### `@HeaderTenant()`

Swaggerドキュメントにテナントコードヘッダー要件を追加するメソッド/クラスデコレーター。エンドポイントがテナントコードヘッダーを必要とする場合に使用します。

```ts
import { HeaderTenant } from '@mbc-cqrs-serverless/core';

@Controller('items')
@HeaderTenant()  // Adds x-tenant-code header to Swagger docs (Swaggerドキュメントにx-tenant-codeヘッダーを追加)
export class ItemController {

  @Get()
  async list() {
    // Tenant code available via invokeContext (invokeContext経由でテナントコードを取得可能)
  }
}
```

デコレーターはSwaggerに以下のヘッダーを追加します：
- **ヘッダー名**: `x-tenant-code`
- **必須**: `true`
- **説明**: 現在の作業テナントコード

### `@SwaggerResponse(ApiResponse, options?)`

標準化されたエラーレスポンスドキュメントを適用するメソッドデコレーターファクトリー。Swaggerレスポンスデコレーターと一緒に使用してエラーレスポンスを文書化します。

```ts
import { Controller, Get, Param } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { SwaggerResponse } from '@mbc-cqrs-serverless/core';

@Controller('items')
export class ItemController {

  @Get(':id')
  @SwaggerResponse(ApiNotFoundResponse, { description: 'Item not found' })
  @SwaggerResponse(ApiBadRequestResponse, { description: 'Invalid ID format' })
  async getItem(@Param('id') id: string) {}
}
```

このデコレーターは、statusとmessageフィールドを持つ標準的なHttpExceptionResponseスキーマを自動的に含めます。

### `@Roles(...roles)`

エンドポイントにアクセスできるロールを指定するメソッド/クラスデコレーター。`@Auth()`によって内部的に使用されますが、カスタムガードと直接使用することもできます。

:::info バージョン情報
[v1.3.1](/docs/changelog#v131) 以降、`RolesGuard` は直接ロール（`custom:roles`）とグループ派生ロール（`custom:groups`、`@GroupRoleResolver()` が設定されている場合）の両方をチェックします。既存の `@Roles()` 呼び出しは自動的に恩恵を受けます — コード変更は不要です。[グループベースロール](/docs/authentication#group-based-roles)を参照してください。
:::

```ts
import { Roles } from '@mbc-cqrs-serverless/core';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { CustomGuard } from './guards/custom.guard';

@Controller('custom')
export class CustomController {

  @Get()
  @Roles('admin', 'manager')
  @UseGuards(CustomGuard)
  async protectedEndpoint() {}
}
```


:::tip その他のフレームワークデコレーター
以下のデコレーターはコントローラーではなくプロバイダークラスに使用します — それぞれのガイドを参照してください：

- `@DataSyncHandler(tableName)` — クラスをDynamoDB Streamの同期ハンドラーとしてマーク → [データ同期ハンドラーの例](/docs/data-sync-handler-examples)
- `@EventHandler(EventClass)` — クラスをドメインイベントハンドラーとしてマーク → [タスク](/docs/tasks)
- `@EventFactory()` — クラスをイベントファクトリーとしてマーク → [タスク](/docs/tasks)
- `@GroupRoleResolver()` — グループからロールへのマッピングクラスを登録 → [認証 — グループベースロール](/docs/authentication#group-based-roles)
- `@NotificationTransport(name)` — カスタム通知トランスポートを登録 → [通知モジュール](/docs/notification-module)
:::

## 関連ドキュメント

- [認証](/docs/authentication) - Cognitoの認証とJWTの設定
- [モジュール](/docs/modules) - コントローラーのモジュール設定
- [バックエンド開発](/docs/backend-development) - 包括的なバックエンド開発ガイド
- [インターフェース](/docs/interfaces) - IInvokeとIInvokeContextインターフェース
- [サービスパターン](/docs/service-patterns) - CQRSパターンを使ったサービス層
