---
description: フロントエンドアプリケーションでContext API、axios、Apollo Clientを使用した効果的な状態管理方法を学びます。
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
| サーバー状態 | Context API + axios | APIデータ、ローディング状態 | HTTPリクエストの直接制御、シンプルなキャッシング戦略 |
| リアルタイム状態 | Apollo Client | GraphQLサブスクリプション、ライブ更新 | AppSync用の組み込みサブスクリプションサポート |
| クライアント状態 | Context API | UI状態、ユーザー設定 | React組み込み、追加の依存関係なし |
| フォーム状態 | React Hook Form | フォーム入力、バリデーション | フォームパフォーマンスに最適化、組み込みバリデーション |
| URL状態 | Next.js Router | クエリパラメータ、パスパラメータ | 共有可能なURL、ブラウザ履歴の統合 |

## 現在の実装

MBC CQRS Serverless Webパッケージは以下の状態管理アーキテクチャを使用しています：

### AppProviders - 集中サービスプロバイダー

アプリケーションは複数のコンテキストを組み合わせた集中プロバイダーパターンを使用しています：

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

// Define the shape of services provided to the app (アプリに提供されるサービスの形状を定義)
export interface AppServices {
  httpClient: AxiosInstance
  apolloClient: ApolloClient<NormalizedCacheObject>
  user: UserContext
  urlProvider: IUrlProvider
}

// Create context with null default for error detection (エラー検出のためnullデフォルトでコンテキストを作成)
const AppContext = createContext<AppServices | null>(null)

// Main provider that wraps the entire application (アプリケーション全体をラップするメインプロバイダー)
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

### サービスにアクセスするためのカスタムフック

コンテキストから特定のサービスにアクセスするための専用フックを作成します：

```typescript
// Hook to access the HTTP client (axios) (HTTPクライアントaxiosにアクセスするフック)
export function useHttpClient(): AxiosInstance {
  const { httpClient } = useAppServices()
  return httpClient
}

// Hook to access the Apollo client for GraphQL (GraphQL用Apollo Clientにアクセスするフック)
export function useApolloClient(): ApolloClient<NormalizedCacheObject> {
  const { apolloClient } = useAppServices()
  return apolloClient
}

// Hook to access user context (ユーザーコンテキストにアクセスするフック)
export function useUserContext(): UserContext {
  const { user } = useAppServices()
  return user
}
```

## クライアント状態のためのContext API

### ユースケース: グローバルローディング状態

シナリオ: アプリケーション全体で非同期操作中にローディングオーバーレイを表示します。

問題: 各コンポーネントが独自のローディング状態を管理すると、UXが一貫しなくなります。

解決策: すべてのコンポーネントがアクセスできる集中LoadingContextを使用します。

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

  // Memoize context value to prevent unnecessary re-renders (不要な再レンダリングを防ぐためにコンテキスト値をメモ化)
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

### ユースケース: ローディング状態用のカスタムフック

適切なエラーハンドリングを備えたカスタムフックを作成します：

```typescript
// stores/hooks/index.ts
import React, { useContext } from 'react'
import { LoadingContext } from '../provider'

export function useLoadingStore() {
  const context = useContext(LoadingContext)
  // Safeguard: throw error if hook used outside provider (セーフガード: プロバイダー外でフックが使用された場合はエラーをスロー)
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}
```

### ユースケース: 非同期アクションのラップ

シナリオ: ローディングオーバーレイを自動管理しながら非同期関数を実行します。

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

// Usage in component (コンポーネントでの使用)
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

## HTTPリクエストのためのaxios

### ユースケース: 認証付き集中HTTPクライアント

シナリオ: すべてのAPIリクエストには認証トークンと一貫したエラーハンドリングが必要です。

解決策: トークン注入用のインターセプターを持つシングルトンaxiosインスタンスを作成します。

