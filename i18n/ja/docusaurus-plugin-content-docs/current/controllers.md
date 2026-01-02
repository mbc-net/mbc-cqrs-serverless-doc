---
description: ルーティングの基礎を学びます。
---

# コントローラ

コントローラーは、受信した **リクエスト**を処理し、**レスポンス**をクライアントに返す責務があります。

MBC サーバーレス フレームワークでのコントローラーの定義は Nest.js の場合と同じであるため、[Nest.js内のリンク](https://docs.nestjs.com/controllers) を使用してこのセクションを参照してください。

:::note

コントローラ内で呼び出されたコンテキストを使用するには次の関数で取得します。

```ts
@INVOKE_CONTEXT() invokeContext: IInvoke,
```

:::

次の例では、基本的なコントローラーを定義するために必要な `@Controller()` デコレーターを使用します。 基本コントローラに `@Auth(ROLE_SYSTEM_ADMIN)` デコレータを認可の目的で指定します。そして `@ApiTags('cat')` を使用してコントローラーを特定のタグにアタッチします。

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
