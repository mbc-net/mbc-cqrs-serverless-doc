---
description: Learn how to define entities, DTOs, and attributes for your domain.
---

# Entity Definition Patterns

This guide explains how to define entities, DTOs, and attributes in MBC CQRS Serverless applications. Proper entity definition ensures type safety, clear separation of read and write operations, and maintainable code.

## When to Use This Guide

Use this guide when you need to:

- Create a new domain entity (Product, Order, User, etc.)
- Define input validation for API endpoints
- Structure data for DynamoDB storage and RDS synchronization
- Implement pagination for list queries

## Problems This Pattern Solves

| Problem | Solution |
|---------|----------|
| No type safety for entity attributes | Define TypeScript interfaces for attributes |
| Same entity used for reads and writes causes confusion | Separate DataEntity (read) and CommandEntity (write) |
| Inconsistent validation across endpoints | Use DTOs with class-validator decorators |
| Missing audit fields (createdAt, updatedAt) | Base classes include standard audit fields |

## Entity Types Overview

The framework provides three base entity classes:

| Class | Purpose | Usage |
|-----------|-------------|-----------|
| `DataEntity` | Read operations | Query results from DynamoDB/RDS |
| `CommandEntity` | Write operations | Commands sent to DynamoDB |
| `DataListEntity` | Paginated lists | List responses with metadata |

## Data Entity

### Use Case: Return Data from API Queries

Scenario: Your API needs to return product information to the frontend.

Problem: Raw DynamoDB items lack type safety and may contain version suffixes in keys.

Solution: Use DataEntity to wrap query results with typed attributes and computed properties.

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

The `DataEntity` base class includes:

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

### Use Case: Create or Update Data via Commands

Scenario: User submits a form to create a new product or update an existing one.

Problem: Need to structure data for DynamoDB command publishing with proper keys and version.

Solution: Use CommandEntity to structure write operations with required fields for CQRS command processing.

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

### Use Case: Return Paginated Lists

Scenario: Frontend requests a list of products with pagination.

Problem: Need to return both the items and total count for pagination UI.

Solution: Use DataListEntity to wrap list results with total count and pagination cursor.

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

The `DataListEntity` base class includes:

```ts
// Inherited from DataListEntity
{
  total: number;        // Total count
  lastSk?: string;      // Last sort key for pagination
}
```

## Command DTO

### Use Case: Prepare Data for Command Publishing

Scenario: Service layer needs to create a command from validated input.

Solution: Use CommandDto to transform input data into the structure required by CommandService.

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

### Use Case: Define Business Data Structure

Scenario: Your entity has business-specific fields like price, status, and shipping information.

Solution: Define TypeScript interfaces that describe the structure of your domain data.

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

## Create/Update DTOs

### Use Case: Validate API Input

Scenario: API receives JSON from frontend and needs to validate before processing.

Problem: Invalid data (empty strings, negative prices) could corrupt your data store.

Solution: Use class-validator decorators to define validation rules that run automatically.

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

## Detail/Search DTOs

### Use Case: Query Parameters for List and Detail Endpoints

Scenario: Frontend sends query parameters for filtering, pagination, and detail lookups.

Solution: Define DTOs that validate query parameters and provide default values.

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

## Complete Domain Example

### Use Case: Full E-Commerce Order Domain

Scenario: Building an order management system with orders, items, shipping, and payment.

This example shows how all entity patterns work together in a real domain:

### Directory Structure

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

### Enums

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

## Best Practices

### 1. Separate Read and Write Entities

Use `DataEntity` for reads and `CommandEntity` for writes:

```ts
// Read operations return DataEntity
async findOne(key: DetailDto): Promise<OrderDataEntity>

// Write operations return DataEntity (after command is processed)
async create(dto: CreateOrderDto): Promise<OrderDataEntity>
```

### 2. Use Typed Attributes

Always define interfaces for attributes:

```ts
interface ProductAttributes {
  description: string;
  price: number;
  // ...
}

// Not this:
attributes: Record<string, any>  // Avoid
```

### 3. Add Computed Properties

Add getters for commonly accessed nested data:

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

### 4. Validate Input DTOs

Use class-validator for input validation:

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

### 5. Use Enums for Status Fields

Define enums for status and type fields:

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
