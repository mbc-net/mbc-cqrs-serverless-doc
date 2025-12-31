---
description: {{Learn how to manage state effectively using Zustand and React Query in your frontend applications.}}
---

# {{State Management Patterns}}

{{This guide explains how to manage different types of state in frontend applications. Understanding when to use each tool prevents common problems like stale data, unnecessary re-renders, and complex debugging.}}

## {{When to Use This Guide}}

{{Use this guide when you need to:}}

- {{Cache API responses and keep them synchronized with the server}}
- {{Share UI state (sidebar, theme, modals) across components}}
- {{Handle loading and error states for data fetching}}
- {{Implement optimistic updates for better user experience}}
- {{Manage multi-tenant context in a SaaS application}}

## {{Choosing the Right Tool}}

{{The most common mistake is using one tool for all state. Different types of state have different requirements:}}

| {{Category}} | {{Tool}} | {{Examples}} | {{Why This Tool}} |
|----------|------|----------|--------------|
| {{Server State}} | React Query | {{API data, cached responses}} | {{Handles caching, background refetch, stale data automatically}} |
| {{Client State}} | Zustand | {{UI state, user preferences}} | {{Simple API, no boilerplate, performant selectors}} |
| {{Form State}} | React Hook Form | {{Form inputs, validation}} | {{Optimized for form performance, built-in validation}} |
| {{URL State}} | Next.js Router | {{Query params, path params}} | {{Shareable URLs, browser history integration}} |

## {{Common Problems and Solutions}}

| {{Problem}} | {{Wrong Approach}} | {{Right Approach}} |
|---------|----------------|----------------|
| {{Data becomes stale after mutation}} | {{Manually update local state}} | {{Use React Query cache invalidation}} |
| {{Component re-renders on unrelated state changes}} | {{Subscribe to entire Zustand store}} | {{Use selectors to subscribe to specific values}} |
| {{Loading state shown on every page visit}} | {{Always fetch fresh data}} | {{Configure staleTime to serve cached data}} |
| {{User sees old data after edit}} | {{Wait for refetch}} | {{Use optimistic updates}} |

## {{React Query for Server State}}

### {{Use Case: Data List with Filtering}}

{{Scenario: Display a paginated list of products that users can filter by status or search.}}

{{Problem: Without caching, every filter change triggers a network request, even for previously loaded data.}}

{{Solution: React Query caches responses by query key, so returning to a previous filter serves cached data instantly.}}

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

### {{Use Case: Create, Update, Delete with Cache Sync}}

{{Scenario: User creates a new product and expects to see it in the list immediately.}}

{{Problem: After creating a product, the list still shows old data because it's cached.}}

{{Solution: Invalidate related queries after mutations to trigger automatic refetch.}}

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

### {{Use Case: Optimistic Updates for Better UX}}

{{Scenario: User updates a product name and expects instant feedback.}}

{{Problem: Waiting for server response before showing the update feels slow.}}

{{Solution: Update the UI immediately, then sync with server. Roll back if the request fails.}}

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

### {{Use Case: Infinite Scroll List}}

{{Scenario: Display a long list of items that loads more as the user scrolls.}}

{{Problem: Traditional pagination requires clicking "Next" buttons and loses scroll position.}}

{{Solution: Use infinite query to append pages as user scrolls down.}}

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

## {{Zustand for Client State}}

### {{Use Case: UI State (Sidebar, Theme)}}

{{Scenario: User toggles sidebar, and it should stay open/closed as they navigate.}}

{{Problem: Local component state resets on navigation.}}

{{Solution: Use Zustand store to persist UI state across page changes.}}

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

### {{Use Case: Persisted User Preferences}}

{{Scenario: User selects language and page size preferences that should persist across sessions.}}

{{Problem: Settings are lost when user closes the browser.}}

{{Solution: Use Zustand persist middleware to save state to localStorage.}}

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

### {{Use Case: Large Store with Multiple Concerns}}

{{Scenario: Application has authentication, UI, and notification state that need to be shared globally.}}

{{Problem: One large store becomes hard to maintain and test.}}

{{Solution: Use slices pattern to organize related state together while sharing a single store.}}

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

### {{Use Case: Shopping Cart with Computed Values}}

{{Scenario: Display cart total and item count in the header, updated in real-time as items are added.}}

{{Problem: Computing totals on every render is wasteful; subscribing to entire cart causes unnecessary re-renders.}}

{{Solution: Use selectors to compute derived values and subscribe only to what's needed.}}

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

## {{Combining React Query and Zustand}}

### {{Use Case: Authentication State}}

{{Scenario: App needs to know if user is authenticated and fetch user profile data.}}

{{Problem: Authentication state is needed immediately (client state), but profile data comes from API (server state).}}

{{Solution: Use Zustand for auth session state, React Query for profile data that depends on auth.}}

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

### {{Use Case: Multi-Tenant Context}}

{{Scenario: SaaS application where user can switch between tenants, and all data queries should filter by current tenant.}}

{{Problem: Every query needs to know the current tenant, and switching tenants should refresh all data.}}

{{Solution: Store current tenant in Zustand, include tenant in React Query keys to auto-invalidate on switch.}}

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

## {{Best Practices}}

### {{1. Query Key Conventions}}

{{Use Case: Ensure consistent cache keys across the application.}}

{{Why: Inconsistent keys cause cache misses and duplicate requests.}}

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

### {{2. Avoid State Duplication}}

{{Problem: Storing API data in both React Query cache and Zustand causes sync issues.}}

{{Solution: Use React Query as the single source of truth for server data.}}

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

### {{3. Selective Subscriptions}}

{{Problem: Component re-renders whenever any store value changes.}}

{{Solution: Use selectors to subscribe only to values the component needs.}}

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

### {{4. Memoize Selectors}}

{{Use Case: Select multiple values from store without causing extra re-renders.}}

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

### {{5. DevTools Integration}}

{{Use Case: Debug state changes during development.}}

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

### {{6. Error Boundaries for Queries}}

{{Use Case: Gracefully handle API errors without crashing the entire page.}}

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
