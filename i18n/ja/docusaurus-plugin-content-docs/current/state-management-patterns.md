---
description: フロントエンドアプリケーションでZustandとReact Queryを使用した効果的な状態管理方法を学びます。
---

# 状態管理パターン

このガイドでは、フロントエンドアプリケーションにおける様々な種類の状態の管理方法を説明します。各ツールをいつ使用するかを理解することで、古いデータ、不要な再レンダリング、複雑なデバッグなどの一般的な問題を防ぐことができます。

## このガイドを使用するタイミング

以下が必要な場合にこのガイドを使用してください：

- APIレスポンスをキャッシュし、サーバーと同期を保つ
- コンポーネント間でUI状態（サイドバー、テーマ、モーダル）を共有する
- データ取得のローディング状態とエラー状態を処理する
- より良いユーザー体験のための楽観的更新を実装する
- SaaSアプリケーションでマルチテナントコンテキストを管理する

## 適切なツールの選択

最も一般的な間違いは、すべての状態に1つのツールを使用することです。状態の種類によって要件が異なります：

| カテゴリ | ツール | 例 | このツールを選ぶ理由 |
|----------|------|----------|--------------|
| サーバー状態 | React Query | APIデータ、キャッシュされたレスポンス | キャッシング、バックグラウンド再取得、古いデータを自動的に処理 |
| クライアント状態 | Zustand | UI状態、ユーザー設定 | シンプルなAPI、ボイラープレート不要、高パフォーマンスなセレクター |
| フォーム状態 | React Hook Form | フォーム入力、バリデーション | フォームパフォーマンスに最適化、組み込みバリデーション |
| URL状態 | Next.js Router | クエリパラメータ、パスパラメータ | 共有可能なURL、ブラウザ履歴の統合 |

## よくある問題と解決策

| 問題 | 誤ったアプローチ | 正しいアプローチ |
|---------|----------------|----------------|
| 変更後にデータが古くなる | ローカル状態を手動で更新 | React Queryのキャッシュ無効化を使用 |
| 無関係な状態変更でコンポーネントが再レンダリングされる | Zustandストア全体をサブスクライブ | セレクターを使用して特定の値をサブスクライブ |
| ページ訪問のたびにローディング状態が表示される | 常に新しいデータを取得 | staleTimeを設定してキャッシュデータを提供 |
| 編集後にユーザーが古いデータを見る | 再取得を待つ | 楽観的更新を使用 |

## サーバー状態のためのReact Query

### ユースケース: フィルタリング付きデータリスト

シナリオ: ユーザーがステータスや検索でフィルタリングできるページネーション付き商品リストを表示します。

問題: キャッシングなしでは、以前読み込んだデータでもフィルター変更のたびにネットワークリクエストが発生します。

解決策: React Queryはクエリキーでレスポンスをキャッシュするため、以前のフィルターに戻るとキャッシュデータが即座に提供されます。

```typescript
// src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '@/services/api/products';

// Query keys factory - ensures consistent cache keys
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

// List query hook
export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => productApi.list(filters),
  });
}

// Detail query hook
export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productApi.get(id),
    enabled: !!id,
  });
}
```

### ユースケース: キャッシュ同期を伴う作成、更新、削除

シナリオ: ユーザーが新しい商品を作成し、リストにすぐに表示されることを期待します。

問題: 商品作成後、キャッシュされているためリストには古いデータが表示されます。

解決策: ミューテーション後に関連クエリを無効化して自動再取得をトリガーします。

```typescript
// src/hooks/useProducts.ts
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productApi.create,
    onSuccess: () => {
      // Invalidate list queries to refetch
      queryClient.invalidateQueries({
        queryKey: productKeys.lists(),
      });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      productApi.update(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({
        queryKey: productKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(id),
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productKeys.lists(),
      });
    },
  });
}
```

### ユースケース: より良いUXのための楽観的更新

シナリオ: ユーザーが商品名を更新し、即座のフィードバックを期待します。

問題: 更新を表示する前にサーバーレスポンスを待つと遅く感じます。

解決策: UIを即座に更新し、サーバーと同期します。リクエストが失敗した場合はロールバックします。

