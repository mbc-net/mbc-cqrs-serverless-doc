---
description: Learn how to implement service layer with CRUD operations using CommandService and DataService.
---

# Service Implementation Patterns

This guide explains how to implement service classes that handle CRUD operations in MBC CQRS Serverless. Services are the core of your business logic, coordinating between controllers, commands, and data access.

## When to Use This Guide

Use this guide when you need to:

- Build a service layer for a new domain entity
- Implement create, read, update, delete (CRUD) operations
- Handle multi-tenant data isolation
- Use optimistic locking for concurrent updates
- Implement batch operations for bulk data processing

## Problems This Pattern Solves

| Problem | Solution |
|---------|----------|
| Direct database access bypasses CQRS pattern | Use CommandService for writes, DataService for reads |
| No audit trail for data changes | Pass invokeContext to capture user and timestamp |
| Concurrent updates overwrite each other | Use version field for optimistic locking |
| Slow responses due to synchronous processing | Use publishAsync for non-blocking command publishing |

## Basic Service Structure

A typical service uses both `CommandService` for write operations and `DataService` for read operations:

```ts
import {
  CommandService,
  DataService,
  generateId,
  getUserContext,
  IInvoke,
  VERSION_FIRST,
  KEY_SEPARATOR,
} from "@mbc-cqrs-serverless/core";
import { Injectable } from "@nestjs/common";
import { ulid } from "ulid";

import { PrismaService } from "src/prisma";
import { ProductCommandDto } from "./dto/product-command.dto";
import { ProductDataEntity } from "./entity/product-data.entity";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

const PRODUCT_PK_PREFIX = "PRODUCT";

@Injectable()
export class ProductService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
    private readonly prismaService: PrismaService,
  ) {}

  // CRUD methods will be implemented below
}
```

## Create Operation

### Use Case: Create a New Product

Scenario: User submits a form to add a new product to the catalog.

Flow: Controller receives CreateProductDto → Service generates keys → Command published to DynamoDB → Data synced to RDS.

