---
description: Learn how to manage state effectively in your frontend applications using Context API, axios, and Apollo Client.
---

# State Management Patterns

This guide explains how to manage different types of state in frontend applications. Understanding when to use each tool prevents common problems like stale data, unnecessary re-renders, and complex debugging.

## When to Use This Guide

Use this guide when you need to:

- Cache API responses and keep them synchronized with the server
- Share UI state (sidebar, theme, modals) across components
- Handle loading and error states for data fetching
- Implement optimistic updates for better user experience
- Manage multi-tenant context in a SaaS application

## Choosing the Right Tool

The most common mistake is using one tool for all state. Different types of state have different requirements:

| Category | Tool | Examples | Why This Tool |
|----------|------|----------|--------------|
| Server State | Context API + axios | API data, loading states | Direct control over HTTP requests, simple caching strategies |
| Real-time State | Apollo Client | GraphQL subscriptions, live updates | Built-in subscription support for AppSync |
| Client State | Context API | UI state, user preferences | React built-in, no additional dependencies |
| Form State | React Hook Form | Form inputs, validation | Optimized for form performance, built-in validation |
| URL State | Next.js Router | Query params, path params | Shareable URLs, browser history integration |

## Current Implementation

The MBC CQRS Serverless Web package uses the following state management architecture:

### AppProviders - Centralized Service Provider

The application uses a centralized provider pattern that combines multiple contexts:

```typescript
// provider.tsx
import React, { createContext, useContext, ReactNode, useMemo } from 'react'
import {
  ApolloClient,
  NormalizedCacheObject,
  ApolloProvider,
} from '@apollo/client'
import { AxiosInstance } from 'axios'
import { UserContext } from './types/UserContext'

// Define the shape of services provided to the app
export interface AppServices {
  httpClient: AxiosInstance
  apolloClient: ApolloClient<NormalizedCacheObject>
  user: UserContext
  urlProvider: IUrlProvider
}

// Create context with null default for error detection
const AppContext = createContext<AppServices | null>(null)

// Main provider that wraps the entire application
export function AppProviders({
  children,
  user,
  httpClient,
  apolloClient,
  urlProvider,
}: AppProvidersProps) {
  const services = useMemo(() => ({
    httpClient: httpClient ?? getClientInstance(),
    apolloClient: apolloClient ?? apolloClientInstance,
    urlProvider: urlProvider ?? new BaseUrlProvider(),
    user: user,
  }), [user, httpClient, apolloClient, urlProvider])

  return (
    <AppRootProvider services={services}>
      <LoadingProvider>{children}</LoadingProvider>
    </AppRootProvider>
  )
}
```

### Custom Hooks for Accessing Services

Create dedicated hooks to access specific services from the context:

```typescript
// Hook to access the HTTP client (axios)
export function useHttpClient(): AxiosInstance {
  const { httpClient } = useAppServices()
  return httpClient
}

// Hook to access the Apollo client for GraphQL
export function useApolloClient(): ApolloClient<NormalizedCacheObject> {
  const { apolloClient } = useAppServices()
  return apolloClient
}

// Hook to access user context
export function useUserContext(): UserContext {
  const { user } = useAppServices()
  return user
}
```

## Context API for Client State

### Use Case: Global Loading State

Scenario: Show a loading overlay during async operations across the application.

Problem: Each component managing its own loading state leads to inconsistent UX.

Solution: Use a centralized LoadingContext that all components can access.

```typescript
// stores/index.ts
export interface LoadingState {
  isLoading: boolean
  setLoading: () => void
  closeLoading: () => void
}

// stores/provider/index.tsx
'use client'

import React, { createContext, useState, useMemo, ReactNode } from 'react'
import { LoadingState } from '..'

export const LoadingContext = createContext<LoadingState>({
  isLoading: true,
  setLoading: () => console.warn('LoadingProvider not found'),
  closeLoading: () => console.warn('LoadingProvider not found'),
})

LoadingContext.displayName = 'LoadingContext'

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      isLoading,
      setLoading: () => setIsLoading(true),
      closeLoading: () => setIsLoading(false),
    }),
    [isLoading]
  )

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  )
}
```

### Use Case: Custom Hook for Loading State

Create a custom hook with proper error handling:

```typescript
// stores/hooks/index.ts
import React, { useContext } from 'react'
import { LoadingContext } from '../provider'

export function useLoadingStore() {
  const context = useContext(LoadingContext)
  // Safeguard: throw error if hook used outside provider
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}
```

### Use Case: Wrapping Async Actions