```typescript
// sdk/app-client.ts
import axios, { AxiosInstance } from 'axios'
import { Auth, withSSRContext } from 'aws-amplify'

export abstract class TokenHandlerBase {
  public constructor(protected serverSideContext?: GetServerSidePropsContext) {}

  public static init(
    serverSideContext?: GetServerSidePropsContext
  ): TokenHandlerBase {
    // Return test handler for Playwright tests (Playwrightテスト用のテストハンドラーを返す)
    if (process.env.NEXT_PUBLIC_ENV_PLAYWRIGHT === 'true') {
      return new TestTokenHandler(serverSideContext)
    }
    return new DefaultTokenHandler(serverSideContext)
  }

  public abstract getToken(): Promise<string>
}

export class DefaultTokenHandler extends TokenHandlerBase {
  public async getToken(): Promise<string> {
    // Handle SSR vs client-side token retrieval (SSRとクライアントサイドのトークン取得を処理)
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
    // Add interceptor to inject auth token (認証トークンを注入するインターセプターを追加)
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

// Factory function for creating authenticated client (認証済みクライアントを作成するファクトリ関数)
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

### ユースケース: API呼び出しの実行

コンテキストフックを通じてHTTPクライアントを使用します：

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

## リアルタイムサブスクリプションのためのApollo Client

### ユースケース: AppSyncでのGraphQLサブスクリプション

シナリオ: リアルタイムのコマンドステータス更新（例：データ同期の進捗）を表示します。

解決策: AWS AppSyncに接続されたApollo Clientのサブスクリプション機能を使用します。

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

### ユースケース: コンポーネントでのサブスクリプションの使用

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

    // Cleanup subscription on unmount (アンマウント時にサブスクリプションをクリーンアップ)
    return () => {
      subscription.unsubscribe()
    }
  }, [apolloClient, commandId])

  return <StatusBadge status={status} />
}
```

## ベストプラクティス

### 1. コンテキストを選択的に使用する

問題: 単一のコンテキストに多くの状態を入れすぎると、不要な再レンダリングが発生します。

解決策: ドメインごとにコンテキストを分割し、メモ化を使用します。

```typescript
// Good: Separate contexts for different concerns (良い例: 異なる関心事に対して別々のコンテキスト)
<AuthProvider>
  <UIProvider>
    <LoadingProvider>
      {children}
    </LoadingProvider>
  </UIProvider>
</AuthProvider>

// Good: Memoize context values (良い例: コンテキスト値をメモ化)
const value = useMemo(
  () => ({ isLoading, setLoading, closeLoading }),
  [isLoading]
)
```

### 2. フックで常にエラーを処理する

```typescript
export function useAppServices(): AppServices {
  const context = useContext(AppContext)
  // Throw helpful error if context is missing (コンテキストがない場合は有用なエラーをスロー)
  if (context === null) {
    throw new Error('useAppServices must be used within an AppRootProvider')
  }
  return context
}
```

### 3. HTTPクライアントにファクトリパターンを使用する

これにより、異なる環境で異なる設定が可能になります：

```typescript
// Production: Real auth tokens (本番環境: 実際の認証トークン)
const client = getClientInstance()

// Testing: Mock tokens (テスト環境: モックトークン)
class TestTokenHandler extends TokenHandlerBase {
  public async getToken(): Promise<string> {
    return 'test'
  }
}
```

### 4. サブスクリプションをクリーンアップする

メモリリークを防ぐため、Apolloサブスクリプションから常にサブスクライブ解除します：

```typescript
useEffect(() => {
  const subscription = subscribeMessage(client, filters, handler)

  return () => {
    subscription.unsubscribe()
  }
}, [client, filters])
```

## 代替オプション

現在の実装ではContext APIとaxios、Apollo Clientを使用していますが、特定のユースケースに対して検討できる代替の状態管理ソリューションがあります：

### React Query (TanStack Query)

複雑なサーバー状態キャッシング要件を持つアプリケーションに最適：

- 自動バックグラウンド再取得
- キャッシュ無効化と同期
- 楽観的更新
- 無限スクロールとページネーション

```typescript
// Example: React Query usage (例: React Queryの使用)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.list(),
  })
}
```

### Zustand

Contextのボイラープレートなしで軽量なグローバル状態が必要なアプリケーションに最適：

- セレクター付きのシンプルなAPI
- localStorageのためのpersistミドルウェア
- DevToolsの統合
- プロバイダー不要

```typescript
// Example: Zustand store (例: Zustandストア)
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

自動再検証を伴うシンプルなデータ取得に最適：

- Stale-while-revalidate戦略
- フォーカス時の再検証
- ポーリングサポート

```typescript
// Example: SWR usage (例: SWRの使用)
import useSWR from 'swr'

function Profile() {
  const { data, error, isLoading } = useSWR('/api/user', fetcher)

  if (isLoading) return <Spinner />
  if (error) return <Error />
  return <div>Hello, {data.name}</div>
}
```

プロジェクトの複雑さと要件に基づいて適切なツールを選択してください。Context API + axios + Apollo Clientによる現在の実装は、必要に応じて拡張できる堅実な基盤を提供します。
