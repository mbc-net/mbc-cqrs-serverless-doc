---
description: Sequence setup and usage.
---

# Sequence

## 1. このサービスの目的は、システム内で動的なシーケンスを管理することです。

`SequenceModule` は、DynamoDB を主要なデータベースとして使用してシステム内で動的なシーケンスを管理するためのサービスです。

このサービスは次の目的で設計されています:

- シーケンスタイプ、テナント、日付などのパラメータに基づいて一意なシーケンス番号を生成します。
- 次のようなサイクルに基づいてシーケンスを自動的にリセットします:
  - 毎日。
  - 毎月。
  - 毎年。
  - 会計年度単位。

システムの特定の要件に従ってシーケンス番号をフォーマットします（例: TODO-PERSONAL-72-001）。
マルチテナントシステムでのデータの整合性と完全性を確保します。
## 2. 使用方法


`SequenceModule` の動作をカスタマイズする解決策は、静的な `register()` メソッドでオプションの `object` を渡すことです。オプションオブジェクトには、1 つのプロパティのみが含まれています。

- `enableController`: デフォルトのシーケンスコントローラーを有効または無効にします。

シーケンスモジュールの使用方法とシーケンスコントローラーの認証をカスタマイズする方法を示す簡単な例を作成します。

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

コントローラーのほかに、`SequenceService` を直接使用してサービスを注入することでシーケンスを生成できます。

SequenceService には 1 つのパブリックメソッドがあります。

```ts
async genNewSequence(
    dto: GenSequenceDto,
    opts: {
      invokeContext: IInvoke
    },
  )
```

GenSequenceDto オブジェクトで提供されたパラメータに基づいて新しいシーケンスを生成します。

### パラメータ

`dto: GenSequenceDto`
シーケンス生成の動作をカスタマイズするデータ転送オブジェクトです。そのプロパティには以下が含まれます:

- `date?: Date`
  - デフォルト: 現在の日付。
  - 説明: シーケンスが生成される日付を指定します。

- `rotateBy?: RotateByEnum`
  - デフォルト: なし。
  - オプション
    - fiscal_yearly
    - yearly
    - monthly
    - daily
    - none
  - 説明: シーケンスの回転タイプを決定します。

- `tenantCode: string`
  - 必須: はい。
  - 説明: テナントと用途のタイプコードを識別します。
  
- `params: SequenceParamsDto`
  - 必須: はい。
  - 説明: シーケンスを識別するためのパラメータを定義します。
    ```ts
    export class SequenceParamsDto {
      @IsString()
      code1: string

      @IsString()
      code2: string

      @IsOptional()
      @IsString()
      code3?: string

      @IsOptional()
      @IsString()
      code4?: string

      @IsOptional()
      @IsString()
      code5?: string

      constructor(partial: Partial<SequenceParamsDto>) {
        Object.assign(this, partial)
      }
    }
    ```
- `format?: string`
  - デフォルト: %%no%%。
  - シーケンスのカスタムフォーマットを指定します。例: 
  ```
  %%code1#:0>4%%-%%code2#:0>5%%-%%fiscal_year#:0>2%%-%%no#:0>3%%

- `startMonth?: number`
  - デフォルト: 4（4月）。
  - 説明: 会計年度の開始月を指定します。

- `registerDate?: Date`
  - デフォルト: 未指定。
  - 説明: 提供された日付に基づいて会計期間を計算します。


