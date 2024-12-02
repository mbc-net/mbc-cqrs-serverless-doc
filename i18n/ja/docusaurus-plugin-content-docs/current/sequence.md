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

### *async* `generateSequenceItem( dto: GenerateFormattedSequenceDto, options?: {invokeContext:IInvoke}):  Promise<SequenceEntity>`


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
####  Response
The return value of this function  has type of `SequenceEntity` as follows:
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

####  Customizable
By default, the returned data includes the formattedNo field with the format `%%no%%`, where `no` represents the sequence number. If you want to define your own custom format, you can update the master data in DynamoDB with the following parameters:

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

#### Example

For example, if you want to add `code1` to `code5`,  `month`, `day `, `date`, `no` as well as `fiscal_year`, into your format, the format would look like this:
```json
{
  "format": "%%code2#:0>7%%-%%fiscal_year#:0>2%%-%%code3%%%%no#:0>3%%"
} 
```
In this format:
- Variables are written inside `%% <param> %%.`
- After the #, the length of the variable is specified, indicating the desired length of the field when the formatted sequence number is returned.
For instance:

- `%%code2#:0>7%%` ensures code2 is formatted to be 7 characters long, padding with leading zeros if necessary.
- `%%fiscal_year#:0>2%% `formats fiscal_year to a length of 2 characters.
- `%%code3%%` represents the code3 value as it is.
- `%%no#:0>3%%` ensures the sequence number (no) is formatted to be 3 digits long, padded with leading zeros if necessary.

If you want to calculate the fiscal_year starting from any specific month, you can add the startMonth field. For example, if you want the fiscal year to start from July, the format would look like this:
```
{
  "format": "%%code2#:0>7%%-%%fiscal_year#:0>2%%-%%code3%%%%no#:0>3%%",
  "startMonth": 7
}
```
In this case:
- startMonth: Defines the month to start the fiscal year (e.g., 7 for July).

If you want to calculate the fiscal year starting from a specific date, you can add the registerDate field, like this:

```
{
  "format": "%%code2#:0>7%%-%%fiscal_year#:0>2%%-%%code3%%%%no#:0>3%%",
  "registerDate": "2010-01-01"
}
```

In this case
- registerDate: Defines the exact start date of the fiscal year (e.g., "2010-01-01").

This allows you to customize the fiscal year calculation according to your specific business needs.

### *async* `getCurrentSequence(key: DetailKey): Promise<DataEntity>` <span class="badge badge--warning">deprecated</span>

:::info

Deprecated, for removal: This API element is subject to removal in a future version.

:::

### *async* `genNewSequence( dto: GenSequenceDto, options: {invokeContext: IInvoke}): Promise<DataEntity>` <span class="badge badge--warning">deprecated</span>

:::info

Deprecated, for removal: This API element is subject to removal in a future version. Use [`generateSequenceItem` method](#async-generatesequenceitem-dto-generateformattedsequencedto-options-invokecontextiinvoke--promisesequenceentity) instead.

:::


