---
description: 生成されたOpenAPI SDKを使用して、型安全なAPIコールでバックエンドAPIと統合する方法を学びます。
---

# API統合パターン

このガイドでは、自動生成されたTypeScript SDKを使用してフロントエンドアプリケーションをMBC CQRS Serverlessバックエンドに接続する方法を説明します。型安全なAPI統合により、コンパイル時にエラーを検出し、オートコンプリートによる優れた開発者体験を提供します。

## このガイドを使用するタイミング

以下の場合にこのガイドを使用してください：

- Next.jsフロントエンドをMBC CQRS Serverless APIに接続する
- OpenAPI仕様からTypeScript型を生成する
- APIリクエストに認証ヘッダーを自動的に追加する
- アプリケーション全体で一貫したAPIエラー処理を行う
- テナントヘッダーを使用したマルチテナントAPI呼び出しをサポートする

## このパターンが解決する問題

| 問題 | 解決策 |
|---------|----------|
| フロントエンドの型がバックエンドAPIと一致しない | OpenAPI仕様からSDKを生成 - 型が常に一致 |
| リクエストに認証トークンを追加し忘れる | インターセプターを使用してヘッダーを自動的に追加 |
| コンポーネント間でエラー処理が一貫していない | APIラッパーでエラー処理を一元化 |
| 一部のリクエストでテナントヘッダーが欠落 | ストアから読み取るテナントインターセプターを追加 |
| API変更時の更新が困難 | 1つのコマンドでSDKを再生成 |

## SDK生成のセットアップ

### ユースケース：型安全なAPIクライアントの生成

シナリオ：バックエンドチームがAPIを更新し、フロントエンドの型を一致させる必要がある。

解決策：バックエンドがエクスポートするOpenAPI仕様ファイルからSDKを生成する。

### 依存関係のインストール

```bash
npm install @hey-api/client-fetch
npm install -D @hey-api/openapi-ts
```

### 設定

```typescript
// openapi-ts.config.ts
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: '@hey-api/client-fetch',
  input: './openapi.json', // or URL to OpenAPI spec
  output: {
    path: 'src/services/sdk',
    format: 'prettier',
  },
  services: {
    asClass: true,
  },
  types: {
    enums: 'javascript',
  },
});
```

### Package.jsonスクリプト

```json
{
  "scripts": {
    "generate-sdk": "openapi-ts",
    "generate-sdk:watch": "openapi-ts --watch"
  }
}
```

## 生成されるSDK構造

`npm run generate-sdk`を実行すると、以下のファイルが作成されます：

```
src/services/sdk/
├── client/
│   └── client.ts          # HTTP client configuration
├── types.gen.ts           # Generated TypeScript types
├── services.gen.ts        # Generated service classes
└── index.ts               # Main exports
```

### 生成される型の例

これらの型はOpenAPI仕様から生成され、バックエンドと完全に一致します：

```typescript
// src/services/sdk/types.gen.ts (auto-generated)
export interface Product {
  id: string;
  pk: string;
  sk: string;
  code: string;
  name: string;
  price: number;
  status: ProductStatus;
  attributes: ProductAttributes;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  code: string;
  name: string;
  price: number;
  attributes?: ProductAttributes;
}

export interface UpdateProductDto {
  name?: string;
  price?: number;
  status?: ProductStatus;
  attributes?: ProductAttributes;
  version: number; // Required for optimistic locking
}

export interface ProductListResponse {
  items: Product[];
  count: number;
  hasMore: boolean;
}
```

### 生成されるサービスの例

サービスクラスは各APIエンドポイントに型付きメソッドを提供します：

```typescript
// src/services/sdk/services.gen.ts (auto-generated)
export class ProductService {
  static list(options?: { query?: ProductListParams }): Promise<ProductListResponse>;
  static get(options: { path: { pk: string; sk: string}}): Promise<Product>;
  static create(options: { body: CreateProductDto }): Promise<Product>;
  static update(options: { path: { pk: string; sk: string }; body: UpdateProductDto }): Promise<Product>;
  static delete(options: { path: { pk: string; sk: string}}): Promise<void>;
}
```