```typescript
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      productApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: productKeys.detail(id),
      });

      // Snapshot the previous value
      const previousProduct = queryClient.getQueryData(
        productKeys.detail(id)
      );

      // Optimistically update to the new value
      queryClient.setQueryData(productKeys.detail(id), (old: Product) => ({
        ...old,
        ...data,
      }));

      // Return context with the snapshotted value
      return { previousProduct };
    },
    onError: (err, { id }, context) => {
      // Roll back to the previous value on error
      queryClient.setQueryData(
        productKeys.detail(id),
        context?.previousProduct
      );
    },
    onSettled: (_, __, { id }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(id),
      });
    },
  });
}
```

### ユースケース: 無限スクロールリスト

シナリオ: ユーザーがスクロールするとさらに読み込む長いアイテムリストを表示します。

問題: 従来のページネーションは「次へ」ボタンのクリックが必要で、スクロール位置が失われます。

解決策: 無限クエリを使用して、ユーザーがスクロールダウンするとページを追加します。

```typescript
export function useInfiniteProducts(filters: ProductFilters = {}) {
  return useInfiniteQuery({
    queryKey: productKeys.list({ ...filters, infinite: true }),
    queryFn: ({ pageParam = 1 }) =>
      productApi.list({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.hasMore) {
        return pages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

// Usage in component
function ProductInfiniteList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProducts();

  const products = data?.pages.flatMap(page => page.items) ?? [];

  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          loading={isFetchingNextPage}
        >
          Load More
        </Button>
      )}
    </div>
  );
}
```

## クライアント状態のためのZustand

### ユースケース: UI状態（サイドバー、テーマ）

シナリオ: ユーザーがサイドバーを切り替え、ナビゲーション中も開閉状態が維持されるべきです。

問題: ローカルコンポーネントの状態がナビゲーション時にリセットされます。

解決策: Zustandストアを使用してページ遷移間でUI状態を永続化します。

```typescript
// src/stores/useUIStore.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}));
```

### ユースケース: 永続化されたユーザー設定

シナリオ: ユーザーがセッション間で永続化すべき言語とページサイズの設定を選択します。

問題: ユーザーがブラウザを閉じると設定が失われます。

解決策: Zustandのpersistミドルウェアを使用して状態をlocalStorageに保存します。

```typescript
// src/stores/useSettingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  language: string;
  pageSize: number;
  setLanguage: (language: string) => void;
  setPageSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en',
      pageSize: 20,
      setLanguage: (language) => set({ language }),
      setPageSize: (pageSize) => set({ pageSize }),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### ユースケース: 複数の関心事を持つ大規模ストア

シナリオ: アプリケーションには認証、UI、通知状態があり、グローバルに共有する必要があります。

問題: 1つの大きなストアは保守とテストが困難になります。

解決策: スライスパターンを使用して、単一のストアを共有しながら関連する状態を整理します。

```typescript
// src/stores/slices/authSlice.ts
import { StateCreator } from 'zustand';

export interface AuthSlice {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
});

// src/stores/slices/uiSlice.ts
export interface UISlice {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
});

// src/stores/useAppStore.ts
import { create } from 'zustand';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createUISlice, UISlice } from './slices/uiSlice';

type AppStore = AuthSlice & UISlice;

export const useAppStore = create<AppStore>()((...args) => ({
  ...createAuthSlice(...args),
  ...createUISlice(...args),
}));
```

### ユースケース: 計算値を持つショッピングカート

シナリオ: ヘッダーにカート合計とアイテム数を表示し、アイテムが追加されるとリアルタイムで更新されます。

問題: レンダリングのたびに合計を計算するのは無駄で、カート全体をサブスクライブすると不要な再レンダリングが発生します。

解決策: セレクターを使用して派生値を計算し、必要なものだけをサブスクライブします。

```typescript
// src/stores/useCartStore.ts
import { create } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    }),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),
  updateQuantity: (id, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, quantity } : i
      ),
    })),
  clearCart: () => set({ items: [] }),
}));

// Selectors - compute derived values
export const selectCartTotal = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

export const selectCartItemCount = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);

