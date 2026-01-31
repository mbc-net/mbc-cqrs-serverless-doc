---
description: マスターデータ管理UIコンポーネントを構築するためのMaster Webパッケージについて学びます。
---

# マスター用フロントパッケージ

MBC CQRS Serverlessアプリケーションでマスターデータと設定を管理するためのフロントエンドコンポーネントライブラリです。

## インストール

```bash
npm install @mbc-cqrs-serverless/master-web
```

## クイックスタート（推奨セットアップ）

:::tip ここから始める
**これは master-web を Next.js App Router と統合する推奨方法です。** このパターンに従うことで、`httpClient.get is not a function` などの一般的な問題を回避できます。
:::

このライブラリを Next.js App Router (v14+/v15) で使用する場合は、**Layout ベースの Provider パターン**を使用してください。`layout.tsx` ファイルで `AppProviders` をセットアップし、`page.tsx` ファイルではコンポーネントの動的インポートを使用します。

### ステップ 1: layout.tsx を作成

Provider をセットアップするレイアウトファイルを作成します。これにより、子コンポーネントがマウントされる前にコンテキストが適切に初期化されます。

```tsx
// app/admin/[tenant]/master/layout.tsx
'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'
import type { IUrlProvider } from '@mbc-cqrs-serverless/master-web/UrlProvider'

// Dynamic import of AppProviders (SSR disabled) (AppProviders の動的インポート、SSR 無効)
const AppProviders = dynamic(
  () =>
    import('@mbc-cqrs-serverless/master-web/AppProviders').then(
      (mod) => mod.AppProviders
    ),
  { ssr: false }
)

// Custom URL provider for your application's routing (アプリケーションのルーティング用カスタム URL プロバイダー)
class MasterUrlProvider implements IUrlProvider {
  protected readonly baseUrl: string
  public readonly SETTINGS_PAGE_URL: string
  public readonly ADD_SETTINGS_PAGE_URL: string
  public readonly EDIT_SETTINGS_PAGE_URL: string
  public readonly DATA_PAGE_URL: string
  public readonly ADD_DATA_PAGE_URL: string
  public readonly EDIT_DATA_PAGE_URL: string
  public readonly FAQ_CATEGORY_PAGE_URL: string
  public readonly TOP_URL: string

  constructor(tenantCode: string) {
    this.baseUrl = `/admin/${tenantCode}/master`
    this.SETTINGS_PAGE_URL = `${this.baseUrl}/master-setting`
    this.ADD_SETTINGS_PAGE_URL = `${this.baseUrl}/master-setting/new`
    this.EDIT_SETTINGS_PAGE_URL = this.SETTINGS_PAGE_URL
    this.DATA_PAGE_URL = `${this.baseUrl}/master-data`
    this.ADD_DATA_PAGE_URL = `${this.baseUrl}/master-data/new`
    this.EDIT_DATA_PAGE_URL = this.DATA_PAGE_URL
    this.FAQ_CATEGORY_PAGE_URL = `${this.baseUrl}/faq-category`
    this.TOP_URL = `/admin/${tenantCode}`
  }

  public getCopySettingPageUrl(id: string): string {
    return `${this.baseUrl}/master-setting/${id}/copy/new`
  }
  public getDetailedCopySettingPageUrl(id: string): string {
    return `${this.baseUrl}/master-setting/${id}/copy`
  }
}

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ tenant: string }>()
  const tenantCode = params?.tenant || 'common'

  const urlProvider = useMemo(() => new MasterUrlProvider(tenantCode), [tenantCode])

  // Create httpClient with Axios interceptor for automatic auth token injection (自動認証トークン注入のためのAxiosインターセプター付きhttpClientを作成)
  const httpClient = useMemo(() => {
    const baseEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:3010'
    const instance = axios.create({
      baseURL: `${baseEndpoint}/api`,
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-code': tenantCode,
      },
    })

    instance.interceptors.request.use(async (config) => {
      try {
        const session = await fetchAuthSession()
        const token = session.tokens?.idToken?.toString()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch {
        // Ignore auth errors (認証エラーを無視)
      }
      return config
    })

    return instance
  }, [tenantCode])

  const user = useMemo(() => ({ tenantCode, tenantRole: 'admin' }), [tenantCode])

  return (
    <AppProviders user={user} urlProvider={urlProvider} httpClient={httpClient}>
      <div className="p-6">{children}</div>
    </AppProviders>
  )
}
```

### ステップ 2: page.tsx を作成

レイアウトでプロバイダーをセットアップした後、各ページコンポーネントはシンプルになります：

```tsx
// app/admin/[tenant]/master/master-setting/page.tsx
'use client'

import dynamic from 'next/dynamic'
import MsLayout from '@mbc-cqrs-serverless/master-web/MsLayout'
import '@mbc-cqrs-serverless/master-web/styles.css'

const MasterSetting = dynamic(
  () => import('@mbc-cqrs-serverless/master-web/MasterSetting').then((mod) => mod.default),
  { ssr: false }
)

export default function MasterSettingPage() {
  return (
    <main>
      <MsLayout useLoading>
        <MasterSetting />
      </MsLayout>
    </main>
  )
}
```

### ステップ 3: 環境変数を設定

```bash
# .env.local
NEXT_PUBLIC_API_ENDPOINT=http://localhost:3010
NEXT_PUBLIC_MASTER_APPSYNC_URL=https://xxxxxxxx.appsync-api.ap-northeast-1.amazonaws.com/graphql
NEXT_PUBLIC_MASTER_APPSYNC_APIKEY=da2-xxxxxxxxxxxxxxxxx
NEXT_PUBLIC_MASTER_APPSYNC_REGION=ap-northeast-1
```

### なぜこのパターンを使うのか？

| メリット | 説明 |
|-------------|-----------------|
| **コンテキストの分離を回避** | npmパッケージのReact Contextは分離されることがあります。Layoutを使用すると、コンテキストが最初に初期化されることが保証されます。 |
| **同期的な初期化** | `useMemo`を使用することで、httpClientが同期的に作成され、競合状態を回避できます。 |
| **認証トークンの自動注入** | Axiosインターセプターがリクエストごとに最新の認証トークンを注入します。 |
| **シンプルなページコンポーネント** | ページは動的インポートとコンポーネントのレンダリングだけで済みます。 |

