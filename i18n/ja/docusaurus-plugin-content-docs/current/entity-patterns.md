---
description: ドメイン用のエンティティ、DTO、属性の定義方法を学びます。
---

# エンティティ定義パターン

このガイドでは、MBC CQRS Serverlessアプリケーションでエンティティ、DTO、および属性を定義する方法を説明します。適切なエンティティ定義により、型安全性、読み取りと書き込み操作の明確な分離、保守可能なコードが保証されます。

## このガイドを使用するタイミング

以下が必要な場合にこのガイドを使用してください：

- 新しいドメインエンティティ（Product、Order、Userなど）を作成する
- APIエンドポイントの入力バリデーションを定義する
- DynamoDBストレージとRDS同期用のデータ構造を設計する
- リストクエリのページネーションを実装する

## このパターンが解決する問題

| 問題 | 解決策 |
|---------|----------|
| エンティティ属性に型安全性がない | 属性にTypeScriptインターフェースを定義する |
| 読み取りと書き込みに同じエンティティを使用すると混乱を招く | DataEntity（読み取り）とCommandEntity（書き込み）を分離する |
| エンドポイント間でバリデーションが不整合 | class-validatorデコレーター付きDTOを使用する |
| 監査フィールド（createdAt、updatedAt）が不足 | 基底クラスに標準監査フィールドを含める |

## エンティティタイプの概要

フレームワークは3つの基本エンティティクラスを提供します：

| クラス | 目的 | 用途 |
|-----------|-------------|-----------|
| `DataEntity` | 読み取り操作 | DynamoDB/RDSからのクエリ結果 |
| `CommandEntity` | 書き込み操作 | DynamoDBに送信されるコマンド |
| `DataListEntity` | ページネーションリスト | メタデータ付きのリストレスポンス |

## Data Entity

### ユースケース: APIクエリからデータを返す

シナリオ: APIがフロントエンドに商品情報を返す必要がある。

問題: 生のDynamoDBアイテムは型安全性がなく、キーにバージョンサフィックスが含まれる場合がある。

解決策: DataEntityを使用して、型付き属性と算出プロパティでクエリ結果をラップする。

```ts
import { DataEntity } from "@mbc-cqrs-serverless/core";

export interface ProductAttributes {
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  tags?: string[];
}

export class ProductDataEntity extends DataEntity {
  attributes: ProductAttributes;

  constructor(partial: Partial<ProductDataEntity>) {
    super(partial);
    Object.assign(this, partial);
  }
}
```

`DataEntity`基底クラスに含まれるもの：

```ts
// Inherited from DataEntity
{
  id: string;           // Unique identifier (pk#sk)
  pk: string;           // Partition key
  sk: string;           // Sort key
  tenantCode: string;   // Tenant identifier
  code: string;         // Business code
  type: string;         // Entity type
  name: string;         // Display name
  version: number;      // Version number
  seq?: number;         // Sequence number
  isDeleted?: boolean;  // Soft delete flag
  createdAt?: Date;     // Creation timestamp
  createdBy?: string;   // Creator identifier
  updatedAt?: Date;     // Update timestamp
  updatedBy?: string;   // Updater identifier
}
```

## Command Entity

### ユースケース: コマンドによるデータの作成・更新

シナリオ: ユーザーがフォームを送信して新しい商品を作成または既存の商品を更新する。

問題: 適切なキーとバージョンでDynamoDBコマンド発行用のデータ構造が必要。

解決策: CommandEntityを使用して、CQRSコマンド処理に必要なフィールドを持つ書き込み操作を構造化する。

```ts
import { CommandEntity } from "@mbc-cqrs-serverless/core";

export interface ProductAttributes {
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  tags?: string[];
}

export class ProductCommandEntity extends CommandEntity {
  attributes: ProductAttributes;

  constructor(partial: Partial<ProductCommandEntity>) {
    super();
    Object.assign(this, partial);
  }
}
```

## Data List Entity

### ユースケース: ページネーション付きリストを返す

シナリオ: フロントエンドがページネーション付きの商品リストを要求する。

問題: ページネーションUI用にアイテムと総数の両方を返す必要がある。

解決策: DataListEntityを使用して、総数とページネーションカーソル付きでリスト結果をラップする。

```ts
import { DataListEntity } from "@mbc-cqrs-serverless/core";
import { ProductDataEntity } from "./product-data.entity";

export class ProductListEntity extends DataListEntity {
  items: ProductDataEntity[];

  constructor(partial: Partial<ProductListEntity>) {
    super(partial);
    Object.assign(this, partial);
  }
}
```

`DataListEntity`基底クラスに含まれるもの：

```ts
// Inherited from DataListEntity
{
  total: number;        // Total count
  lastSk?: string;      // Last sort key for pagination
}
```

## Command DTO

### ユースケース: コマンド発行用データを準備する

シナリオ: サービス層がバリデーション済み入力からコマンドを作成する必要がある。

