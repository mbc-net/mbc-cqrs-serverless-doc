---
description: {{Learn how to structure your Next.js frontend project for MBC CQRS Serverless applications.}}
---

# {{Frontend Project Structure}}

{{This guide explains how to organize a Next.js frontend application that integrates with an MBC CQRS Serverless backend. A well-structured project improves maintainability, enables team collaboration, and scales effectively as the application grows.}}

## {{When to Use This Guide}}

{{Use this guide when you are:}}

- {{Building a new frontend application that connects to an MBC CQRS Serverless API}}
- {{Migrating an existing React application to Next.js with App Router}}
- {{Setting up a multi-tenant SaaS application with Cognito authentication}}
- {{Creating an admin panel or dashboard for CQRS-based data management}}

## {{Problems This Structure Solves}}

| {{Problem}} | {{Solution}} |
|---------|----------|
| {{Mixing server and client code causes hydration errors}} | {{Separate containers (client) from pages (server)}} |
| {{API types get out of sync with backend}} | {{Use generated OpenAPI SDK in services/sdk}} |
| {{State management becomes chaotic}} | {{Separate server state (React Query) from client state (Zustand)}} |
| {{Components become too large and hard to test}} | {{Split into ui (presentation), forms (input), and containers (logic)}} |
| {{Authentication logic scattered across files}} | {{Centralize in lib/auth with Amplify configuration}} |

## {{Technology Stack}}

| {{Category}} | {{Technology}} | {{Purpose}} |
|----------|------------|---------|
| {{Framework}} | Next.js 15+ | {{React framework with App Router}} |
| {{Language}} | TypeScript | {{Type-safe development}} |
| {{State Management}} | Zustand | {{Client-side state management}} |
| {{Server State}} | TanStack React Query | {{Server state caching and synchronization}} |
| {{Forms}} | React Hook Form + Zod | {{Form handling with validation}} |
| {{Authentication}} | AWS Amplify | {{Cognito integration}} |
| {{API Client}} | OpenAPI SDK | {{Type-safe API calls}} |
| {{Styling}} | Tailwind CSS | {{Utility-first CSS}} |
| {{UI Components}} | Ant Design / Radix UI | {{Component library}} |

## {{Directory Structure}}

{{The following structure separates concerns clearly and scales well for medium to large applications:}}

```
src/
├── app/                      # Next.js App Router pages
│   ├── (auth)/              # Authentication routes (login, etc.)
│   ├── (main)/              # Main application routes
│   │   ├── dashboard/       # Dashboard page
│   │   ├── products/        # Product management
│   │   │   ├── page.tsx     # List page
│   │   │   ├── [id]/        # Detail/Edit pages
│   │   │   └── new/         # Create page
│   │   └── settings/        # Settings pages
│   ├── layout.tsx           # Root layout
│   └── providers.tsx        # Global providers
│
├── components/              # Reusable UI components
│   ├── ui/                  # Base UI components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── Table/
│   ├── forms/               # Form components
│   │   ├── ProductForm/
│   │   └── UserForm/
│   └── layouts/             # Layout components
│       ├── Header/
│       ├── Sidebar/
│       └── Footer/
│
├── containers/              # Feature-specific containers
│   ├── products/
│   │   ├── ProductList.tsx
│   │   ├── ProductDetail.tsx
│   │   └── ProductForm.tsx
│   └── users/
│       ├── UserList.tsx
│       └── UserDetail.tsx
│
├── services/                # API services
│   ├── sdk/                 # Generated OpenAPI SDK
│   │   ├── client/
│   │   ├── types.gen.ts
│   │   └── services.gen.ts
│   └── api/                 # API wrapper functions
│       ├── products.ts
│       └── users.ts
│
├── stores/                  # Zustand stores
│   ├── useAuthStore.ts
│   ├── useUIStore.ts
│   └── index.ts
│
├── hooks/                   # Custom React hooks
│   ├── useProducts.ts       # Product-related hooks
│   ├── useAuth.ts           # Authentication hooks
│   └── usePagination.ts     # Pagination hooks
│
├── lib/                     # Utility libraries
│   ├── auth/                # Auth utilities
│   ├── api/                 # API utilities
│   └── utils/               # General utilities
│
├── types/                   # TypeScript types
│   ├── api.ts               # API-related types
│   ├── models.ts            # Domain models
│   └── common.ts            # Common types
│
└── constants/               # Application constants
    ├── routes.ts            # Route constants
    └── config.ts            # Configuration constants
```

## {{Key Directory Explanations}}

### {{app/ - Page Routes}}

{{Use Case: Define URL routes and page metadata. Pages should be thin wrappers that import containers.}}

{{Why: Next.js App Router uses file-based routing. Keeping pages simple allows containers to be tested independently.}}

### {{containers/ - Business Logic}}

{{Use Case: Handle data fetching, state management, and user interactions for specific features.}}

{{Why: Separating business logic from presentation makes components reusable and testable.}}

### {{components/ui/ - Design System}}

{{Use Case: Build consistent UI elements used across the application.}}

{{Why: A shared component library ensures visual consistency and reduces code duplication.}}

### {{services/sdk/ - API Types}}

{{Use Case: Auto-generated TypeScript types and API clients from OpenAPI specification.}}

{{Why: Ensures frontend types match backend exactly, catching type errors at compile time.}}

### {{stores/ - Client State}}

{{Use Case: Manage UI state like sidebar open/close, theme, selected tenant.}}

{{Why: Zustand provides simple, performant state management without boilerplate.}}

### {{hooks/ - React Query Hooks}}

{{Use Case: Wrap API calls with caching, loading states, and error handling.}}