## クライアント設定

### ユースケース：すべてのリクエストに認証を追加

シナリオ：すべてのAPIリクエストにCognitoからのBearerトークンが必要。

問題：各リクエストに手動でヘッダーを追加するとエラーが発生しやすい。

解決策：インターセプターを使用して認証ヘッダーを自動的に追加する。

```typescript
// src/lib/api/client.ts
import { client } from '@/services/sdk/client';
import { fetchAuthSession } from 'aws-amplify/auth';

// Configure the base URL
client.setConfig({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
});

// Add authentication interceptor
client.interceptors.request.use(async (request) => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();

    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
  } catch (error) {
    console.error('Failed to get auth token:', error);
  }

  return request;
});

// Add tenant header interceptor
client.interceptors.request.use((request) => {
  const tenantCode = getTenantFromStore(); // Get from Zustand store
  if (tenantCode) {
    request.headers.set('X-Tenant-Code', tenantCode);
  }
  return request;
});

// Add error handling interceptor
client.interceptors.response.use((response) => {
  if (!response.ok) {
    // Handle specific error codes
    if (response.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
  }
  return response;
});

export { client };
```

### ユースケース：エラーハンドリング付きAPIラッパーの作成

シナリオ：コンポーネントは意味のあるエラーをスローするクリーンなAPIが必要。

問題：生成されたSDKは`{ data, error }`を返すため、すべてのコンポーネントで処理が必要。

解決策：React Queryで使用するためにエラー時にスローするラッパー関数を作成する。

```typescript
// src/services/api/products.ts
import { ProductService, CreateProductDto, UpdateProductDto } from '@/services/sdk';
import type { Product, ProductListResponse } from '@/services/sdk';

export interface ProductFilters {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const productApi = {
  async list(filters: ProductFilters = {}): Promise<ProductListResponse> {
    const { data, error } = await ProductService.list({
      query: {
        status: filters.status,
        category: filters.category,
        q: filters.search,
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch products');
    }

    return data;
  },

  async get(pk: string, sk: string): Promise<Product> {
    const { data, error } = await ProductService.get({
      path: { pk, sk },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch product');
    }

    return data;
  },

  async create(dto: CreateProductDto): Promise<Product> {
    const { data, error } = await ProductService.create({
      body: dto,
    });

    if (error) {
      throw new Error(error.message || 'Failed to create product');
    }

    return data;
  },

  async update(pk: string, sk: string, dto: UpdateProductDto): Promise<Product> {
    const { data, error } = await ProductService.update({
      path: { pk, sk },
      body: dto,
    });

    if (error) {
      throw new Error(error.message || 'Failed to update product');
    }

    return data;
  },

  async delete(pk: string, sk: string): Promise<void> {
    const { error } = await ProductService.delete({
      path: { pk, sk },
    });

    if (error) {
      throw new Error(error.message || 'Failed to delete product');
    }
  },
};
```

## React Query統合

### ユースケース：キャッシュ付きデータフェッチ

シナリオ：効率的なキャッシュで製品リストと詳細ページを表示する。

解決策：APIラッパーを使用するReact Queryフックを作成する。

```typescript
// src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi, ProductFilters } from '@/services/api/products';
import type { CreateProductDto, UpdateProductDto } from '@/services/sdk';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (pk: string, sk: string) => [...productKeys.details(), pk, sk] as const,
};

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => productApi.list(filters),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useProduct(pk: string, sk: string) {
  return useQuery({
    queryKey: productKeys.detail(pk, sk),
    queryFn: () => productApi.get(pk, sk),
    enabled: !!pk && !!sk,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateProductDto) => productApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pk, sk, dto }: { pk: string; sk: string; dto: UpdateProductDto }) =>
      productApi.update(pk, sk, dto),
    onSuccess: (_, { pk, sk }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(pk, sk) });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pk, sk }: { pk: string; sk: string }) =>
      productApi.delete(pk, sk),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
```

