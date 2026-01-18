---
description: CommandServiceとDataServiceを使用したCRUD操作によるサービスレイヤーの実装方法を学びます。
---

# Service実装パターン

このガイドでは、MBC CQRS ServerlessでCRUD操作を処理するサービスクラスの実装方法を説明します。サービスはビジネスロジックの中核であり、コントローラー、コマンド、データアクセスを調整します。

## このガイドを使用するタイミング

以下が必要な場合にこのガイドを使用してください：

- 新しいドメインエンティティのサービスレイヤーを構築する
- 作成、読み取り、更新、削除（CRUD）操作を実装する
- マルチテナントデータの分離を処理する
- 並行更新のための楽観的ロックを使用する
- 大量データ処理のためのバッチ操作を実装する

## このパターンが解決する問題

| 問題 | 解決策 |
|---------|----------|
| データベースへの直接アクセスはCQRSパターンをバイパスする | 書き込みにはCommandService、読み取りにはDataServiceを使用する |
| データ変更の監査証跡がない | ユーザーとタイムスタンプを記録するためにinvokeContextを渡す |
| 並行更新が互いを上書きする | 楽観的ロックのためにversionフィールドを使用する |
| 同期処理による遅いレスポンス | 非ブロッキングコマンド発行のためにpublishAsyncを使用する |

## 基本的なService構造

一般的なサービスは、書き込み操作に`CommandService`、読み取り操作に`DataService`の両方を使用します：

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

## Create操作

### ユースケース：新しい商品を作成する

シナリオ：ユーザーがカタログに新しい商品を追加するフォームを送信する。

フロー：ControllerがCreateProductDtoを受信 → Serviceがキーを生成 → CommandがDynamoDBに発行 → データがRDSに同期。

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

## Read操作

### キーによる単一取得

#### ユースケース：商品詳細ページを取得する

シナリオ：ユーザーが商品詳細ページに移動し、完全な商品データが必要。

使用するタイミング：pkとskがある場合の単一アイテム検索。

```ts
async findOne(
  detailDto: { pk: string; sk: string },
): Promise<ProductDataEntity> {
  const item = await this.dataService.getItem(detailDto);
  return new ProductDataEntity(item);
}
```

### ページネーション付き全件取得（RDSから）

#### ユースケース：フィルタリング付き商品リスト

シナリオ：ユーザーがカテゴリや検索でフィルタリングできるページネーション付き商品リストを表示する。

RDSを使用する理由：DynamoDBは複雑なクエリに最適化されていません。フィルタリングと全文検索にはPrisma/RDSを使用します。

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

## Update操作

### ユースケース：商品詳細を編集する

シナリオ：ユーザーが編集フォームで商品名や価格を更新する。

重要：楽観的ロックを有効にし、並行更新の競合を防ぐためにversionフィールドを含めてください。

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

:::info versionパラメータの動作
`publishPartialUpdateAsync()` の `version` フィールドは、既存アイテムの取得方法を制御します：

- **`version > 0`**: 指定されたバージョン番号を使用します。バージョンが一致しない場合、コマンドは失敗します（楽観的ロック）。
- **`version <= 0`** (例：`VERSION_LATEST = -1`): `getLatestItem()` を使用して最新バージョンを自動的に取得します。

厳格な楽観的ロックには `existing.version`（上記のように）を使用します。キャッシュしているバージョンに関係なく常に最新バージョンを更新したい場合は `VERSION_LATEST`（-1）を使用します。
:::

## Delete操作（論理削除）

### ユースケース：カタログから商品を削除する

シナリオ：管理者が廃止商品を削除する。

論理削除の理由：データは物理的に削除されるのではなく、削除済み（isDeleted=true）としてマークされ、監査履歴が保持されます。

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

## 完全なService例

完全なサービス実装を示します：

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

## バッチ操作 {#batch-operations}

### ユースケース：複数の商品をインポートする

シナリオ：管理者がインポートする複数の商品を含むCSVファイルをアップロードする。

解決策：パフォーマンス向上のためにPromise.allを使用してアイテムを並列処理する。

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

## チャンク化バッチ操作

### ユースケース：大規模データ移行

シナリオ：レガシーシステムから数千件のレコードを移行する。

問題：一度に全て処理するとLambdaのタイムアウトやメモリの問題が発生する可能性がある。

解決策：Lambdaの制限内に収めるために100アイテムのチャンクで処理する。

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

## Copy操作

### ユースケース：商品を別のテナントにクローンする

シナリオ：テンプレート商品を新しいテナントにコピーする必要があるマルチテナントSaaS。

解決策：ソースエンティティを読み取り、異なるテナントのキーで新しいエンティティを作成する。

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

## History Serviceの使用

### ユースケース：ドキュメントの以前のバージョンを表示する

シナリオ：特定のバージョンでドキュメントがどのようだったかを表示する監査要件。

解決策：HistoryServiceを使用して履歴テーブルから特定のバージョンを取得する。

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

## ベストプラクティス

### 1. 常にInvoke Contextを使用する

監査証跡のためにinvoke contextを渡します：

```ts
await this.commandService.publishAsync(command, {
  invokeContext: opts.invokeContext,
});
```

### 2. 楽観的ロックを使用する

部分更新にバージョンを含めます：

```ts
const command: CommandPartialInputModel = {
  pk: existing.pk,
  sk: existing.sk,
  version: existing.version, // This enables optimistic locking
  // ...
};
```

### 3. 非同期操作を優先する

レスポンシブ性向上のために非同期メソッドを使用します：

```ts
// Recommended: Returns immediately
await this.commandService.publishAsync(command, opts);

// Use only when you need to wait for processing
await this.commandService.publishSync(command, opts);
```

### 4. DynamoDBとRDSクエリを組み合わせる

単一アイテムの読み取りにはDynamoDB、複雑なクエリにはRDSを使用します：

```ts
// Single item: Use DataService (DynamoDB)
const item = await this.dataService.getItem({ pk, sk });

// Complex query: Use Prisma (RDS)
const items = await this.prismaService.product.findMany({
  where: { category: "electronics", inStock: true },
  orderBy: { price: "asc" },
});
```