{{Why: React Query handles server state complexity (caching, refetching, optimistic updates).}}

## {{App Router Structure}}

### {{Route Groups}}

{{Use Case: Organize routes by authentication requirement without affecting URLs.}}

{{Example: (auth) group for login/register pages, (main) group for authenticated pages.}}

```typescript
// src/app/(auth)/login/page.tsx
// URL: /login - No authentication required

// src/app/(main)/dashboard/page.tsx
// URL: /dashboard - Requires authentication

// src/app/(main)/products/page.tsx
// URL: /products - Requires authentication
```

### {{Layout Pattern}}

{{Use Case: Share common UI elements (header, sidebar) across multiple pages.}}

{{Example: Main layout with navigation for all authenticated pages.}}

```typescript
// src/app/(main)/layout.tsx
import { Sidebar } from '@/components/layouts/Sidebar';
import { Header } from '@/components/layouts/Header';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### {{Page Pattern}}

{{Use Case: Define route entry points that delegate to containers.}}

{{Why: Pages handle metadata (title, description) while containers handle rendering logic.}}

```typescript
// src/app/(main)/products/page.tsx
import { ProductList } from '@/containers/products/ProductList';

export const metadata = {
  title: 'Products',
};

export default function ProductsPage() {
  return <ProductList />;
}
```

## {{Component Organization}}

### {{UI Components}}

{{Use Case: Create reusable, styled components that accept props for customization.}}

{{Example: A Button component with variants for different contexts (primary action, danger, secondary).}}

```typescript
// src/components/ui/Button/Button.tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && <Spinner className="mr-2" />}
        {children}
      </button>
    );
  }
);
```

### {{Container Components}}

{{Use Case: Combine data fetching, business logic, and UI composition for a feature.}}

{{Example: ProductList container that fetches products, handles loading/error states, and renders the list.}}

```typescript
// src/containers/products/ProductList.tsx
'use client';

import { useProducts } from '@/hooks/useProducts';
import { ProductTable } from '@/components/products/ProductTable';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export function ProductList() {
  const router = useRouter();
  const { data, isLoading, error } = useProducts();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button onClick={() => router.push('/products/new')}>
          Add Product
        </Button>
      </div>
      <ProductTable products={data?.items ?? []} />
    </div>
  );
}
```

## {{Provider Setup}}

### {{Root Providers}}

{{Use Case: Configure global providers (React Query, Authentication) once at the app root.}}

{{Why: Providers wrap the entire application to share context across all pages.}}

```typescript
// src/app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Authenticator } from '@aws-amplify/ui-react';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Authenticator.Provider>
        {children}
      </Authenticator.Provider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### {{Root Layout}}

{{Use Case: Apply providers and global styles to all pages.}}

```typescript
// src/app/layout.tsx
import { Providers } from './providers';
import { configureAmplify } from '@/lib/auth/amplify';
import './globals.css';

// Configure Amplify on the server
configureAmplify();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## {{Environment Configuration}}

### {{Environment Variables}}

{{Use Case: Configure different settings for development, staging, and production environments.}}

```bash
# .env.local

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# AWS Cognito Configuration
NEXT_PUBLIC_AWS_REGION=ap-northeast-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your-user-pool-id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-client-id

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

### {{Configuration Module}}

{{Use Case: Centralize configuration access with type safety and defaults.}}

```typescript
// src/lib/config.ts
export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  },
  aws: {
    region: process.env.NEXT_PUBLIC_AWS_REGION ?? 'ap-northeast-1',
    cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? '',
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? '',
    },
  },
  features: {
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  },
} as const;
```

## {{Best Practices}}

### {{1. Separate Server and Client Components}}

{{Problem: Using hooks in server components causes errors.}}

{{Solution: Mark components using hooks or browser APIs with 'use client'.}}

```typescript
// Server Component (default)
// src/app/(main)/products/page.tsx
import { ProductList } from '@/containers/products/ProductList';

export default function ProductsPage() {
  return <ProductList />;
}

// Client Component
// src/containers/products/ProductList.tsx
'use client';

import { useProducts } from '@/hooks/useProducts';
// ...
```

### {{2. Use Path Aliases}}

{{Problem: Deep relative imports like '../../../components' are hard to read and refactor.}}

{{Solution: Configure path aliases for clean imports.}}

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/services/*": ["./src/services/*"]
    }
  }
}
```

### {{3. Consistent File Naming}}

| {{Type}} | {{Convention}} | {{Example}} |
|------|------------|---------|
| {{Components}} | PascalCase | `ProductCard.tsx` |
| {{Hooks}} | camelCase with use prefix | `useProducts.ts` |
| {{Utilities}} | camelCase | `formatDate.ts` |
| {{Types}} | PascalCase | `Product.ts` |
| {{Constants}} | UPPER_SNAKE_CASE | `API_ROUTES.ts` |

### {{4. Export Patterns}}

{{Use Case: Create clean public APIs for directories.}}

```typescript
// src/components/ui/Button/index.ts
export { Button } from './Button';
export type { ButtonProps } from './Button';

// src/components/ui/index.ts
export * from './Button';
export * from './Input';
export * from './Modal';
```

### {{5. Type-Safe Route Constants}}

{{Use Case: Avoid typos in route strings and enable autocomplete.}}

```typescript
// src/constants/routes.ts
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  PRODUCTS: {
    LIST: '/products',
    NEW: '/products/new',
    DETAIL: (id: string) => `/products/${id}`,
    EDIT: (id: string) => `/products/${id}/edit`,
  },
  SETTINGS: '/settings',
} as const;
```