:::info 詳細について
代替パターン、トラブルシューティング、詳細な説明については[Next.js App Router統合](#nextjs-app-router-integration)を参照してください。
:::

## 概要

Master Webパッケージ（`@mbc-cqrs-serverless/master-web`）は、マスターデータと設定を管理するための完全なReactコンポーネントセットを提供します。バックエンドのMaster Serviceとシームレスに統合され、構築済みのページ、フォーム、データテーブルが含まれています。

## 機能

- **マスター設定管理**: マスター設定の表示、作成、編集、削除
- **マスターデータ管理**: マスターデータレコードのCRUD操作
- **リッチテキストエディタ**: コンテンツフィールド用の組み込みリッチテキストエディタ
- **JSONエディタ**: 構造化データフィールド用のJSONエディタ
- **データテーブル**: TanStack Tableによるソート・ページネーション対応テーブル
- **リアルタイム更新**: AWS AppSync統合によるリアルタイムデータ同期
- **コピー機能**: マスター設定とデータのクローン

## 主要コンポーネント

:::info インポートオプション
コンポーネントはメインパッケージまたはサブパスインポートからインポートできます：
```tsx
// Main package import (メインパッケージインポート)
import { MasterSetting } from "@mbc-cqrs-serverless/master-web";

// Sub-path import (サブパスインポート)
import MasterSetting from "@mbc-cqrs-serverless/master-web/MasterSetting";
```
:::

### MasterSetting

検索、フィルター、ページネーション機能を備えたマスター設定一覧を表示します。

```tsx
import { MasterSetting } from "@mbc-cqrs-serverless/master-web";
import "@mbc-cqrs-serverless/master-web/styles.css";

export default function MasterSettingsPage() {
  return <MasterSetting />;
}
```

### EditMasterSettings

マスター設定の作成・編集用フォームコンポーネント。

```tsx
import { EditMasterSettings } from "@mbc-cqrs-serverless/master-web";

export default function EditMasterSettingsPage({ params }: { params: { id: string } }) {
  return <EditMasterSettings id={params.id} />;
}
```

### CopyMasterSettings

既存の設定に基づいて新しい設定を作成するためのマスター設定コピーコンポーネント。

```tsx
import { CopyMasterSettings } from "@mbc-cqrs-serverless/master-web";

export default function CopyMasterSettingsPage({ params }: { params: { id: string } }) {
  return <CopyMasterSettings id={params.id} />;
}
```

### NewCopyMasterSettings

新しい識別子でマスター設定の新しいコピーを作成するためのコンポーネント。

```tsx
import { NewCopyMasterSettings } from "@mbc-cqrs-serverless/master-web";

export default function NewCopyMasterSettingsPage({ params }: { params: { id: string } }) {
  return <NewCopyMasterSettings id={params.id} />;
}
```

### DetailCopy

マスター設定のコピー詳細情報を表示するためのコンポーネント。

```tsx
import { DetailCopy } from "@mbc-cqrs-serverless/master-web";

export default function DetailCopyPage({ params }: { params: { id: string } }) {
  return <DetailCopy id={params.id} />;
}
```

### MasterData

CRUD操作機能付きでマスターデータレコードをテーブル形式で表示します。

```tsx
import { MasterData } from "@mbc-cqrs-serverless/master-web";

export default function MasterDataPage() {
  return <MasterData />;
}
```

### EditMasterData

マスターデータレコードの作成・編集用フォームコンポーネント。

```tsx
import { EditMasterData } from "@mbc-cqrs-serverless/master-web";

export default function EditMasterDataPage({ params }: { params: { id: string } }) {
  return <EditMasterData id={params.id} />;
}
```

## プロバイダーのセットアップ

認証とAPIアクセスに必要なプロバイダーでアプリケーションをラップします。

### AppProviders

`AppProviders`コンポーネントは、テナント情報を含む`UserContext`型の`user`プロパティが必要です。

```tsx
import { AppProviders } from "@mbc-cqrs-serverless/master-web";
import type { UserContext } from "@mbc-cqrs-serverless/master-web";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // UserContext contains tenant information (UserContextはテナント情報を含む)
  const user: UserContext = {
    tenantCode: "your-tenant-code",
    tenantRole: "admin",
  };

  return (
    <AppProviders user={user}>
      {children}
    </AppProviders>
  );
}
```

### AppProviders プロパティ

| プロパティ | 型 | 必須 | 説明 |
|----------|----------|--------------|-----------------|
| `user` | `UserContext` | はい | テナント情報を含むユーザーコンテキスト |
| `httpClient` | `AxiosInstance` | いいえ | HTTPリクエスト用のカスタムAxiosインスタンス |
| `apolloClient` | `ApolloClient` | いいえ | カスタムApollo Clientインスタンス |
| `urlProvider` | `IUrlProvider` | いいえ | カスタムURLプロバイダーインスタンス |

### UserContext 型

`UserContext`型はユーザーオブジェクトの形状を定義します。`useUserContext`フックの戻り値の型を使用するか、互換性のある型を定義できます：

```tsx
type UserContext = {
  tenantCode: string;  // Tenant identifier (テナント識別子)
  tenantRole: string;  // User role within the tenant (テナント内のユーザーロール)
};
```

:::info 型の使用方法
`UserContext`は内部的に使用されますが、`user`プロパティ用に互換性のあるオブジェクト型を作成できます。
:::

## URLプロバイダー

このパッケージは、アプリケーションURLを管理するためのURLプロバイダーシステムを提供します。

### IUrlProvider インターフェース

`IUrlProvider`インターフェースはURL生成のコントラクトを定義します：

```tsx
import type { IUrlProvider } from "@mbc-cqrs-serverless/master-web";

// Interface definition (インターフェース定義)
interface IUrlProvider {
  // Static URLs (静的URL)
  readonly SETTINGS_PAGE_URL: string;
  readonly ADD_SETTINGS_PAGE_URL: string;
  readonly EDIT_SETTINGS_PAGE_URL: string;
  readonly DATA_PAGE_URL: string;
  readonly ADD_DATA_PAGE_URL: string;
  readonly EDIT_DATA_PAGE_URL: string;
  readonly FAQ_CATEGORY_PAGE_URL: string;
  readonly TOP_URL: string;

  // Dynamic URL generators (動的URLジェネレーター)
  getCopySettingPageUrl(id: string): string;
  getDetailedCopySettingPageUrl(id: string): string;
}
```

### BaseUrlProvider クラス

`BaseUrlProvider`クラスは拡張可能なデフォルト実装を提供します：

```tsx
import { BaseUrlProvider, IUrlProvider } from "@mbc-cqrs-serverless/master-web/UrlProvider";

// Create a URL provider with a base segment (ベースセグメントでURLプロバイダーを作成)
const urlProvider = new BaseUrlProvider("my-tenant");

// Access static URLs (静的URLにアクセス)
console.log(urlProvider.SETTINGS_PAGE_URL);  // "/my-tenant/master-setting"
console.log(urlProvider.DATA_PAGE_URL);      // "/my-tenant/master-data"

// Generate dynamic URLs (動的URLを生成)
console.log(urlProvider.getCopySettingPageUrl("123"));  // "/my-tenant/master-setting/123/copy/new"
```

:::info サブパスインポート
`BaseUrlProvider`と`IUrlProvider`はサブパスインポート`@mbc-cqrs-serverless/master-web/UrlProvider`から利用できます。`IUrlProvider`型はメインパッケージからもエクスポートされています。
:::

### カスタムURLプロバイダー

`BaseUrlProvider`を拡張するか、`IUrlProvider`インターフェースを実装してカスタムURLプロバイダーを作成できます：

```tsx
import { AppProviders } from "@mbc-cqrs-serverless/master-web";
import { BaseUrlProvider } from "@mbc-cqrs-serverless/master-web/UrlProvider";

// Extend BaseUrlProvider for custom path structure (カスタムパス構造のためにBaseUrlProviderを拡張)
class CustomUrlProvider extends BaseUrlProvider {
  constructor(tenantCode: string) {
    super(`members/${tenantCode}`);
  }
}

// Use custom URL provider with AppProviders (AppProvidersでカスタムURLプロバイダーを使用)
const customUrlProvider = new CustomUrlProvider("my-tenant");

<AppProviders user={user} urlProvider={customUrlProvider}>
  {children}
</AppProviders>
```

## カスタムフック

### useApolloClient

GraphQL操作用のApollo Clientにアクセスします。

```tsx
import { useApolloClient } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const client = useApolloClient();
  // Use client for custom GraphQL queries
}
```

### useHttpClient

REST API呼び出し用のHTTPクライアントにアクセスします。

```tsx
import { useHttpClient } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const httpClient = useHttpClient();
  // Use httpClient for custom API requests
}
```

### useUserContext

テナント情報を含む現在のユーザーコンテキストにアクセスします。

```tsx
import { useUserContext } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { tenantCode, tenantRole } = useUserContext();
  // Access tenant information (テナント情報にアクセス)
  console.log(`Tenant: ${tenantCode}, Role: ${tenantRole}`);
}
```

### useLoadingStore

コンポーネント間でグローバルなローディング状態を管理します。

```tsx
import { useLoadingStore } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { isLoading, setLoading, closeLoading } = useLoadingStore();

  // Show loading indicator (ローディングインジケーターを表示)
  setLoading();

  // Hide loading indicator (ローディングインジケーターを非表示)
  closeLoading();
}
```

### useUrlProvider

アプリケーションURLを生成するためのURLプロバイダーにアクセスします。

```tsx
import { useUrlProvider } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const urlProvider = useUrlProvider();

  // Use static URLs (静的URLを使用)
  const settingsUrl = urlProvider.SETTINGS_PAGE_URL;

  // Generate dynamic URLs (動的URLを生成)
  const copyUrl = urlProvider.getCopySettingPageUrl("item-123");
}
```

### useAppServices

すべてのアプリケーションサービスに一度にアクセスします。HTTPクライアント、Apolloクライアント、ユーザーコンテキスト、URLプロバイダーを返します。

```tsx
import { useAppServices } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { httpClient, apolloClient, user, urlProvider } = useAppServices();

  // Use multiple services in one component (1つのコンポーネントで複数のサービスを使用)
  const fetchData = async () => {
    const response = await httpClient.get("/api/data");
    // ...
  };
}
```

**戻り値:**

| プロパティ | 型 | 説明 |
|----------|------|-------------|
| `httpClient` | `AxiosInstance` | REST API呼び出し用のHTTPクライアント |
| `apolloClient` | `ApolloClient` | GraphQL操作用のApolloクライアント |
| `user` | `UserContext` | 現在のユーザーコンテキストと認証状態 |
| `urlProvider` | `IUrlProvider` | URL生成用のURLプロバイダー |

### useSubscribeCommandStatus

:::warning 内部API
このフックはメインパッケージからエクスポートされておらず、内部使用専用です。予告なく変更される可能性があります。
:::

AppSyncコマンドステータスの更新を購読します。バックエンドコマンドの進捗と完了を追跡するために使用します。

```tsx
import { useSubscribeCommandStatus } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { isListening, message, start } = useSubscribeCommandStatus(
    tenantCode,
    async (msg) => {
      if (msg) {
        // Command completed successfully (コマンドが正常に完了)
        console.log("Command finished:", msg);
      } else {
        // Command timed out (コマンドがタイムアウト)
        console.log("Command timed out");
      }
    },
    true // Show processing toast (処理中トーストを表示)
  );

  const handleSubmit = async () => {
    const requestId = await submitCommand();
    start(requestId, 30000); // Start listening with 30s timeout (30秒タイムアウトでリスニング開始)
  };
}
```

**パラメータ:**

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `xTenantCode` | `string` | サブスクリプション用のテナントコード |
| `doneCallback` | `(msg: DecodedMessage \| null) => void` | コマンド完了またはタイムアウト時のコールバック |
| `isShowProcess` | `boolean` | 処理中トーストを表示するかどうか（デフォルト: true） |

**戻り値:**

| プロパティ | 型 | 説明 |
|----------|------|-------------|
| `isListening` | `boolean` | 更新をアクティブにリスニングしているかどうか |
| `message` | `DecodedMessage \| null` | 最新の受信メッセージ |
| `start` | `(reqId: string, timeoutMs?: number) => void` | リクエストIDのリスニングを開始 |

### useSubscribeBulkCommandStatus

:::warning 内部API
このフックはメインパッケージからエクスポートされておらず、内部使用専用です。予告なく変更される可能性があります。
:::

一括コマンドステータスの更新を購読します。各アイテムが独自の完了メッセージを受信する複数アイテムの処理時に使用します。

```tsx
import { useSubscribeBulkCommandStatus } from "@mbc-cqrs-serverless/master-web";

function BulkOperationComponent() {
  const { isListening, messages, finishedCount, start, stop } =
    useSubscribeBulkCommandStatus(
      tenantCode,
      () => {
        // Handle timeout (タイムアウトを処理)
        console.log("Bulk operation timed out");
      }
    );

  const handleBulkSubmit = async (items: Item[]) => {
    const requestId = await submitBulkCommand(items);
    start(requestId, 60000); // 60s timeout (60秒タイムアウト)
  };

  // Check if all items are processed (すべてのアイテムが処理されたか確認)
  useEffect(() => {
    if (finishedCount === expectedCount) {
      stop();
      // All items processed (すべてのアイテムが処理完了)
    }
  }, [finishedCount]);
}
```

**パラメータ:**

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `xTenantCode` | `string` | サブスクリプション用のテナントコード |
| `onTimeout` | `() => void` | 操作タイムアウト時のオプションコールバック |

**戻り値:**

| プロパティ | 型 | 説明 |
|----------|------|-------------|
| `isListening` | `boolean` | 更新をアクティブにリスニングしているかどうか |
| `messages` | `DecodedMessage[]` | 受信したすべてのメッセージ |
| `finishedCount` | `number` | 完了したアイテム数 |
| `start` | `(reqId: string, timeoutMs?: number) => void` | リクエストIDのリスニングを開始 |
| `stop` | `() => void` | 手動でリスニングを停止 |

### useHealthCheck

:::warning 内部API
このフックはメインパッケージからエクスポートされておらず、内部使用専用です。予告なく変更される可能性があります。
:::

コンポーネントマウント時にヘルスチェックAPI呼び出しを実行します。`NEXT_PUBLIC_ENABLE_HEALTH_CHECK`環境変数で制御されます。

```tsx
import { useHealthCheck } from "@mbc-cqrs-serverless/master-web";

function App() {
  // Automatically calls health check endpoint on mount (マウント時にヘルスチェックエンドポイントを自動的に呼び出す)
  useHealthCheck();

  return <div>Application content (アプリケーションコンテンツ)</div>;
}
```

**環境変数:**

| 変数 | 説明 |
|----------|-------------|
| `NEXT_PUBLIC_ENABLE_HEALTH_CHECK` | "true"に設定してヘルスチェック呼び出しを有効化 |

### usePagination

:::warning 内部API
このフックはメインパッケージからエクスポートされておらず、内部使用専用です。予告なく変更される可能性があります。
:::

検索、ソート、テーブルビューを含むページネーションを処理するための包括的なフック。永続的な状態のためにURLクエリパラメータと統合されます。

```tsx
import { usePagination } from "@mbc-cqrs-serverless/master-web";
import { parseAsString } from "next-usequerystate";

interface SearchProps extends SearchPropsBase {
  name?: string;
  status?: string;
}

function DataListPage() {
  const {
    searchProps,
    paginate,
    onSubmitSearch,
    executeSearch,
    handlePaginationChange,
    handleSortChange,
  } = usePagination<DataRecord, SearchProps, Paginate<DataRecord>>({
    searchPropDefinitions: {
      name: parseAsString,
      status: parseAsString,
    },
    getData: async (queries) => {
      return await fetchData(queries);
    },
    rootPath: "/data-list",
    isSearchInit: true,
  });

  useEffect(() => {
    executeSearch();
  }, []);

  return (
    <DataTable
      data={paginate?.results ?? []}
      onPaginationChange={handlePaginationChange}
      onSortChange={handleSortChange}
    />
  );
}
```

**パラメータ:**

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `searchPropDefinitions` | `UseQueryStatesKeysMap` | next-usquerystateを使用したクエリパラメータ定義 |
| `getData` | `(queries) => Promise<Paginate>` | サーバーからページネーションされたデータを取得する関数 |
| `getDataClient` | `(queries) => Promise<Array>` | クライアントサイドデータフィルタリング用の関数 |
| `isSearchInit` | `boolean` | 初期ロード時に検索するかどうか（デフォルト: true） |
| `rootPath` | `string` | ページのルートパス（パス検証に使用） |
| `tableViews` | `TableView[]` | オプションの事前定義テーブルビュー設定 |
| `getStorage` | `() => SearchProps` | 保存された検索条件を取得する関数 |
| `setStorage` | `(props) => void` | 検索条件を保存する関数 |
| `reset` | `UseFormReset` | react-hook-formのフォームリセット関数 |
| `setValue` | `UseFormSetValue` | react-hook-formのsetValue関数 |
| `convertSearchProps` | `(props) => SearchProps` | 検索実行前に検索プロパティを変換するオプション関数 |
| `convertChangeQueries` | `(props) => SearchProps` | URL変更前にクエリパラメータを変換するオプション関数 |

**戻り値:**

| プロパティ | 型 | 説明 |
|----------|------|-------------|
| `searchProps` | `SearchProps` | 現在の検索パラメータ |
| `queries` | `SearchProps` | URLクエリパラメータ |
| `setQueries` | `(props) => Promise<void>` | URLクエリパラメータを直接更新 |
| `paginate` | `Paginate<T>` | カウントとデータを含むページネーション結果 |
| `setPaginate` | `(paginate) => void` | ページネーション状態を手動で設定 |
| `setPaginateClient` | `(items, page?) => void` | クライアントサイドデータ用のページネーションを設定 |
| `getPaginateClient` | `(items) => Paginate` | 配列をページネーションオブジェクトに変換 |
| `isCalledSearch` | `boolean` | 検索がトリガーされたかどうか |
| `onSubmitSearch` | `(props) => Promise<void>` | 新しいパラメータで検索を送信 |
| `executeSearch` | `() => Promise<object>` | 現在のパラメータで検索を実行 |
| `searchUsingTableView` | `(props, tableView) => Promise<void>` | 事前定義されたテーブルビューを使用して検索 |
| `getSearchQuery` | `() => SearchProps \| null` | URLまたはストレージから現在の検索クエリを取得 |
| `handlePaginationChange` | `OnChangeFn<PaginationState>` | ページ/サイズ変更のハンドラー |
| `handleSortChange` | `OnChangeFn<SortingState>` | ソート変更のハンドラー |
| `onResetSearchForm` | `() => Promise<void>` | 検索フォームを空の値にリセット |

### usePaginationRange

:::warning 内部API
このフックと`DOTS`定数はメインパッケージからエクスポートされておらず、内部使用専用です。予告なく変更される可能性があります。
:::

大きなページ数の省略記号を含む、ページネーションUI用のページ番号範囲を計算します。

```tsx
import { usePaginationRange, DOTS } from "@mbc-cqrs-serverless/master-web";

function PaginationUI({ totalPages, currentPage }: Props) {
  const range = usePaginationRange({
    totalPageCount: totalPages,
    currentPage: currentPage,
    siblingCount: 1,
  });

  return (
    <nav>
      {range.map((item, index) => (
        item === DOTS ? (
          <span key={index}>...</span>
        ) : (
          <button key={index} onClick={() => goToPage(item as number)}>
            {item}
          </button>
        )
      ))}
    </nav>
  );
}
```

**パラメータ:**

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `totalPageCount` | `number` | 総ページ数 |
| `currentPage` | `number` | 現在のアクティブページ番号 |
| `siblingCount` | `number` | 各サイドに表示するページボタンの数（デフォルト: 1） |

**戻り値:**

`(number | string)[]` - ページ番号と省略記号用のDOTS（"..."）の配列

### useLoadingForm

:::warning 内部API
このフックはメインパッケージからエクスポートされておらず、内部使用専用です。予告なく変更される可能性があります。
:::

react-hook-formとグローバルローディング状態を組み合わせます。ローディング状態管理とともにフォームユーティリティを提供します。

```tsx
import { useLoadingForm } from "@mbc-cqrs-serverless/master-web";

interface FormData {
  name: string;
  email: string;
}

function MyForm() {
  const {
    form,
    control,
    handleSubmit,
    loading,
    loadingStore,
    errors,
  } = useLoadingForm<FormData>({
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    loadingStore.setLoading();
    try {
      await saveData(data);
    } finally {
      loadingStore.closeLoading();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields (フォームフィールド) */}
    </form>
  );
}
```

**パラメータ:**

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `props` | `UseFormProps<T>` | react-hook-formのuseFormオプション |

**戻り値:**

| プロパティ | 型 | 説明 |
|----------|------|-------------|
| `form` | `UseFormReturn<T>` | 完全なreact-hook-formインスタンス |
| `control` | `Control<T>` | 制御コンポーネント用のフォームコントロール |
| `handleSubmit` | `UseFormHandleSubmit<T>` | フォーム送信ハンドラー |
| `watch` | `UseFormWatch<T>` | フォーム値を監視 |
| `getValues` | `UseFormGetValues<T>` | フォーム値を取得 |
| `setValue` | `UseFormSetValue<T>` | フォーム値を設定 |
| `reset` | `UseFormReset<T>` | フォームをリセット |
| `trigger` | `UseFormTrigger<T>` | バリデーションをトリガー |
| `errors` | `FieldErrors<T>` | フォームバリデーションエラー |
| `setError` | `UseFormSetError<T>` | フォームエラーを手動で設定 |
| `loading` | `boolean` | 現在のローディング状態 |
| `loadingStore` | `LoadingState` | setLoading/closeLoading付きのローディングストア |
| `isValid` | `boolean` | フォームが有効かどうか |

### useAsyncAction

:::warning 内部API
このフックはメインパッケージからエクスポートされておらず、内部使用専用です。予告なく変更される可能性があります。
:::

自動ローディングオーバーレイ付きで非同期関数を実行します。非同期操作中にグローバルローディングインジケーターを表示します。

```tsx
import { useAsyncAction } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { performAction, isLoading } = useAsyncAction();

  const handleClick = async () => {
    const result = await performAction(async () => {
      // This runs with loading overlay (これはローディングオーバーレイ付きで実行される)
      return await fetchData();
    });
    console.log(result);
  };

  return (
    <button onClick={handleClick} disabled={isLoading}>
      データを読み込む
    </button>
  );
}
```

**戻り値:**

| プロパティ | 型 | 説明 |
|----------|------|-------------|
| `performAction` | `<T>(fn: () => Promise<T>) => Promise<T>` | ローディングオーバーレイ付きで非同期関数を実行 |
| `isLoading` | `boolean` | 現在のローディング状態 |

### useNavigation

:::warning 内部API
このフックはメインパッケージからエクスポートされておらず、内部使用専用です。予告なく変更される可能性があります。
:::

自動ローディングインジケーター付きでページ間を移動します。Next.jsルーターをローディング状態管理でラップします。

```tsx
import { useNavigation } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { navigate, reload, hardNavigate } = useNavigation();

  return (
    <div>
      <button onClick={() => navigate("/dashboard")}>
        ダッシュボードへ移動
      </button>
      <button onClick={() => reload()}>
        ページを更新
      </button>
      <button onClick={() => hardNavigate("/external-page")}>
        フルページナビゲーション
      </button>
    </div>
  );
}
```

**戻り値:**

| プロパティ | 型 | 説明 |
|----------|------|-------------|
| `navigate` | `(url: string) => void` | ローディングインジケーター付きでNext.jsルーターを使用してナビゲート |
| `reload` | `() => void` | ローディングインジケーター付きで現在のページを更新 |
| `hardNavigate` | `(url: string) => void` | フルブラウザナビゲーション（window.location） |

## UIコンポーネント

このパッケージには、いくつかの再利用可能なUIコンポーネントが含まれています：

### JsonEditor

構造化データを編集するためのJSONエディタコンポーネント。jsoneditorライブラリのツリーモードを使用します。

```tsx
import { JsonEditor } from "@mbc-cqrs-serverless/master-web";

function MyForm() {
  const [jsonData, setJsonData] = useState({ key: "value" });

  return (
    <JsonEditor
      json={jsonData}
      onChange={setJsonData}
    />
  );
}
```

#### JsonEditor プロパティ

| プロパティ | 型 | 必須 | 説明 |
|----------|----------|--------------|-----------------|
| `json` | `object` | はい | 表示・編集するJSONデータ |
| `onChange` | `(json: object) => void` | いいえ | JSONコンテンツ変更時のコールバック |

### RichTextEditor

コンテンツフィールド用のリッチテキストエディタ。カスタマイズ可能なツールバー付きのReact Quill上に構築されています。

```tsx
import { RichTextEditor } from "@mbc-cqrs-serverless/master-web";

function MyForm() {
  const [content, setContent] = useState("");

  return (
    <RichTextEditor
      value={content}
      onChange={setContent}
      placeholder="ここにコンテンツを入力..."
    />
  );
}
```

#### RichTextEditor プロパティ

| プロパティ | 型 | 必須 | 説明 |
|----------|----------|--------------|-----------------|
| `value` | `string` | いいえ | エディタのHTMLコンテンツ（デフォルトは空文字列） |
| `onChange` | `(value: string) => void` | はい | コンテンツ変更時のコールバック |
| `placeholder` | `string` | いいえ | エディタが空の場合のプレースホルダーテキスト（デフォルトは空文字列） |

### MsLayout

マスター管理ページ用のレイアウトコンポーネント。ローディングオーバーレイとトースト通知を提供します。

```tsx
import { MsLayout } from "@mbc-cqrs-serverless/master-web";

function MasterPage() {
  return (
    <MsLayout useLoading={true}>
      <MasterSetting />
    </MsLayout>
  );
}
```

#### MsLayout プロパティ

| プロパティ | 型 | 必須 | 説明 |
|----------|----------|--------------|-----------------|
| `useLoading` | `boolean` | はい | ローディングオーバーレイの有効化または無効化 |
| `children` | `React.ReactNode` | はい | レンダリングする子コンポーネント |

### ConfirmButton

:::warning 内部API
このコンポーネントはメインパッケージからエクスポートされておらず、内部使用専用です。予告なく変更される可能性があります。
:::

アクションを実行する前に確認ダイアログを表示するボタンコンポーネント。削除などの破壊的な操作に便利です。

#### ConfirmButton プロパティ

| プロパティ | 型 | デフォルト | 説明 |
|------|------|---------|-------------|
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | `'default'` | ボタンサイズ |
| `triggerBtnText` | `string` | - | トリガーボタンに表示されるテキスト |
| `title` | `string` | - | 確認ダイアログのタイトル |
| `cancelText` | `string` | - | キャンセルボタンのテキスト |
| `confirmText` | `string` | - | 確認ボタンのテキスト |
| `loading` | `boolean` | `false` | ボタンのローディング状態を表示 |
| `onConfirm` | `() => void` | - | 確認がクリックされた時のコールバック関数 |
| `className` | `string` | - | 追加のCSSクラス |
| `disabled` | `boolean` | `false` | ボタンを無効化 |
| `variant` | `string` | - | ボタンのバリアントスタイル |

```tsx
// Note: Internal import path - may change without notice (注意: 内部インポートパス - 予告なく変更される可能性があります)
import ConfirmButton from "@mbc-cqrs-serverless/master-web/dist/components/buttons/ConfirmButton";

function DeleteAction() {
  const handleDelete = () => {
    // Perform delete operation (削除操作を実行)
  };

  return (
    <ConfirmButton
      triggerBtnText="Delete"
      title="Are you sure you want to delete this item?"
      cancelText="Cancel"
      confirmText="Delete"
      variant="destructive"
      onConfirm={handleDelete}
    />
  );
}
```

### BackButton

:::warning 内部API
このコンポーネントはメインパッケージからエクスポートされておらず、内部使用専用です。予告なく変更される可能性があります。
:::

前のページまたは指定された場所に戻るためのナビゲーションボタンコンポーネント。

#### BackButton プロパティ

| プロパティ | 型 | デフォルト | 説明 |
|------|------|---------|-------------|
| `onClickPrev` | `() => void` | - | ボタンがクリックされた時のコールバック関数 |
| `className` | `string` | - | 追加のCSSクラス |

```tsx
// Note: Internal import path - may change without notice (注意: 内部インポートパス - 予告なく変更される可能性があります)
import { BackButton } from "@mbc-cqrs-serverless/master-web/dist/components/buttons/back-button";
import { useRouter } from "next/navigation";

function DetailPage() {
  const router = useRouter();

  return (
    <div>
      {/* Page content (ページコンテンツ) */}
      <BackButton onClickPrev={() => router.back()} />
    </div>
  );
}
```

### DatePicker

:::warning 内部API
このコンポーネントはメインパッケージからエクスポートされておらず、内部使用専用です。予告なく変更される可能性があります。
:::

カレンダーポップアップ付きの日付選択コンポーネント。フォーマットと日本語ロケールサポートにdate-fnsを使用。

#### DatePicker プロパティ

| プロパティ | 型 | デフォルト | 説明 |
|------|------|---------|-------------|
| `value` | `Date \| string` | - | 現在選択されている日付値 |
| `onChange` | `(date?: string) => void` | - | 日付が選択された時のコールバック（タイムゾーン付きISO文字列を返す） |
| `disabled` | `boolean` | `false` | 日付ピッカーを無効化 |

```tsx
// Note: Internal import path - may change without notice (注意: 内部インポートパス - 予告なく変更される可能性があります)
import DatePicker from "@mbc-cqrs-serverless/master-web/dist/components/form/DatePicker";
import { useState } from "react";

function DateForm() {
  const [date, setDate] = useState<string>();

  return (
    <DatePicker
      value={date}
      onChange={(newDate) => setDate(newDate)}
    />
  );
}
```

### FormSubmitButton

:::warning 内部API
このコンポーネントはメインパッケージからエクスポートされておらず、内部使用専用です。予告なく変更される可能性があります。
:::

react-hook-formと連携するように設計された送信ボタンコンポーネント。フォームの状態、バリデーションエラー、ローディング状態を自動的に処理します。

#### FormSubmitButton プロパティ

| プロパティ | 型 | デフォルト | 説明 |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | ボタンの内容 |
| `disabled` | `boolean` | `false` | ボタンを手動で無効化 |
| `loading` | `boolean` | `false` | ローディング状態を表示 |
| `className` | `string` | - | 追加のCSSクラス |
| `disableDirty` | `boolean` | `false` | trueの場合、フォームが変更されていなくてもボタンが有効 |

以下の場合、ボタンは自動的に無効化されます：
- フォームにバリデーションエラーがある場合
- フォームが変更されていない場合（`disableDirty`がtrueでない限り）

```tsx
// Note: Internal import path - may change without notice (注意: 内部インポートパス - 予告なく変更される可能性があります)
import FormSubmitButton from "@mbc-cqrs-serverless/master-web/dist/components/form/FormSubmitButton";
import { FormProvider, useForm } from "react-hook-form";
import { useState } from "react";

function MyForm() {
  const methods = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {/* Form fields (フォームフィールド) */}
        <FormSubmitButton loading={isSubmitting}>
          Save
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}
```

### DataTable

:::warning 内部API
このコンポーネントはメインパッケージからエクスポートされておらず、内部使用専用です。予告なく変更される可能性があります。
:::

TanStack Table上に構築されたフル機能のデータテーブルコンポーネント。サーバーサイドページネーション、ソート、行選択、カスタムカラム定義をサポート。

#### DataTable プロパティ

| プロパティ | 型 | デフォルト | 説明 |
|------|------|---------|-------------|
| `columns` | `ColumnDef<TData, TValue>[]` | - | TanStack Table形式のカラム定義 |
| `data` | `TData[]` | - | 表示するデータの配列 |
| `pageCount` | `number` | - | 総ページ数 |
| `rowCount` | `number` | - | 総行数 |
| `pagination` | `PaginationState` | - | 現在のページネーション状態（pageIndex、pageSize） |
| `onPaginationChange` | `(pagination: PaginationState) => void` | - | ページネーション変更時のコールバック |
| `sorting` | `SortingState` | - | 現在のソート状態 |
| `onSortingChange` | `(sorting: SortingState) => void` | - | ソート変更時のコールバック |
| `onClickRow` | `(row: TData) => void` | - | 行がクリックされた時のコールバック |
| `rowKey` | `keyof TData \| ((row: TData) => string)` | - | 行識別用のキー抽出 |
| `rowSelection` | `RowSelectionState` | - | 現在の行選択状態 |
| `onRowSelectionChange` | `(state: RowSelectionState) => void` | - | 行選択変更時のコールバック |

:::info State 型
`PaginationState`、`SortingState`、`RowSelectionState`はTanStack Tableの型です。`PaginationState`には`pageIndex`と`pageSize`プロパティが含まれています。
:::

#### DataTable 機能

- ページサイズオプション（10、20、50、100）付きのサーバーサイドページネーション
- 特定ページへのジャンプ機能
- カラムソート
- 行選択
- 行ナビゲーション用のクリックハンドラー
- 空状態の表示
- カラムメタによるカスタムカラム幅

```tsx
// Note: Internal import path - may change without notice (注意: 内部インポートパス - 予告なく変更される可能性があります)
import { DataTable } from "@mbc-cqrs-serverless/master-web/dist/components/table/data-table";
import { ColumnDef, OnChangeFn, PaginationState, SortingState } from "@tanstack/react-table";
import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
};

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
    meta: { size: "200px" },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
];

function UserList() {
  const router = useRouter();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // Fetch data based on pagination and sorting (ページネーションとソートに基づいてデータを取得)
  const { data, pageCount, rowCount } = useUsers(pagination, sorting);

  return (
    <DataTable
      columns={columns}
      data={data}
      pageCount={pageCount}
      rowCount={rowCount}
      pagination={pagination}
      onPaginationChange={setPagination}
      sorting={sorting}
      onSortingChange={setSorting}
      rowKey="id"
      onClickRow={(row) => router.push(`/users/${row.id}`)}
    />
  );
}
```

### LoadingOverlay

:::warning 内部API
このコンポーネントはメインパッケージからエクスポートされておらず、内部使用専用です。予告なく変更される可能性があります。
:::

スピナーアニメーション付きのフルスクリーンローディングオーバーレイコンポーネント。非同期操作中のローディング状態を示すのに便利です。

#### LoadingOverlay プロパティ

| プロパティ | 型 | デフォルト | 説明 |
|------|------|---------|-------------|
| `isLoading` | `boolean` | - | オーバーレイの表示/非表示を制御 |

```tsx
// Note: Internal import path - may change without notice (注意: 内部インポートパス - 予告なく変更される可能性があります)
import LoadingOverlay from "@mbc-cqrs-serverless/master-web/dist/components/LoadingOverlay";
import { useState } from "react";

function MyPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await saveData();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <LoadingOverlay isLoading={isLoading} />
      {/* Page content (ページコンテンツ) */}
    </div>
  );
}
```

## 環境変数

Master Webパッケージ用に以下の環境変数を設定します：

| 変数 | 説明 |
|----------|-------------|
| `NEXT_PUBLIC_MASTER_API_BASE` | REST APIエンドポイントのベースURL |
| `NEXT_PUBLIC_MASTER_APPSYNC_URL` | AWS AppSync GraphQL エンドポイントURL |
| `NEXT_PUBLIC_MASTER_APPSYNC_APIKEY` | 認証用 AWS AppSync API キー |
| `NEXT_PUBLIC_MASTER_APPSYNC_REGION` | AppSync用のAWSリージョン |

### .env.local の例

```bash
NEXT_PUBLIC_MASTER_API_BASE=https://api.example.com
NEXT_PUBLIC_MASTER_APPSYNC_URL=https://xxxxxxxx.appsync-api.ap-northeast-1.amazonaws.com/graphql
NEXT_PUBLIC_MASTER_APPSYNC_APIKEY=da2-xxxxxxxxxxxxxxxxx
NEXT_PUBLIC_MASTER_APPSYNC_REGION=ap-northeast-1
```

## スタイリング

アプリケーションでパッケージのスタイルをインポートします：

```tsx
import "@mbc-cqrs-serverless/master-web/styles.css";
```

コンポーネントはスタイリングにTailwind CSSを使用しています。プロジェクトでTailwind CSSが設定されていることを確認してください。

## Next.js App Router との統合

Next.js App Router（v14+/v15）で master-web コンポーネントを使用する場合、サーバーサイドレンダリング（SSR）とクライアントサイドの状態管理に関する重要な考慮事項があります。

### SSR 互換性の問題

JsonEditor コンポーネントは内部で `jsoneditor` ライブラリを使用しており、SSR 中には利用できないブラウザ API（`self`、`window`）を必要とします。これにより次のようなエラーが発生します：

```
ReferenceError: self is not defined
```

### 解決策：SSR を無効にした動的インポート

Next.js の動的インポートで `ssr: false` を使用して、master-web コンポーネントをクライアントサイドでのみロードします：

```tsx
'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'

// Create wrapper component that handles dynamic import (動的インポートを処理するラッパーコンポーネントを作成)
function MasterSettingWrapper({ httpClient, urlProvider, user }) {
  // Dynamic import inside component for proper context handling (適切なコンテキスト処理のためにコンポーネント内で動的インポート)
  const MasterSetting = useMemo(
    () =>
      dynamic(() => import('@mbc-cqrs-serverless/master-web/MasterSetting'), {
        ssr: false,
        loading: () => <div>Loading...</div>,
      }),
    []
  )

  return (
    <AppProviders user={user} httpClient={httpClient} urlProvider={urlProvider}>
      <MasterSetting />
    </AppProviders>
  )
}
```

:::warning 重要
動的インポートはモジュールレベルではなく、ラッパーコンポーネント内（`useMemo` を使用）で定義してください。これにより、コンポーネントがマウントされる際に AppProviders のコンテキストが適切に利用可能になります。
:::

### 推奨パターン：Layout ベースの Provider パターン

**最も推奨される実装パターン**は、Next.js App Router の `layout.tsx` を使用して AppProviders をセットアップすることです。このパターンにより、`httpClient.get is not a function` エラーを確実に回避できます。

#### Layout パターンが推奨される理由

1. **React Context の分離問題を解決**：npm パッケージにバンドルされた React Context は、アプリケーションのコンテキストから分離される可能性があります。Layout でプロバイダーをセットアップすることで、子コンポーネントがマウントされる前にコンテキストが初期化されることが保証されます。

2. **同期的な httpClient の初期化**：`useMemo` を使用することで、非同期の状態管理（useState + useEffect）なしに httpClient を同期的に作成します。

3. **認証トークンの自動注入**：Axios インターセプターを使用して、各リクエストで最新の認証トークンを自動的に取得します。

#### 実装例：layout.tsx

```tsx
// app/admin/[tenant]/master/layout.tsx
'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'
import type { IUrlProvider } from '@mbc-cqrs-serverless/master-web/UrlProvider'
import '@/modules/common/components/ConfigureAmplifyClientSide'

// Dynamic import of AppProviders (SSR disabled) (AppProviders の動的インポート、SSR 無効)
const AppProviders = dynamic(
  () =>
    import('@mbc-cqrs-serverless/master-web/AppProviders').then(
      (mod) => mod.AppProviders
    ),
  { ssr: false }
)

// Multi-tenant URL provider (マルチテナント URL プロバイダー)
class MasterUrlProvider implements IUrlProvider {
  protected readonly baseUrl: string

  public readonly SETTINGS_PAGE_URL: string
  public readonly ADD_SETTINGS_PAGE_URL: string
  public readonly EDIT_SETTINGS_PAGE_URL: string
  public readonly DATA_PAGE_URL: string
  public readonly ADD_DATA_PAGE_URL: string
  public readonly EDIT_DATA_PAGE_URL: string
  public readonly FAQ_CATEGORY_PAGE_URL: string
  public readonly TOP_URL: string

  constructor(tenantCode: string) {
    this.baseUrl = `/admin/${tenantCode}/master`

    this.SETTINGS_PAGE_URL = `${this.baseUrl}/master-setting`
    this.ADD_SETTINGS_PAGE_URL = `${this.baseUrl}/master-setting/new`
    this.EDIT_SETTINGS_PAGE_URL = this.SETTINGS_PAGE_URL
    this.DATA_PAGE_URL = `${this.baseUrl}/master-data`
    this.ADD_DATA_PAGE_URL = `${this.baseUrl}/master-data/new`
    this.EDIT_DATA_PAGE_URL = this.DATA_PAGE_URL
    this.FAQ_CATEGORY_PAGE_URL = `${this.baseUrl}/faq-category`
    this.TOP_URL = `/admin/${tenantCode}`
  }

  public getCopySettingPageUrl(id: string): string {
    return `${this.baseUrl}/master-setting/${id}/copy/new`
  }

  public getDetailedCopySettingPageUrl(id: string): string {
    return `${this.baseUrl}/master-setting/${id}/copy`
  }
}

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams<{ tenant: string }>()
  const tenantCode = params?.tenant || 'common'

  // Create URL provider synchronously with useMemo (useMemo で URL プロバイダーを同期的に作成)
  const urlProvider = useMemo(() => new MasterUrlProvider(tenantCode), [tenantCode])

  // Create httpClient synchronously with useMemo (interceptor auto-injects auth token) (useMemo で httpClient を同期的に作成、インターセプターが認証トークンを自動注入)
  const httpClient = useMemo(() => {
    const baseEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:3010'
    const instance = axios.create({
      baseURL: `${baseEndpoint}/api`,
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-code': tenantCode,
      },
    })

    // Interceptor to get auth token (認証トークンを取得するインターセプター)
    instance.interceptors.request.use(async (config) => {
      try {
        const session = await fetchAuthSession()
        const token = session.tokens?.idToken?.toString()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch {
        // Ignore auth errors (認証エラーを無視)
      }
      return config
    })

    return instance
  }, [tenantCode])

  const user = useMemo(
    () => ({
      tenantCode,
      tenantRole: 'admin',
    }),
    [tenantCode]
  )

  return (
    <AppProviders user={user} urlProvider={urlProvider} httpClient={httpClient}>
      <div className="p-6">{children}</div>
    </AppProviders>
  )
}
```

#### ページコンポーネントの実装

Layout でプロバイダーをセットアップした後、各ページコンポーネントはシンプルになります：

```tsx
// app/admin/[tenant]/master/master-setting/page.tsx
'use client'

import dynamic from 'next/dynamic'
import MsLayout from '@mbc-cqrs-serverless/master-web/MsLayout'

const MasterSetting = dynamic(
  () => import('@mbc-cqrs-serverless/master-web/MasterSetting').then((mod) => mod.default),
  { ssr: false }
)

export default function MasterSettingPage() {
  return (
    <main>
      <MsLayout useLoading>
        <MasterSetting />
      </MsLayout>
    </main>
  )
}
```

```tsx
// app/admin/[tenant]/master/master-setting/new/page.tsx
'use client'

import dynamic from 'next/dynamic'
import MsLayout from '@mbc-cqrs-serverless/master-web/MsLayout'

const EditMasterSettings = dynamic(
  () => import('@mbc-cqrs-serverless/master-web/EditMasterSettings').then((mod) => mod.default),
  { ssr: false }
)

export default function NewMasterSettingPage() {
  return (
    <main>
      <MsLayout useLoading>
        <EditMasterSettings />
      </MsLayout>
    </main>
  )
}
```

:::tip キーポイント
- **layout.tsx**：AppProviders、httpClient、urlProvider をセットアップ
- **page.tsx**：動的インポートでコンポーネントをシンプルにレンダリング
- **MsLayout**：ローディングオーバーレイとトースト通知を提供
:::

### AWS Amplify v6 との統合

master-web のデフォルト httpClient は AWS Amplify v5 API（`Auth.currentSession()`）を使用しています。プロジェクトで AWS Amplify v6 を使用する場合は、カスタム httpClient を提供する必要があります。

上記の Layout ベースの Provider パターンの例では、Amplify v6 の `fetchAuthSession` を Axios インターセプターと組み合わせて使用しています。これが推奨されるアプローチです。

#### 代替パターン：ページコンポーネントでの設定

Layout パターンを使用しない場合の代替実装：

```tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import axios, { AxiosInstance } from 'axios'
import * as Auth from 'aws-amplify/auth'  // Amplify v6 import (Amplify v6 インポート)
import { AppProviders } from '@mbc-cqrs-serverless/master-web/AppProviders'
import { BaseUrlProvider } from '@mbc-cqrs-serverless/master-web/UrlProvider'
import dynamic from 'next/dynamic'

interface MasterTemplateProps {
  tenantCode: string
}

// Custom URL provider for multi-tenant routing (マルチテナントルーティング用のカスタム URL プロバイダー)
class MasterUrlProvider extends BaseUrlProvider {
  constructor(tenantCode: string) {
    // BaseUrlProvider adds leading slash, so omit it here (BaseUrlProvider が先頭スラッシュを追加するため、ここでは省略)
    super(`admin/${tenantCode}/master`)
  }
}

// Wrapper component for proper context handling (適切なコンテキスト処理のためのラッパーコンポーネント)
function MasterSettingWrapper({
  httpClient,
  urlProvider,
  user,
}: {
  httpClient: AxiosInstance
  urlProvider: MasterUrlProvider
  user: { tenantCode: string; tenantRole: string }
}) {
  const MasterSetting = useMemo(
    () =>
      dynamic(() => import('@mbc-cqrs-serverless/master-web/MasterSetting'), {
        ssr: false,
        loading: () => <div>Loading component...</div>,
      }),
    []
  )

  return (
    <AppProviders user={user} httpClient={httpClient} urlProvider={urlProvider}>
      <MasterSetting />
    </AppProviders>
  )
}

export function MasterTemplate({ tenantCode }: MasterTemplateProps) {
  const [httpClient, setHttpClient] = useState<AxiosInstance | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Setup httpClient with Amplify v6 authentication (Amplify v6 認証で httpClient をセットアップ)
  const setupHttpClient = useCallback(async () => {
    let authToken = ''
    try {
      // Amplify v6 API for fetching auth session (認証セッションを取得する Amplify v6 API)
      const session = await Auth.fetchAuthSession()
      authToken = session.tokens?.idToken?.toString() || ''
    } catch {
      // Handle unauthenticated state (未認証状態を処理)
    }

    const client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:3010',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-code': tenantCode,
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
    })

    setHttpClient(client)
    setIsReady(true)
  }, [tenantCode])

  useEffect(() => {
    setupHttpClient()
  }, [setupHttpClient])

  const urlProvider = useMemo(() => new MasterUrlProvider(tenantCode), [tenantCode])

  const user = useMemo(
    () => ({
      tenantCode,
      tenantRole: 'admin',
    }),
    [tenantCode]
  )

  // Wait for httpClient to be ready before rendering (レンダリング前に httpClient の準備を待つ)
  if (!isReady || !httpClient) {
    return <div>Loading...</div>
  }

  return (
    <MasterSettingWrapper
      httpClient={httpClient}
      urlProvider={urlProvider}
      user={user}
    />
  )
}
```

### マルチテナントルーティングのセットアップ

マルチテナントアプリケーションでは、URL にテナントコードを含む動的ルートをセットアップします：

#### ディレクトリ構造

```
app/
└── admin/
    └── [tenant]/
        └── master/
            ├── layout.tsx                      # AppProviders setup (recommended) (AppProviders のセットアップ、推奨)
            ├── page.tsx                        # Master top page (マスタートップページ)
            ├── master-setting/
            │   ├── page.tsx                    # Settings list (設定一覧)
            │   ├── new/
            │   │   └── page.tsx                # Create new setting (新規設定作成)
            │   └── [pk]/
            │       └── [sk]/
            │           └── page.tsx            # Edit setting (設定編集)
            └── master-data/
                ├── page.tsx                    # Data list (データ一覧)
                ├── new/
                │   └── page.tsx                # Create new data (新規データ作成)
                └── [pk]/
                    └── [sk]/
                        └── page.tsx            # Edit data (データ編集)
```

#### ページコンポーネントの例

```tsx
// app/admin/[tenant]/master/master-setting/page.tsx
import { MasterTemplate } from '@/modules/master/templates/MasterTemplate'

export default async function MasterSettingPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params

  return <MasterTemplate tenantCode={tenant} />
}
```

### よくある問題と解決策

#### `httpClient.get is not a function` エラー

このエラーは、コンポーネントが使用しようとする前に httpClient が適切に初期化されていない場合に発生します。

**原因**：
- npm パッケージの React Context がアプリケーションのコンテキストから分離される
- httpClient が非同期で初期化され、コンポーネントがマウントされた時点で準備ができていない

**解決策**：

1. **Layout ベースの Provider パターンを使用（推奨）**：上記の推奨パターンを参照
2. **ラッパーコンポーネントパターンを使用**：httpClient の準備を確認
3. **明示的な `isReady` 状態チェックを追加**：AppProviders をレンダリングする前に確認
4. **動的インポートをラッパーコンポーネント内で定義**：モジュールレベルではなく

#### URL ルーティングの問題

URL が正しく生成されない場合（例：`/admin/...` ではなく `//admin/...`）、BaseUrlProvider の設定を確認してください：

```tsx
// ❌ Wrong - double slash issue (❌ 間違い - ダブルスラッシュの問題)
class MasterUrlProvider extends BaseUrlProvider {
  constructor(tenantCode: string) {
    super(`/admin/${tenantCode}/master`)  // Leading slash causes issue (先頭スラッシュが問題を引き起こす)
  }
}

// ✅ Correct - no leading slash (✅ 正しい - 先頭スラッシュなし)
class MasterUrlProvider extends BaseUrlProvider {
  constructor(tenantCode: string) {
    super(`admin/${tenantCode}/master`)  // BaseUrlProvider adds the slash (BaseUrlProvider がスラッシュを追加)
  }
}
```

#### IUrlProvider を直接実装する

`BaseUrlProvider` を継承せずに `IUrlProvider` インターフェースを直接実装する場合は、すべての URL プロパティを明示的に定義する必要があります。参考として上記の Layout ベースの Provider パターンの例を参照してください。

## 依存関係

このパッケージで使用される主要な依存関係：

- React 18.x
- Next.js 14.x / 15.x
- TanStack React Table 8.x
- Apollo Client
- Radix UIコンポーネント
- Tailwind CSS 3.x
- react-hook-form
- バリデーション用Zod
