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

### MasterSetting

検索、フィルター、ページネーション機能を備えたマスター設定一覧を表示します。

```tsx
import { MasterSetting } from "@mbc-cqrs-serverless/master-web/MasterSetting";
import "@mbc-cqrs-serverless/master-web/styles.css";

export default function MasterSettingsPage() {
  return <MasterSetting />;
}
```

### EditMasterSettings

マスター設定の作成・編集用フォームコンポーネント。

```tsx
import { EditMasterSettings } from "@mbc-cqrs-serverless/master-web/EditMasterSettings";

export default function EditMasterSettingsPage({ params }: { params: { id: string } }) {
  return <EditMasterSettings id={params.id} />;
}
```

### MasterData

CRUD操作機能付きでマスターデータレコードをテーブル形式で表示します。

```tsx
import { MasterData } from "@mbc-cqrs-serverless/master-web/MasterData";

export default function MasterDataPage() {
  return <MasterData />;
}
```

### EditMasterData

マスターデータレコードの作成・編集用フォームコンポーネント。

```tsx
import { EditMasterData } from "@mbc-cqrs-serverless/master-web/EditMasterData";

export default function EditMasterDataPage({ params }: { params: { id: string } }) {
  return <EditMasterData id={params.id} />;
}
```

## プロバイダーのセットアップ

認証とAPIアクセスに必要なプロバイダーでアプリケーションをラップします。

```tsx
import { AppProviders } from "@mbc-cqrs-serverless/master-web/AppProviders";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      {children}
    </AppProviders>
  );
}
```

## URL設定

URLプロバイダーを使用してAPIエンドポイントを設定します。

```tsx
import { UrlProvider } from "@mbc-cqrs-serverless/master-web/UrlProvider";

const urlConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL,
  graphqlEndpoint: process.env.NEXT_PUBLIC_AWS_APPSYNC_GRAPHQLENDPOINT,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <UrlProvider config={urlConfig}>
      {children}
    </UrlProvider>
  );
}
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

現在のユーザーコンテキストと認証状態にアクセスします。

```tsx
import { useUserContext } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { user, isAuthenticated } = useUserContext();
  // Access user information
}
```

### useLoadingStore

コンポーネント間でグローバルなローディング状態を管理します。

```tsx
import { useLoadingStore } from "@mbc-cqrs-serverless/master-web";

function MyComponent() {
  const { isLoading, setLoading } = useLoadingStore();
  // Control loading state
}
```

## UIコンポーネント

このパッケージには、いくつかの再利用可能なUIコンポーネントが含まれています：

### JsonEditor

構造化データを編集するためのJSONエディタコンポーネント。

```tsx
import { JsonEditor } from "@mbc-cqrs-serverless/master-web";

function MyForm() {
  return (
    <JsonEditor
      value={jsonData}
      onChange={handleChange}
      readOnly={false}
    />
  );
}
```

### RichTextEditor

コンテンツフィールド用のリッチテキストエディタ。

```tsx
import { RichTextEditor } from "@mbc-cqrs-serverless/master-web";

function MyForm() {
  return (
    <RichTextEditor
      value={content}
      onChange={handleChange}
    />
  );
}
```

### MsLayout

マスター管理ページ用のレイアウトコンポーネント。

```tsx
import { MsLayout } from "@mbc-cqrs-serverless/master-web/MsLayout";

function MasterPage() {
  return (
    <MsLayout>
      <MasterSetting />
    </MsLayout>
  );
}
```

## 環境変数

Master Webパッケージ用に以下の環境変数を設定します：

| 変数 | 説明 |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | REST APIエンドポイントのベースURL |
| `NEXT_PUBLIC_AWS_APPSYNC_GRAPHQLENDPOINT` | AWS AppSync GraphQLエンドポイント |
| `NEXT_PUBLIC_AWS_APPSYNC_REGION` | AppSync用のAWSリージョン |
| `NEXT_PUBLIC_AWS_APPSYNC_AUTHTYPE` | AppSync認証タイプ |

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