解決策: CommandDtoを使用して、入力データをCommandServiceが必要とする構造に変換する。

```ts
import { CommandDto } from "@mbc-cqrs-serverless/core";

export interface ProductAttributes {
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  tags?: string[];
}

export class ProductCommandDto extends CommandDto {
  attributes: ProductAttributes;

  constructor(partial: Partial<ProductCommandDto>) {
    super();
    Object.assign(this, partial);
  }
}
```

## Attributes DTO

### ユースケース: ビジネスデータ構造を定義する

シナリオ: エンティティに価格、ステータス、配送情報などのビジネス固有のフィールドがある。

解決策: ドメインデータの構造を記述するTypeScriptインターフェースを定義する。

```ts
// Simple attributes
export interface ProductAttributes {
  description: string;
  price: number;
  category: string;
  inStock: boolean;
}

// Complex attributes with nested objects
export interface OrderAttributes {
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  shipping: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  payment: {
    method: PaymentMethod;
    transactionId?: string;
    paidAt?: string;
  };
  totalAmount: number;
  currency: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

enum PaymentMethod {
  CREDIT_CARD = "CREDIT_CARD",
  BANK_TRANSFER = "BANK_TRANSFER",
  CASH_ON_DELIVERY = "CASH_ON_DELIVERY",
}
```

## Create/Update DTO

### ユースケース: API入力をバリデートする

シナリオ: APIがフロントエンドからJSONを受信し、処理前にバリデーションが必要。

問題: 無効なデータ（空文字列、負の価格）がデータストアを破損する可能性がある。

解決策: class-validatorデコレーターを使用して、自動実行されるバリデーションルールを定義する。

```ts
import { IsString, IsNumber, IsBoolean, IsOptional, Min } from "class-validator";

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  category: string;

  @IsBoolean()
  @IsOptional()
  inStock?: boolean;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  attributes?: Partial<ProductAttributes>;
}
```

## Detail/Search DTO

### ユースケース: リスト・詳細エンドポイントのクエリパラメータ

シナリオ: フロントエンドがフィルタリング、ページネーション、詳細検索用のクエリパラメータを送信する。

解決策: クエリパラメータをバリデートし、デフォルト値を提供するDTOを定義する。

```ts
import { IsString, IsOptional, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";

// For single item lookup
export class DetailDto {
  @IsString()
  pk: string;

  @IsString()
  sk: string;
}

// For list queries
export class SearchProductDto {
  @IsString()
  tenantCode: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

## 完全なドメイン例

### ユースケース: 完全なEコマース注文ドメイン

シナリオ: 注文、商品、配送、支払いを含む注文管理システムを構築する。

この例は、すべてのエンティティパターンが実際のドメインでどのように連携するかを示しています：

### ディレクトリ構造

```
src/order/
├── order.module.ts
├── order.service.ts
├── order.controller.ts
├── entity/
│   ├── order-data.entity.ts
│   ├── order-command.entity.ts
│   └── order-list.entity.ts
├── dto/
│   ├── order-command.dto.ts
│   ├── order-attributes.dto.ts
│   ├── create-order.dto.ts
│   ├── update-order.dto.ts
│   ├── detail.dto.ts
│   └── search-order.dto.ts
├── handler/
│   └── order-rds.handler.ts
└── constant/
    └── order.enum.ts
```

### 列挙型

```ts
// constant/order.enum.ts
export enum OrderStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export enum PaymentMethod {
  CREDIT_CARD = "CREDIT_CARD",
  DEBIT_CARD = "DEBIT_CARD",
  BANK_TRANSFER = "BANK_TRANSFER",
  DIGITAL_WALLET = "DIGITAL_WALLET",
  CASH_ON_DELIVERY = "CASH_ON_DELIVERY",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  AUTHORIZED = "AUTHORIZED",
  CAPTURED = "CAPTURED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}
```

### Attributes DTO

```ts
// dto/order-attributes.dto.ts
import { OrderStatus, PaymentMethod, PaymentStatus } from "../constant/order.enum";

export interface OrderItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export interface ShippingInfo {
  recipientName: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  instructions?: string;
}

export interface PaymentInfo {
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  authorizedAt?: string;
  capturedAt?: string;
}

export interface OrderAttributes {
  customerId: string;
  customerEmail: string;
  status: OrderStatus;
  items: OrderItem[];
  shipping: ShippingInfo;
  payment: PaymentInfo;
  subtotal: number;
  shippingFee: number;
  tax: number;
  discount: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  orderedAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
}
```

### Data Entity

```ts
// entity/order-data.entity.ts
import { DataEntity } from "@mbc-cqrs-serverless/core";
import { OrderAttributes } from "../dto/order-attributes.dto";

export class OrderDataEntity extends DataEntity {
  attributes: OrderAttributes;

