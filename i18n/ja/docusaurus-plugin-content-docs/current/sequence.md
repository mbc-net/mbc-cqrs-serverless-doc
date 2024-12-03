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

The `SequenceService` have three public methods:

### *async* `generateSequenceItem( dto: GenerateFormattedSequenceDto, options: {invokeContext:IInvoke}):  Promise<SequenceEntity>`


Generates a new sequence based on the parameters provided in the GenerateFormattedSequenceDto object.

#### パラメータ

`dto: GenerateFormattedSequenceDto`
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

- `typeCode: string`
  - 必須: はい。
  - 説明: テナントと用途のタイプコードを識別します。
  
- `params?: SequenceParamsDto`
  - Required: No.
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
####  Response
この関数の戻り値は次のような `SequenceEntity` 型になります。
  ```ts
  export class SequenceEntity {
    id: string
    no: number
    formattedNo: string
    issuedAt: Date

    constructor(partial: Partial<SequenceEntity>) {
      Object.assign(this, partial)
    }
  }
  ```

####  カスタマイズ方法
デフォルトでは、返されるデータには、「%%no%%」形式の formattedNo フィールドが含まれます。「no」はシーケンス番号を表します。独自のカスタム形式を定義したい場合は、次のパラメータを使用して DynamoDB のマスター データを更新できます。

- PK: `MASTER${KEY_SEPARATOR}${tenantCode}`
- SK: ` SEQ${KEY_SEPARATOR}${typeCode}`


The data structure should be as follows:
  ```json 
    {
      "format": "string",
      "registerTime": "string",
      "registerMonth": "number"
    }
  ```

#### 例

たとえば、「code1」から「code5」、「month」、「day」、「date」、「no」、および「fiscal_year」をフォーマットに追加する場合、フォーマットは次のようになります。
```json
{
  "format": "%%code2#:0>7%%-%%fiscal_year#:0>2%%-%%code3%%%%no#:0>3%%"
} 
```
このフォーマットでは:
- 変数は `%% <param> %%` 内に記述されます。
- `#` の後に変数の長さを指定し、フォーマットされたシーケンス番号が返されるときに必要なフィールドの長さを示します。
例えば:

- `%%code2#:0>7%%` は、code2 が 7 文字の長さにフォーマットされ、必要に応じて先頭にゼロが埋め込まれます。
- `%%fiscal_year#:0>2%% `は、fiscal_year を 2 文字の長さにフォーマットします。
- `%%code3%%` は code3 の値をそのまま表します。
- `%%no#:0>3%%` は、シーケンス番号 (no) が 3 桁の長さにフォーマットされ、必要に応じて先頭にゼロが埋め込まれることを保証します。

特定の月から始まる会計年度を計算したい場合は、「startMonth」フィールドを追加できます。たとえば、会計年度を 3 月から開始する場合、形式は次のようになります。
```
{
  "format": "%%code2#:0>7%%-%%fiscal_year#:0>2%%-%%code3%%%%no#:0>3%%",
  "startMonth": 3
}
```
この場合:
- startMonth: 会計年度を開始する月を定義します (例: 3 月の場合は 3)。

特定の日付 (例: 2005-01-01) から始まる会計年度を計算したい場合は、次のように `registerDate` フィールドを追加できます。

```
{
  "format": "%%code2#:0>7%%-%%fiscal_year#:0>2%%-%%code3%%%%no#:0>3%%",
  "registerDate": "2005-01-01"
}
```

この場合
- registerDate: 会計年度の正確な開始日を定義します (例: "2005-01-01")。

これにより、特定のビジネス ニーズに応じて会計年度の計算をカスタマイズできます。

### *async* `getCurrentSequence(key: DetailKey): Promise<DataEntity>` <span class="badge badge--warning">非推奨</span>

:::info

非推奨、削除予定: この API 要素は将来のバージョンで削除される可能性があります

:::

### *async* `genNewSequence( dto: GenSequenceDto, options: {invokeContext: IInvoke}): Promise<DataEntity>` <span class="badge badge--warning">非推奨</span>

:::info

非推奨、削除予定: この API 要素は将来のバージョンで削除される可能性があります。代わりに [`generateSequenceItem` メソッド](#async-generatesequenceitem-dto-generateformattedsequencedto-options-invokecontextiinvoke--promisesequenceentity) を使用してください

:::


