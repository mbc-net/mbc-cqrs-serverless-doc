---
description: {{Learn how to integrate with backend APIs using generated OpenAPI SDKs for type-safe API calls.}}
---

# {{API Integration Patterns}}

{{This guide explains how to connect frontend applications to MBC CQRS Serverless backends using auto-generated TypeScript SDKs. Type-safe API integration catches errors at compile time and provides excellent developer experience with autocomplete.}}

## {{When to Use This Guide}}

{{Use this guide when you need to:}}

- {{Connect a Next.js frontend to an MBC CQRS Serverless API}}
- {{Generate TypeScript types from OpenAPI specification}}
- {{Add authentication headers automatically to API requests}}
- {{Handle API errors consistently across the application}}
- {{Support multi-tenant API calls with tenant headers}}

## {{Problems This Pattern Solves}}

| {{Problem}} | {{Solution}} |
|---------|----------|
| {{Frontend types don't match backend API}} | {{Generate SDK from OpenAPI spec - types always match}} |
| {{Forgetting to add auth token to requests}} | {{Use interceptors to add headers automatically}} |
| {{Inconsistent error handling across components}} | {{Centralize error handling in API wrapper}} |
| {{Tenant header missing in some requests}} | {{Add tenant interceptor that reads from store}} |
| {{Hard to update when API changes}} | {{Regenerate SDK with one command}} |

## {{SDK Generation Setup}}

### {{Use Case: Generate Type-Safe API Client}}

{{Scenario: Backend team updates the API, and you need frontend types to match.}}

{{Solution: Generate SDK from OpenAPI specification file that backend exports.}}

### {{Installing Dependencies}}

```bash
npm install @hey-api/client-fetch
npm install -D @hey-api/openapi-ts
```

### {{Configuration}}

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

### {{Package.json Scripts}}

```json
{
  "scripts": {
    "generate-sdk": "openapi-ts",
    "generate-sdk:watch": "openapi-ts --watch"
  }
}
```

## {{Generated SDK Structure}}

{{After running `npm run generate-sdk`, the following files are created:}}

```
src/services/sdk/
├── client/
│   └── client.ts          # HTTP client configuration
├── types.gen.ts           # Generated TypeScript types
├── services.gen.ts        # Generated service classes
└── index.ts               # Main exports
```

### {{Generated Types Example}}

{{These types are generated from your OpenAPI spec and match your backend exactly:}}

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

### {{Generated Services Example}}

{{Service classes provide typed methods for each API endpoint:}}

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

## {{Client Configuration}}

### {{Use Case: Add Authentication to All Requests}}

{{Scenario: Every API request needs a Bearer token from Cognito.}}

{{Problem: Manually adding headers to each request is error-prone.}}

{{Solution: Use interceptors to add authentication header automatically.}}

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

### {{Use Case: Create API Wrapper with Error Handling}}

{{Scenario: Components need clean APIs that throw meaningful errors.}}

{{Problem: Generated SDK returns `{ data, error }` which requires handling in every component.}}

{{Solution: Create wrapper functions that throw on errors for use with React Query.}}

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

## {{React Query Integration}}

### {{Use Case: Data Fetching with Caching}}

{{Scenario: Display product list and detail pages with efficient caching.}}

{{Solution: Create React Query hooks that use the API wrapper.}}

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

### {{Use Case: Product List with Filtering}}

{{Scenario: Display filterable, paginated product table.}}

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

## {{Error Handling}}

### {{Use Case: Structured Error Responses}}

{{Scenario: Backend returns structured errors with field-level validation details.}}

{{Solution: Create error types that match backend response format.}}

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

### {{Use Case: Centralized Error Handler}}

{{Scenario: Convert various error types to consistent ApiException.}}

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

### {{Use Case: Display Errors with Field Details}}

{{Scenario: Show validation errors returned by the server.}}

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

## {{Multi-Tenant API Calls}}

### {{Use Case: Tenant Context for SaaS Applications}}

{{Scenario: User can switch between tenants, and all API calls should use the selected tenant.}}

{{Solution: Store tenant in context/store and add to API headers automatically.}}

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

### {{Use Case: Tenant-Scoped Queries}}

{{Scenario: Product list should only show products for the current tenant.}}

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

## {{File Upload Integration}}

### {{Use Case: Upload Files to S3 via API}}

{{Scenario: User uploads product images that need to be stored in S3.}}

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

## {{Best Practices}}

### {{1. Always Regenerate SDK After Backend Changes}}

{{When: Backend team deploys API changes.}}

{{Why: Ensures frontend types match backend exactly.}}

```bash
# After backend API changes
npm run generate-sdk
```

### {{2. Use Type Guards}}

{{When: Working with unknown data from external sources.}}

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

### {{3. Handle Loading and Error States}}

{{When: Displaying data from API queries.}}

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

### {{4. Version Handling for Updates}}

{{When: Updating entities that use optimistic locking.}}

{{Why: MBC CQRS Serverless uses version field to prevent concurrent update conflicts.}}

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

### {{5. Retry Configuration}}

{{When: Configuring React Query client.}}

{{Why: Avoid retrying client errors (4xx) that will always fail.}}

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
