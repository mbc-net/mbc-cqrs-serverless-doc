---
description: MBC CQRS ServerlessアプリケーションのためのNext.jsフロントエンドプロジェクトの構造化方法を学びます。
---

# フロントエンドプロジェクト構造

このガイドでは、MBC CQRS Serverlessバックエンドと統合するNext.jsフロントエンドアプリケーションの構成方法を説明します。適切に構造化されたプロジェクトは、保守性を向上させ、チームコラボレーションを可能にし、アプリケーションの成長に合わせて効果的にスケールします。

## このガイドを使用するタイミング

以下の場合にこのガイドを使用してください：

- MBC CQRS Serverless APIに接続する新しいフロントエンドアプリケーションを構築する場合
- 既存のReactアプリケーションをApp Router付きのNext.jsに移行する場合
- Cognito認証を使用したマルチテナントSaaSアプリケーションを構築する場合
- CQRSベースのデータ管理用の管理画面やダッシュボードを作成する場合

## この構造が解決する問題

| 問題 | 解決策 |
|---------|----------|
| サーバーコードとクライアントコードの混在がハイドレーションエラーを引き起こす | コンテナ（クライアント）をページ（サーバー）から分離する |
| API型がバックエンドと同期しなくなる | services/sdkで生成されたOpenAPI SDKを使用する |
| 状態管理が混乱する | サーバー状態（React Query）をクライアント状態（Zustand）から分離する |
| コンポーネントが大きくなりすぎてテストが困難になる | ui（プレゼンテーション）、forms（入力）、containers（ロジック）に分割する |
| 認証ロジックがファイル全体に散らばる | lib/authにAmplify設定を集中させる |

## 技術スタック

| カテゴリ | 技術 | 目的 |
|----------|------------|---------|
| フレームワーク | Next.js 15+ | App Router付きReactフレームワーク |
| 言語 | TypeScript | 型安全な開発 |
| 状態管理 | Zustand | クライアント側状態管理 |
| サーバー状態 | TanStack React Query | サーバー状態のキャッシュと同期 |
| フォーム | React Hook Form + Zod | バリデーション付きフォーム処理 |
| 認証 | AWS Amplify | Cognito統合 |
| APIクライアント | OpenAPI SDK | 型安全なAPI呼び出し |
| スタイリング | Tailwind CSS | ユーティリティファーストCSS |
| UIコンポーネント | Ant Design / Radix UI | コンポーネントライブラリ |

## ディレクトリ構造

以下の構造は関心事を明確に分離し、中〜大規模アプリケーションに適切にスケールします：

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

## 主要ディレクトリの説明

### app/ - ページルート

ユースケース：URLルートとページメタデータを定義します。ページはコンテナをインポートする薄いラッパーであるべきです。

理由：Next.js App Routerはファイルベースのルーティングを使用します。ページをシンプルに保つことで、コンテナを独立してテストできます。

### containers/ - ビジネスロジック

ユースケース：特定機能のデータ取得、状態管理、ユーザーインタラクションを処理します。

理由：ビジネスロジックをプレゼンテーションから分離することで、コンポーネントが再利用可能でテスト可能になります。

### components/ui/ - デザインシステム

ユースケース：アプリケーション全体で使用する一貫したUI要素を構築します。

理由：共有コンポーネントライブラリは視覚的な一貫性を確保し、コードの重複を減らします。

### services/sdk/ - API型

ユースケース：OpenAPI仕様から自動生成されたTypeScript型とAPIクライアント。

理由：フロントエンドの型がバックエンドと正確に一致することを保証し、コンパイル時に型エラーを検出します。

### stores/ - クライアント状態

ユースケース：サイドバーの開閉、テーマ、選択されたテナントなどのUI状態を管理します。

理由：Zustandはボイラープレートなしでシンプルかつ高性能な状態管理を提供します。

### hooks/ - React Queryフック

ユースケース：API呼び出しをキャッシュ、ローディング状態、エラーハンドリングでラップします。

理由：React Queryはサーバー状態の複雑さ（キャッシュ、再取得、楽観的更新）を処理します。

## App Router構造

### ルートグループ

ユースケース：URLに影響を与えずに認証要件でルートを整理します。

例：ログイン/登録ページ用の(auth)グループ、認証済みページ用の(main)グループ。

```typescript
// src/app/(auth)/login/page.tsx
// URL: /login - No authentication required

// src/app/(main)/dashboard/page.tsx
// URL: /dashboard - Requires authentication

// src/app/(main)/products/page.tsx
// URL: /products - Requires authentication
```

### レイアウトパターン

ユースケース：複数のページ間で共通のUI要素（ヘッダー、サイドバー）を共有します。

例：すべての認証済みページ用のナビゲーション付きメインレイアウト。

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

### ページパターン

ユースケース：コンテナに委譲するルートエントリーポイントを定義します。

理由：ページはメタデータ（タイトル、説明）を処理し、コンテナはレンダリングロジックを処理します。

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

## コンポーネント構成

### UIコンポーネント

ユースケース：カスタマイズ用のpropsを受け取る再利用可能なスタイル付きコンポーネントを作成します。

例：異なるコンテキスト用のバリアント（プライマリアクション、危険、セカンダリ）を持つButtonコンポーネント。

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

### コンテナコンポーネント

ユースケース：機能のためのデータ取得、ビジネスロジック、UI構成を組み合わせます。

例：商品を取得し、ローディング/エラー状態を処理し、リストをレンダリングするProductListコンテナ。

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

## プロバイダー設定

### ルートプロバイダー

ユースケース：アプリのルートでグローバルプロバイダー（React Query、認証）を一度設定します。

理由：プロバイダーはアプリケーション全体をラップして、すべてのページ間でコンテキストを共有します。

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

### ルートレイアウト

ユースケース：すべてのページにプロバイダーとグローバルスタイルを適用します。

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

## 環境設定

### 環境変数

ユースケース：開発、ステージング、本番環境用に異なる設定を構成します。

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

### 設定モジュール

ユースケース：型安全性とデフォルト値で設定アクセスを集中管理します。

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

## ベストプラクティス

### 1. サーバーコンポーネントとクライアントコンポーネントを分離する

問題：サーバーコンポーネントでフックを使用するとエラーが発生します。

解決策：フックやブラウザAPIを使用するコンポーネントに'use client'をマークします。

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

### 2. パスエイリアスを使用する

問題：'../../../components'のような深い相対インポートは読みにくく、リファクタリングが困難です。

解決策：クリーンなインポートのためにパスエイリアスを設定します。

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

### 3. 一貫したファイル命名

| タイプ | 規則 | 例 |
|------|------------|---------|
| コンポーネント | PascalCase | `ProductCard.tsx` |
| フック | camelCase with use prefix | `useProducts.ts` |
| ユーティリティ | camelCase | `formatDate.ts` |
| 型 | PascalCase | `Product.ts` |
| 定数 | UPPER_SNAKE_CASE | `API_ROUTES.ts` |

### 4. エクスポートパターン

ユースケース：ディレクトリ用のクリーンな公開APIを作成します。

```typescript
// src/components/ui/Button/index.ts
export { Button } from './Button';
export type { ButtonProps } from './Button';

// src/components/ui/index.ts
export * from './Button';
export * from './Input';
export * from './Modal';
```

### 5. 型安全なルート定数

ユースケース：ルート文字列のタイプミスを防ぎ、自動補完を有効にします。

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