Scenario: Execute async functions while automatically managing the loading overlay.

```typescript
// hook/useAsyncAction.ts
import { useLoadingStore } from '../stores/hooks'
import { useCallback } from 'react'

export const useAsyncAction = () => {
  const loadingStore = useLoadingStore()

  const performAction = useCallback(
    async <T>(asyncFunction: () => Promise<T>): Promise<T> => {
      loadingStore.setLoading()
      try {
        return await asyncFunction()
      } catch (error) {
        console.error('Async action failed:', error)
        throw error
      } finally {
        loadingStore.closeLoading()
      }
    },
    [loadingStore]
  )

  return { performAction, isLoading: loadingStore.isLoading }
}

// Usage in component
function ProductPage() {
  const { performAction, isLoading } = useAsyncAction()

  const handleSubmit = async (data: ProductData) => {
    await performAction(async () => {
      await productApi.create(data)
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  )
}
```

## axios for HTTP Requests

### Use Case: Centralized HTTP Client with Authentication

Scenario: All API requests need authentication tokens and consistent error handling.

Solution: Create a singleton axios instance with interceptors for token injection.

```typescript
// sdk/app-client.ts
import axios, { AxiosInstance } from 'axios'
import { Auth, withSSRContext } from 'aws-amplify'

export abstract class TokenHandlerBase {
  public constructor(protected serverSideContext?: GetServerSidePropsContext) {}

  public static init(
    serverSideContext?: GetServerSidePropsContext
  ): TokenHandlerBase {
    // Return test handler for Playwright tests
    if (process.env.NEXT_PUBLIC_ENV_PLAYWRIGHT === 'true') {
      return new TestTokenHandler(serverSideContext)
    }
    return new DefaultTokenHandler(serverSideContext)
  }

  public abstract getToken(): Promise<string>
}

export class DefaultTokenHandler extends TokenHandlerBase {
  public async getToken(): Promise<string> {
    // Handle SSR vs client-side token retrieval
    if (!!this.serverSideContext) {
      const { Auth: AuthSSR } = withSSRContext({
        req: this.serverSideContext.req,
      })
      return (await AuthSSR.currentSession()).getIdToken().getJwtToken()
    } else {
      return (await Auth.currentSession()).getIdToken().getJwtToken()
    }
  }
}

export class AppClient {
  private static instance: AxiosInstance

  public static getAppClientInstance(
    token?: string | (() => Promise<string>),
    headers?: Record<string, string>
  ): AxiosInstance {
    if (!AppClient.instance) {
      AppClient.instance = axios.create({
        baseURL: process.env.NEXT_PUBLIC_MASTER_API_BASE,
        timeout: 0,
        headers: { ...headers },
      })
    }
    // Add interceptor to inject auth token
    AppClient.instance.interceptors.request.use(
      async (config) => {
        let tokenString = ''
        if (token) {
          tokenString = typeof token === 'string' ? token : await token()
        }
        config.headers.Authorization = `Bearer ${tokenString}`
        return config
      },
      (error) => Promise.reject(error)
    )
    return AppClient.instance
  }
}

// Factory function for creating authenticated client
export const getClientInstance = (headers?: Record<string, string>) => {
  const tokenHandler = TokenHandlerBase.init()

  const token = () =>
    tokenHandler
      .getToken()
      .then((token) => token)
      .catch((err) => {
        const error = new UnauthorizedException(
          null,
          err,
          'Failed to get access token. Session expired.'
        )
        return Promise.reject(error)
      })
  return AppClient.getAppClientInstance(token, headers)
}
```

### Use Case: Making API Calls

Using the HTTP client through the context hook:

```typescript
import { useHttpClient } from '@mbc-cqrs-serverless/master-web/AppProviders'

function ProductList() {
  const httpClient = useHttpClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await httpClient.get('/products')
      setProducts(response.data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  return (
    <div>
      {loading ? <Spinner /> : products.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  )
}
```

## Apollo Client for Real-time Subscriptions

### Use Case: GraphQL Subscriptions with AppSync

Scenario: Display real-time command status updates (e.g., data sync progress).

Solution: Use Apollo Client's subscription feature connected to AWS AppSync.