  constructor(partial: Partial<OrderDataEntity>) {
    super(partial);
    Object.assign(this, partial);
  }

  // Computed properties
  get status(): string {
    return this.attributes?.status;
  }

  get totalAmount(): number {
    return this.attributes?.totalAmount ?? 0;
  }

  get itemCount(): number {
    return this.attributes?.items?.length ?? 0;
  }
}
```

### Command Entity

```ts
// entity/order-command.entity.ts
import { CommandEntity } from "@mbc-cqrs-serverless/core";
import { OrderAttributes } from "../dto/order-attributes.dto";

export class OrderCommandEntity extends CommandEntity {
  attributes: OrderAttributes;

  constructor(partial: Partial<OrderCommandEntity>) {
    super();
    Object.assign(this, partial);
  }
}
```

### List Entity

```ts
// entity/order-list.entity.ts
import { DataListEntity } from "@mbc-cqrs-serverless/core";
import { OrderDataEntity } from "./order-data.entity";

export class OrderListEntity extends DataListEntity {
  items: OrderDataEntity[];

  constructor(partial: Partial<OrderListEntity>) {
    super(partial);
    Object.assign(this, partial);
  }
}
```

### Command DTO

```ts
// dto/order-command.dto.ts
import { CommandDto } from "@mbc-cqrs-serverless/core";
import { OrderAttributes } from "./order-attributes.dto";

export class OrderCommandDto extends CommandDto {
  attributes: OrderAttributes;

  constructor(partial: Partial<OrderCommandDto>) {
    super();
    Object.assign(this, partial);
  }
}
```

### Create DTO

```ts
// dto/create-order.dto.ts
import {
  IsString,
  IsEmail,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

class CreateOrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

class CreateShippingDto {
  @IsString()
  recipientName: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  postalCode: string;

  @IsString()
  country: string;

  @IsString()
  @IsOptional()
  instructions?: string;
}

export class CreateOrderDto {
  @IsString()
  customerId: string;

  @IsEmail()
  customerEmail: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ValidateNested()
  @Type(() => CreateShippingDto)
  shipping: CreateShippingDto;

  @IsString()
  @IsOptional()
  notes?: string;
}
```

### Update DTO

```ts
// dto/update-order.dto.ts
import { IsString, IsEnum, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { OrderStatus, PaymentStatus } from "../constant/order.enum";

class UpdateShippingDto {
  @IsString()
  @IsOptional()
  recipientName?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  instructions?: string;
}

export class UpdateOrderDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ValidateNested()
  @Type(() => UpdateShippingDto)
  @IsOptional()
  shipping?: UpdateShippingDto;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdatePaymentDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsString()
  @IsOptional()
  transactionId?: string;
}
```

### Search DTO

```ts
// dto/search-order.dto.ts
import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, IsDateString } from "class-validator";
import { Type } from "class-transformer";
import { OrderStatus } from "../constant/order.enum";

export class SearchOrderDto {
  @IsString()
  tenantCode: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsDateString()
  @IsOptional()
  orderedFrom?: string;

  @IsDateString()
  @IsOptional()
  orderedTo?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minAmount?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxAmount?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  sortBy?: "orderedAt" | "totalAmount" | "status" = "orderedAt";

  @IsString()
  @IsOptional()
  sortOrder?: "asc" | "desc" = "desc";
}
```

## ベストプラクティス

### 1. 読み取りと書き込みのエンティティを分離する

読み取りには`DataEntity`、書き込みには`CommandEntity`を使用します：

```ts
// Read operations return DataEntity
async findOne(key: DetailDto): Promise<OrderDataEntity>

// Write operations return DataEntity (after command is processed)
async create(dto: CreateOrderDto): Promise<OrderDataEntity>
```

### 2. 型付き属性を使用する

常に属性にインターフェースを定義します：

```ts
interface ProductAttributes {
  description: string;
  price: number;
  // ...
}

// Not this:
attributes: Record<string, any>  // Avoid
```

### 3. 算出プロパティを追加する

よくアクセスされるネストされたデータにはgetterを追加します：

```ts
export class OrderDataEntity extends DataEntity {
  attributes: OrderAttributes;

  get totalAmount(): number {
    return this.attributes?.totalAmount ?? 0;
  }

  get isPaid(): boolean {
    return this.attributes?.payment?.status === PaymentStatus.CAPTURED;
  }
}
```

### 4. 入力DTOをバリデートする

入力バリデーションにはclass-validatorを使用します：

```ts
import { IsString, IsNumber, Min, IsEmail } from "class-validator";

export class CreateOrderDto {
  @IsEmail()
  customerEmail: string;

  @IsNumber()
  @Min(0)
  totalAmount: number;
}
```

### 5. ステータスフィールドには列挙型を使用する

ステータスとタイプフィールドには列挙型を定義します：

```ts
enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  // ...
}

// In DTO
@IsEnum(OrderStatus)
status: OrderStatus;
```
