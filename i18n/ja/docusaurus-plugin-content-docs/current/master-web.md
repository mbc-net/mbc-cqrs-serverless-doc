---
description: マスターデータ管理UIコンポーネントを構築するためのMaster Webパッケージについて学びます。
---

# マスター用フロントパッケージ

MBC CQRS Serverlessアプリケーションでマスターデータと設定を管理するためのフロントエンドコンポーネントライブラリです。

## インストール

```bash
npm install @mbc-cqrs-serverless/master-web
```

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
import { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
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

## 依存関係

このパッケージで使用される主要な依存関係：

- React 18.x
- Next.js 14.x
- TanStack React Table 8.x
- Apollo Client
- Radix UIコンポーネント
- Tailwind CSS 3.x
- react-hook-form
- バリデーション用Zod