```typescript
// appsync/subscribe.ts
import { gql, ApolloClient, NormalizedCacheObject } from '@apollo/client'
import {
  OnMessageSubscription,
  OnMessageSubscriptionVariables,
} from './API'
import { onMessage } from './graphql/subscriptions'

export type CommandStatusContent = {
  status:
    | 'finish:FINISHED'
    | 'finish:STARTED'
    | 'sync_data:FINISHED'
    | 'sync_data:STARTED'
    | 'transform_data:FINISHED'
    | 'transform_data:STARTED'
}

export type DecodedMessage = Omit<Message, 'content'> & {
  content: MessageContent
}

export function subscribeMessage(
  client: ApolloClient<NormalizedCacheObject>,
  filters: OnMessageSubscriptionVariables,
  handler: (value: DecodedMessage) => void | Promise<void>
) {
  const observable = client.subscribe<
    OnMessageSubscription,
    OnMessageSubscriptionVariables
  >({
    query: gql`
      ${onMessage}
    `,
    variables: filters,
  })

  return observable.subscribe({
    next: ({ data }) => {
      if (!data.onMessage) {
        return
      }
      const message: DecodedMessage = {
        ...data.onMessage,
        content: parseContent(data.onMessage.content),
      }
      if (message) {
        handler(message)
      }
    },
    error: (error) => console.error('subscribeMessage error:', error),
  })
}

function parseContent(content: string): MessageContent {
  try {
    return JSON.parse(content)
  } catch (error) {
    return content
  }
}
```

### Use Case: Using Subscriptions in Components

```typescript
import { useApolloClient } from '@mbc-cqrs-serverless/master-web/AppProviders'
import { subscribeMessage, DecodedMessage } from '../appsync/subscribe'
import { useEffect, useState } from 'react'

function CommandStatusDisplay({ commandId }: { commandId: string }) {
  const apolloClient = useApolloClient()
  const [status, setStatus] = useState<string>('pending')

  useEffect(() => {
    const subscription = subscribeMessage(
      apolloClient,
      { pk: commandId },
      (message: DecodedMessage) => {
        if (typeof message.content === 'object') {
          setStatus(message.content.status)
        }
      }
    )

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [apolloClient, commandId])

  return <StatusBadge status={status} />
}
```

## Best Practices

### 1. Use Context Selectively

Problem: Putting too much state in a single context causes unnecessary re-renders.

Solution: Split contexts by domain and use memoization.

```typescript
// Good: Separate contexts for different concerns
<AuthProvider>
  <UIProvider>
    <LoadingProvider>
      {children}
    </LoadingProvider>
  </UIProvider>
</AuthProvider>

// Good: Memoize context values
const value = useMemo(
  () => ({ isLoading, setLoading, closeLoading }),
  [isLoading]
)
```

### 2. Always Handle Errors in Hooks

```typescript
export function useAppServices(): AppServices {
  const context = useContext(AppContext)
  // Throw helpful error if context is missing
  if (context === null) {
    throw new Error('useAppServices must be used within an AppRootProvider')
  }
  return context
}
```

### 3. Use Factory Pattern for HTTP Client

This allows for different configurations in different environments:

```typescript
// Production: Real auth tokens
const client = getClientInstance()

// Testing: Mock tokens
class TestTokenHandler extends TokenHandlerBase {
  public async getToken(): Promise<string> {
    return 'test'
  }
}
```

### 4. Clean Up Subscriptions

Always unsubscribe from Apollo subscriptions to prevent memory leaks:

```typescript
useEffect(() => {
  const subscription = subscribeMessage(client, filters, handler)

  return () => {
    subscription.unsubscribe()
  }
}, [client, filters])
```

## Alternative Options

While the current implementation uses Context API with axios and Apollo Client, there are alternative state management solutions you may consider for specific use cases:

### React Query (TanStack Query)

Best for applications with complex server state caching requirements:

- Automatic background refetching
- Cache invalidation and synchronization
- Optimistic updates
- Infinite scroll and pagination

```typescript
// Example: React Query usage
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.list(),
  })
}
```

### Zustand

Best for applications needing lightweight global state without Context boilerplate:

- Simple API with selectors
- Persist middleware for localStorage
- DevTools integration
- No provider required

```typescript
// Example: Zustand store
import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
```

### SWR

Best for simple data fetching with automatic revalidation:

- Stale-while-revalidate strategy
- Focus revalidation
- Polling support

```typescript
// Example: SWR usage
import useSWR from 'swr'

function Profile() {
  const { data, error, isLoading } = useSWR('/api/user', fetcher)

  if (isLoading) return <Spinner />
  if (error) return <Error />
  return <div>Hello, {data.name}</div>
}
```

Choose the right tool based on your project's complexity and requirements. The current implementation with Context API + axios + Apollo Client provides a solid foundation that can be extended as needed.