// Usage - component only re-renders when selected value changes
function CartSummary() {
  const total = useCartStore(selectCartTotal);
  const itemCount = useCartStore(selectCartItemCount);

  return (
    <div>
      <span>{itemCount} items</span>
      <span>${total.toFixed(2)}</span>
    </div>
  );
}
```

## React QueryとZustandの組み合わせ

### ユースケース: 認証状態

シナリオ: アプリはユーザーが認証されているかを知り、ユーザープロファイルデータを取得する必要があります。

問題: 認証状態はすぐに必要（クライアント状態）ですが、プロファイルデータはAPIから取得（サーバー状態）します。

解決策: 認証セッション状態にはZustandを、認証に依存するプロファイルデータにはReact Queryを使用します。

```typescript
// src/stores/useAuthStore.ts
import { create } from 'zustand';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const session = await fetchAuthSession();
      if (session.tokens) {
        const user = await fetchUserInfo();
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    await signOut();
    set({ user: null, isAuthenticated: false });
  },
}));

// src/hooks/useCurrentUser.ts
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';

export function useCurrentUser() {
  const { user, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUserProfile,
    enabled: isAuthenticated,
    initialData: user,
  });
}
```

### ユースケース: マルチテナントコンテキスト

シナリオ: ユーザーがテナント間を切り替えられるSaaSアプリケーションで、すべてのデータクエリは現在のテナントでフィルタリングする必要があります。

問題: すべてのクエリは現在のテナントを知る必要があり、テナント切り替え時にすべてのデータを更新する必要があります。

解決策: 現在のテナントをZustandに保存し、React Queryキーにテナントを含めて切り替え時に自動無効化します。

```typescript
// src/stores/useTenantStore.ts
import { create } from 'zustand';

interface TenantState {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  setCurrentTenant: (tenant: Tenant) => void;
  setTenants: (tenants: Tenant[]) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  currentTenant: null,
  tenants: [],
  setCurrentTenant: (currentTenant) => set({ currentTenant }),
  setTenants: (tenants) => set({ tenants }),
}));

// src/hooks/useTenantData.ts
import { useQuery } from '@tanstack/react-query';
import { useTenantStore } from '@/stores/useTenantStore';

export function useTenantProducts() {
  const currentTenant = useTenantStore((state) => state.currentTenant);

  return useQuery({
    queryKey: ['products', currentTenant?.code],
    queryFn: () => fetchProducts(currentTenant!.code),
    enabled: !!currentTenant,
  });
}
```

## ベストプラクティス

### 1. クエリキーの規則

ユースケース: アプリケーション全体で一貫したキャッシュキーを確保します。

理由: 一貫性のないキーはキャッシュミスと重複リクエストを引き起こします。

```typescript
// Use factory pattern for consistent query keys
export const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters: Filters) => [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },
  users: {
    all: ['users'] as const,
    // ... similar pattern
  },
};
```

### 2. 状態の重複を避ける

問題: APIデータをReact QueryキャッシュとZustandの両方に保存すると同期の問題が発生します。

解決策: サーバーデータの信頼できる唯一の情報源としてReact Queryを使用します。

```typescript
// ❌ Bad: Duplicating server state in Zustand
const useProductStore = create((set) => ({
  products: [], // Don't store API data here
  setProducts: (products) => set({ products }),
}));

// ✅ Good: Use React Query for server state
function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });
}
```

### 3. 選択的なサブスクリプション

問題: ストアの値が変更されるたびにコンポーネントが再レンダリングされます。

解決策: セレクターを使用してコンポーネントが必要とする値のみをサブスクライブします。

```typescript
// ❌ Bad: Subscribe to entire store
function Component() {
  const store = useUIStore(); // Re-renders on any state change
}

// ✅ Good: Subscribe to specific values
function Component() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
}
```

### 4. セレクターをメモ化する

ユースケース: 余分な再レンダリングを引き起こさずにストアから複数の値を選択します。

```typescript
import { shallow } from 'zustand/shallow';

// For multiple values, use shallow comparison
function Component() {
  const { theme, language } = useSettingsStore(
    (state) => ({ theme: state.theme, language: state.language }),
    shallow
  );
}
```

### 5. DevToolsの統合

ユースケース: 開発中に状態変更をデバッグします。

```typescript
import { devtools } from 'zustand/middleware';

const useStore = create<State>()(
  devtools(
    (set) => ({
      // ... state
    }),
    { name: 'AppStore' }
  )
);
```

### 6. クエリのためのエラーバウンダリ

ユースケース: ページ全体をクラッシュさせずにAPIエラーを適切に処理します。

```typescript
// src/components/QueryErrorBoundary.tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

export function QueryErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div>
              <p>Error: {error.message}</p>
              <Button onClick={resetErrorBoundary}>Retry</Button>
            </div>
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```