### ユースケース：フィルタリング付き製品リスト

シナリオ：フィルタリング可能でページネーション付きの製品テーブルを表示する。

```typescript
// src/containers/products/ProductList.tsx
'use client';

import { useProducts, useDeleteProduct } from '@/hooks/useProducts';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { useState } from 'react';

export function ProductList() {
  const [filters, setFilters] = useState({ page: 1, limit: 20 });
  const { data, isLoading, error } = useProducts(filters);
  const deleteProduct = useDeleteProduct();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleDelete = async (pk: string, sk: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct.mutateAsync({ pk, sk });
    }
  };

  return (
    <Table
      data={data?.items ?? []}
      columns={[
        { key: 'code', header: 'Code' },
        { key: 'name', header: 'Name' },
        { key: 'price', header: 'Price' },
        { key: 'status', header: 'Status' },
        {
          key: 'actions',
          header: 'Actions',
          render: (row) => (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(row.pk, row.sk)}
              loading={deleteProduct.isPending}
            >
              Delete
            </Button>
          ),
        },
      ]}
      pagination={{
        page: filters.page,
        limit: filters.limit,
        total: data?.count ?? 0,
        onChange: (page) => setFilters((f) => ({ ...f, page })),
     }}
    />
  );
}
```

## エラーハンドリング

### ユースケース：構造化されたエラーレスポンス

シナリオ：バックエンドがフィールドレベルのバリデーション詳細を含む構造化エラーを返す。

解決策：バックエンドのレスポンス形式と一致するエラー型を作成する。

```typescript
// src/types/api-errors.ts
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, string[]>;
}

export class ApiException extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiException';
  }
}
```

### ユースケース：一元化されたエラーハンドラー

シナリオ：様々なエラータイプを一貫したApiExceptionに変換する。

```typescript
// src/lib/api/error-handler.ts
import { ApiException } from '@/types/api-errors';

export function handleApiError(error: unknown): never {
  if (error instanceof ApiException) {
    throw error;
  }

  if (error instanceof Error) {
    throw new ApiException(500, error.message);
  }

  throw new ApiException(500, 'An unexpected error occurred');
}

// Usage in API wrapper
export const productApi = {
  async list(filters: ProductFilters = {}): Promise<ProductListResponse> {
    try {
      const { data, error } = await ProductService.list({
        query: filters,
      });

      if (error) {
        throw new ApiException(
          error.statusCode ?? 500,
          error.message ?? 'Request failed',
          error.details
        );
      }

      return data;
    } catch (error) {
      handleApiError(error);
    }
  },
};
```

### ユースケース：フィールド詳細付きエラー表示

シナリオ：サーバーから返されたバリデーションエラーを表示する。

```typescript
// src/components/ApiError.tsx
import { ApiException } from '@/types/api-errors';
import { Alert } from '@/components/ui/Alert';

interface ApiErrorProps {
  error: Error | null;
}

export function ApiError({ error }: ApiErrorProps) {
  if (!error) return null;

  const isApiException = error instanceof ApiException;

  return (
    <Alert variant="error">
      <p>{error.message}</p>
      {isApiException && error.details && (
        <ul className="mt-2 list-disc list-inside">
          {Object.entries(error.details).map(([field, messages]) => (
            <li key={field}>
              <strong>{field}:</strong> {messages.join(', ')}
            </li>
          ))}
        </ul>
      )}
    </Alert>
  );
}
```

## マルチテナントAPI呼び出し

### ユースケース：SaaSアプリケーション用テナントコンテキスト

シナリオ：ユーザーがテナント間を切り替え可能で、すべてのAPI呼び出しが選択されたテナントを使用する必要がある。

