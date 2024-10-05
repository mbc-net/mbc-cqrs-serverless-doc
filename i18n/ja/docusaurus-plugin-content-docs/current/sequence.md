---
description: シーケンスのセットアップと使用方法。
---

# シーケンス

シーケンスは **動的モジュール** です。アプリケーションで番号を採番する際に使用されます。

`SequenceModule` の動作をカスタマイズする解決策は、静的な `register()` メソッドでオプションの `object` を渡すことです。オプション オブジェクトには、プロパティが 1 つだけ含まれています。

- `enableController`: デフォルトのシーケンスコントローラーを有効または無効にします。

シーケンス モジュールの使用方法とシーケンス コントローラーの認証のカスタマイズ方法を示す簡単な例を作成します。

```ts
// seq.controller.ts
import { SequencesController } from "@mbc-cqrs-serverless/sequence";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Auth } from "src/auth/auth.decorator";
import { ROLE } from "src/auth/role.enum";

@Controller("api/sequence")
@ApiTags("sequence")
@Auth(ROLE.JCCI_ADMIN)
export class SeqController extends SequencesController {}
```

```ts
// seq.module.ts
import { SequencesModule } from "@mbc-cqrs-serverless/sequence";
import { Module } from "@nestjs/common";

import { SeqController } from "./seq.controller";

@Module({
  imports: [SequencesModule.register({ enableController: false })],
  controllers: [SeqController],
  exports: [SequencesModule],
})
export class SeqModule {}
```

コントローラーのほかに、`SequenceService` を直接使用して、サービスを注入することでシーケンスを生成できます。

`SequenceService` にはパブリック メソッドが 1 つだけあります。

```ts
async genNewSequence(
    dto: GenSequenceDto,
    opts: {
      invokeContext: IInvoke
    },
  )
```

`GenSequenceDto` オブジェクトに特定のプロパティを指定することで、関数の動作を変更できます。

- date?: Date`: デフォルトでは、関数は現在の日付を使用しますが、特定の日付が指定された場合は、代わりにその日付をベースに採番します。
- `rotateBy?: RotateByEnum`: RotateByEnum から 5 つの値 (fical_yearly、yearly、monthly、daily、none) のいずれかを選択できます。デフォルトでは、none タイプが使用されます。
- `tenantCode` および `typeCode`: テナントを識別するためのテナント コードと、使用目的に応じた種別コードを指定する必要があります。