```ts
async create(
  createDto: CreateProductDto,
  opts: { invokeContext: IInvoke },
): Promise<ProductDataEntity> {
  // Get tenant context from the invoke context
  const { tenantCode } = getUserContext(opts.invokeContext);

  // Generate PK and SK
  const pk = `${PRODUCT_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`;
  const sk = ulid(); // Use ULID for sortable unique ID
  const id = generateId(pk, sk);

  // Create command DTO
  const command = new ProductCommandDto({
    pk,
    sk,
    id,
    tenantCode,
    code: sk,
    type: "PRODUCT",
    name: createDto.name,
    version: VERSION_FIRST,
    attributes: {
      description: createDto.description,
      price: createDto.price,
      category: createDto.category,
      inStock: createDto.inStock ?? true,
    },
  });

  // Publish command (async - returns immediately)
  const item = await this.commandService.publishAsync(command, {
    invokeContext: opts.invokeContext,
  });

  return new ProductDataEntity(item);
}
```

## Read Operations

### Find One by Key

#### Use Case: Get Product Detail Page

Scenario: User navigates to a product detail page and needs the full product data.

When to use: Single-item lookup where you have the pk and sk.

```ts
async findOne(
  detailDto: { pk: string; sk: string },
): Promise<ProductDataEntity> {
  const item = await this.dataService.getItem(detailDto);
  return new ProductDataEntity(item);
}
```

### Find All with Pagination (from RDS)

#### Use Case: Product List with Filtering

Scenario: Display a paginated product list that users can filter by category or search.

Why RDS: DynamoDB is not optimized for complex queries. Use Prisma/RDS for filtering and full-text search.

```ts
async findAll(
  searchDto: {
    tenantCode: string;
    category?: string;
    inStock?: boolean;
    page?: number;
    limit?: number;
  },
): Promise<{ items: ProductDataEntity[]; total: number }> {
  const page = searchDto.page ?? 1;
  const limit = searchDto.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    tenantCode: searchDto.tenantCode,
    isDeleted: false,
  };

  if (searchDto.category) {
    where.category = searchDto.category;
  }

  if (searchDto.inStock !== undefined) {
    where.inStock = searchDto.inStock;
  }

  // Execute parallel queries for count and data
  const [total, items] = await Promise.all([
    this.prismaService.product.count({ where }),
    this.prismaService.product.findMany({
      where,
      take: limit,
      skip,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    total,
    items: items.map((item) => new ProductDataEntity(item)),
  };
}
```

## Update Operation

### Use Case: Edit Product Details

Scenario: User updates product name or price through an edit form.

Important: Include the version field to enable optimistic locking and prevent concurrent update conflicts.

```ts
import {
  CommandPartialInputModel,
  CommandService,
  DataService,
  IInvoke,
} from "@mbc-cqrs-serverless/core";
import { NotFoundException } from "@nestjs/common";

async update(
  detailDto: { pk: string; sk: string },
  updateDto: UpdateProductDto,
  opts: { invokeContext: IInvoke },
): Promise<ProductDataEntity> {
  // First, get the existing item
  const existing = await this.dataService.getItem(detailDto);

  if (!existing) {
    throw new NotFoundException("Product not found");
  }

  // Merge existing attributes with updates
  const updatedAttributes = {
    ...existing.attributes,
    ...updateDto.attributes,
  };

  // Create partial update command
  const command: CommandPartialInputModel = {
    pk: existing.pk,
    sk: existing.sk,
    version: existing.version, // Required for optimistic locking
    name: updateDto.name ?? existing.name,
    attributes: updatedAttributes,
  };

  // Publish partial update
  const item = await this.commandService.publishPartialUpdateAsync(command, {
    invokeContext: opts.invokeContext,
  });

  return new ProductDataEntity(item);
}
```

:::info Version Parameter Behavior
The `version` field in `publishPartialUpdateAsync()` controls how the existing item is retrieved:

- **`version > 0`**: Uses the specified version number. The command will fail if the version doesn't match (optimistic locking).
- **`version <= 0`** (e.g., `VERSION_LATEST = -1`): Automatically retrieves the latest version using `getLatestItem()`.

Use `existing.version` (as shown above) for strict optimistic locking. Use `VERSION_LATEST` (-1) when you want to always update the latest version regardless of what version you have cached.
:::

## Delete Operation (Soft Delete)

### Use Case: Remove Product from Catalog

Scenario: Admin removes a discontinued product.

Why Soft Delete: Data is marked as deleted (isDeleted=true) rather than physically removed, preserving audit history.

```ts
import {
  CommandPartialInputModel,
  CommandService,
  DataService,
  IInvoke,
} from "@mbc-cqrs-serverless/core";
import { NotFoundException } from "@nestjs/common";

async remove(
  detailDto: { pk: string; sk: string },
  opts: { invokeContext: IInvoke },
): Promise<ProductDataEntity> {
  // Get existing item
  const existing = await this.dataService.getItem(detailDto);

  if (!existing) {
    throw new NotFoundException("Product not found");
  }

  // Create soft delete command
  const command: CommandPartialInputModel = {
    pk: existing.pk,
    sk: existing.sk,
    version: existing.version,
    isDeleted: true,
  };

  const item = await this.commandService.publishPartialUpdateAsync(command, {
    invokeContext: opts.invokeContext,
  });

  return new ProductDataEntity(item);
}
```

## Complete Service Example

Here is a complete service implementation:

```ts
import {
  CommandPartialInputModel,
  CommandService,
  DataService,
  generateId,
  getUserContext,
  VERSION_FIRST,
  KEY_SEPARATOR,
  IInvoke,
} from "@mbc-cqrs-serverless/core";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ulid } from "ulid";

import { PrismaService } from "src/prisma";
import { ProductCommandDto } from "./dto/product-command.dto";
import { ProductDataEntity } from "./entity/product-data.entity";
import { ProductListEntity } from "./entity/product-list.entity";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { SearchProductDto } from "./dto/search-product.dto";
import { DetailDto } from "./dto/detail.dto";

const PRODUCT_PK_PREFIX = "PRODUCT";

@Injectable()
export class ProductService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Create a new product
   */
  async create(
    createDto: CreateProductDto,
    opts: { invokeContext: IInvoke },
  ): Promise<ProductDataEntity> {
    const { tenantCode } = getUserContext(opts.invokeContext);

    const pk = `${PRODUCT_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`;
    const sk = ulid();
    const id = generateId(pk, sk);

    const command = new ProductCommandDto({
      pk,
      sk,
      id,
      tenantCode,
      code: sk,
      type: "PRODUCT",
      name: createDto.name,
      version: VERSION_FIRST,
      attributes: {
        description: createDto.description,
        price: createDto.price,
        category: createDto.category,
        inStock: createDto.inStock ?? true,
      },
    });

    const item = await this.commandService.publishAsync(command, {
      invokeContext: opts.invokeContext,
    });

    return new ProductDataEntity(item);
  }

  /**
   * Find all products with filtering and pagination
   */
  async findAll(searchDto: SearchProductDto): Promise<ProductListEntity> {
    const page = searchDto.page ?? 1;
    const limit = searchDto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantCode: searchDto.tenantCode,
      isDeleted: false,
    };

    if (searchDto.category) {
      where.category = searchDto.category;
    }

    if (searchDto.inStock !== undefined) {
      where.inStock = searchDto.inStock;
    }

    if (searchDto.search) {
      where.OR = [
        { name: { contains: searchDto.search}},
        { description: { contains: searchDto.search}},
      ];
    }

    const [total, items] = await Promise.all([
      this.prismaService.product.count({ where }),
      this.prismaService.product.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return new ProductListEntity({
      total,
      items: items.map((item) => new ProductDataEntity(item)),
    });
  }

  /**
   * Find one product by key
   */
  async findOne(detailDto: DetailDto): Promise<ProductDataEntity> {
    const item = await this.dataService.getItem(detailDto);

    if (!item) {
      throw new NotFoundException("Product not found");
    }

    return new ProductDataEntity(item);
  }

  /**
   * Update a product
   */
  async update(
    detailDto: DetailDto,
    updateDto: UpdateProductDto,
    opts: { invokeContext: IInvoke },
  ): Promise<ProductDataEntity> {
    const existing = await this.dataService.getItem(detailDto);

    if (!existing) {
      throw new NotFoundException("Product not found");
    }

    const command: CommandPartialInputModel = {
      pk: existing.pk,
      sk: existing.sk,
      version: existing.version,
      name: updateDto.name ?? existing.name,
      attributes: {
        ...existing.attributes,
        ...updateDto.attributes,
      },
    };

    const item = await this.commandService.publishPartialUpdateAsync(command, {
      invokeContext: opts.invokeContext,
    });

    return new ProductDataEntity(item);
  }

  /**
   * Soft delete a product
   */
  async remove(
    detailDto: DetailDto,
    opts: { invokeContext: IInvoke },
  ): Promise<ProductDataEntity> {
    const existing = await this.dataService.getItem(detailDto);

    if (!existing) {
      throw new NotFoundException("Product not found");
    }

    const command: CommandPartialInputModel = {
      pk: existing.pk,
      sk: existing.sk,
      version: existing.version,
      isDeleted: true,
    };

    const item = await this.commandService.publishPartialUpdateAsync(command, {
      invokeContext: opts.invokeContext,
    });

    return new ProductDataEntity(item);
  }
}
```

## Batch Operations {#batch-operations}

### Use Case: Import Multiple Products

Scenario: Admin uploads a CSV file containing multiple products to import.

Solution: Process items in parallel using Promise.all for better performance.

```ts
async createBatch(
  items: CreateProductDto[],
  opts: { invokeContext: IInvoke },
): Promise<ProductDataEntity[]> {
  const { tenantCode } = getUserContext(opts.invokeContext);
  const pk = `${PRODUCT_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`;

  // Create all commands
  const commands = items.map((item) => {
    const sk = ulid();
    return new ProductCommandDto({
      pk,
      sk,
      id: generateId(pk, sk),
      tenantCode,
      code: sk,
      type: "PRODUCT",
      name: item.name,
      version: VERSION_FIRST,
      attributes: {
        description: item.description,
        price: item.price,
        category: item.category,
        inStock: item.inStock ?? true,
      },
    });
  });

  // Publish all commands in parallel
  const results = await Promise.all(
    commands.map((command) =>
      this.commandService.publishAsync(command, {
        invokeContext: opts.invokeContext,
      }),
    ),
  );

  return results.map((item) => new ProductDataEntity(item));
}
```

## Chunked Batch Operations

### Use Case: Large Data Migration

Scenario: Migrating thousands of records from a legacy system.

Problem: Processing all at once may cause Lambda timeout or memory issues.

Solution: Process in chunks of 100 items to stay within Lambda limits.

```ts
async createLargeBatch(
  items: CreateProductDto[],
  opts: { invokeContext: IInvoke },
): Promise<ProductDataEntity[]> {
  const { tenantCode } = getUserContext(opts.invokeContext);
  const pk = `${PRODUCT_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`;

  const chunkSize = 100;
  const results: ProductDataEntity[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    const commands = chunk.map((item) => {
      const sk = ulid();
      return new ProductCommandDto({
        pk,
        sk,
        id: generateId(pk, sk),
        tenantCode,
        code: sk,
        type: "PRODUCT",
        name: item.name,
        version: VERSION_FIRST,
        attributes: item,
      });
    });

    const chunkResults = await Promise.all(
      commands.map((command) =>
        this.commandService.publishAsync(command, {
          invokeContext: opts.invokeContext,
        }),
      ),
    );

    results.push(...chunkResults.map((item) => new ProductDataEntity(item)));
  }

  return results;
}
```

## Copy Operation

### Use Case: Clone Product to Different Tenant

Scenario: Multi-tenant SaaS where a template product needs to be copied to a new tenant.

Solution: Read source entity and create new entity with different tenant's keys.

```ts
import {
  CommandService,
  DataService,
  generateId,
  IInvoke,
  KEY_SEPARATOR,
  VERSION_FIRST,
} from "@mbc-cqrs-serverless/core";
import { NotFoundException } from "@nestjs/common";
import { ulid } from "ulid";

async copy(
  sourceKey: { pk: string; sk: string },
  targetTenantCode: string,
  opts: { invokeContext: IInvoke },
): Promise<ProductDataEntity> {
  // Get source item
  const source = await this.dataService.getItem(sourceKey);

  if (!source) {
    throw new NotFoundException("Source product not found");
  }

  // Create new keys for target tenant
  const pk = `${PRODUCT_PK_PREFIX}${KEY_SEPARATOR}${targetTenantCode}`;
  const sk = ulid();
  const id = generateId(pk, sk);

  // Create command with source data
  const command = new ProductCommandDto({
    pk,
    sk,
    id,
    tenantCode: targetTenantCode,
    code: sk,
    type: source.type,
    name: source.name,
    version: VERSION_FIRST,
    attributes: source.attributes,
  });

  const item = await this.commandService.publishAsync(command, {
    invokeContext: opts.invokeContext,
  });

  return new ProductDataEntity(item);
}
```

## Using History Service

### Use Case: View Previous Versions of a Document

Scenario: Audit requirement to show what a document looked like at a specific version.

Solution: Use HistoryService to retrieve a specific version from the history table.

```ts
import {
  addSortKeyVersion,
  CommandService,
  DataService,
  HistoryService,
} from "@mbc-cqrs-serverless/core";
import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "src/prisma";
import { ProductDataEntity } from "./entity/product-data.entity";

@Injectable()
export class ProductService {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
    private readonly historyService: HistoryService,
    private readonly prismaService: PrismaService,
  ) {}

  async findByVersion(
    detailDto: { pk: string; sk: string },
    version: number,
  ): Promise<ProductDataEntity> {
    // Add version to SK
    const skWithVersion = addSortKeyVersion(detailDto.sk, version);

    // Try to get from history
    let item = await this.historyService.getItem({
      pk: detailDto.pk,
      sk: skWithVersion,
    });

    // Fallback to latest if not in history
    if (!item) {
      item = await this.dataService.getItem(detailDto);
    }

    if (!item) {
      throw new NotFoundException("Product not found");
    }

    return new ProductDataEntity(item);
  }
}
```

## Best Practices

### 1. Always Use Invoke Context

Pass invoke context for audit trail:

```ts
await this.commandService.publishAsync(command, {
  invokeContext: opts.invokeContext,
});
```

### 2. Use Optimistic Locking

Include version in partial updates:

```ts
const command: CommandPartialInputModel = {
  pk: existing.pk,
  sk: existing.sk,
  version: existing.version, // This enables optimistic locking
  // ...
};
```

### 3. Prefer Async Operations

Use async methods for better responsiveness:

```ts
// Recommended: Returns immediately
await this.commandService.publishAsync(command, opts);

// Use only when you need to wait for processing
await this.commandService.publishSync(command, opts);
```

### 4. Combine DynamoDB and RDS Queries

Use DynamoDB for single-item reads, RDS for complex queries:

```ts
// Single item: Use DataService (DynamoDB)
const item = await this.dataService.getItem({ pk, sk });

// Complex query: Use Prisma (RDS)
const items = await this.prismaService.product.findMany({
  where: { category: "electronics", inStock: true },
  orderBy: { price: "asc" },
});
```