解決策：テナントをコンテキスト/ストアに保存し、APIヘッダーに自動的に追加する。

```typescript
// src/contexts/TenantContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useTenantStore } from '@/stores/useTenantStore';

interface TenantContextValue {
  tenantCode: string | null;
  setTenant: (code: string) => void;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { currentTenant, setCurrentTenant } = useTenantStore();

  return (
    <TenantContext.Provider
      value={{
        tenantCode: currentTenant?.code ?? null,
        setTenant: (code) => setCurrentTenant({ code } as Tenant),
     }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}
```

### ユースケース：テナントスコープのクエリ

シナリオ：製品リストは現在のテナントの製品のみを表示する必要がある。

```typescript
// src/hooks/useTenantProducts.ts
import { useQuery } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { productApi } from '@/services/api/products';

export function useTenantProducts() {
  const { tenantCode } = useTenant();

  return useQuery({
    queryKey: ['products', tenantCode],
    queryFn: () => productApi.list(),
    enabled: !!tenantCode,
  });
}
```

## ファイルアップロード統合

### ユースケース：API経由でS3にファイルをアップロード

シナリオ：ユーザーがS3に保存する必要がある製品画像をアップロードする。

```typescript
// src/services/api/files.ts
import { FileService } from '@/services/sdk';

export const fileApi = {
  async upload(file: File, path: string): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const { data, error } = await FileService.upload({
      body: formData,
    });

    if (error) {
      throw new Error(error.message || 'Upload failed');
    }

    return data;
  },

  async getPresignedUrl(key: string): Promise<{ url: string; expiresIn: number }> {
    const { data, error } = await FileService.getPresignedUrl({
      query: { key },
    });

    if (error) {
      throw new Error(error.message || 'Failed to get presigned URL');
    }

    return data;
  },
};
```

## ベストプラクティス

### 1. バックエンド変更後は必ずSDKを再生成する

タイミング：バックエンドチームがAPI変更をデプロイした時。

理由：フロントエンドの型がバックエンドと完全に一致することを保証する。

```bash
# After backend API changes
npm run generate-sdk
```

### 2. 型ガードを使用する

タイミング：外部ソースからの不明なデータを扱う時。

```typescript
function isProduct(data: unknown): data is Product {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'pk' in data &&
    'sk' in data
  );
}
```

### 3. ローディングとエラー状態を処理する

タイミング：APIクエリからデータを表示する時。

```typescript
function ProductDetail({ pk, sk }: { pk: string; sk: string }) {
  const { data, isLoading, error, refetch } = useProduct(pk, sk);

  if (isLoading) {
    return <Skeleton />;
  }

  if (error) {
    return (
      <ErrorState
        message={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) {
    return <NotFound />;
  }

  return <ProductView product={data} />;
}
```

### 4. 更新時のバージョン処理

タイミング：楽観的ロックを使用するエンティティを更新する時。

理由：MBC CQRS Serverlessは同時更新の競合を防ぐためにversionフィールドを使用する。

```typescript
function useUpdateProductWithVersion() {
  const queryClient = useQueryClient();
  const updateProduct = useUpdateProduct();

  return {
    ...updateProduct,
    mutateAsync: async ({ pk, sk, dto }: UpdateParams) => {
      // Get current version from cache
      const cached = queryClient.getQueryData<Product>(
        productKeys.detail(pk, sk)
      );

      if (!cached) {
        throw new Error('Product not found in cache');
      }

      return updateProduct.mutateAsync({
        pk,
        sk,
        dto: { ...dto, version: cached.version },
      });
    },
  };
}
```

### 5. リトライ設定

タイミング：React Queryクライアントを設定する時。

理由：常に失敗するクライアントエラー(4xx)のリトライを避ける。

```typescript
// src/lib/api/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof ApiException && error.statusCode < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});
```
