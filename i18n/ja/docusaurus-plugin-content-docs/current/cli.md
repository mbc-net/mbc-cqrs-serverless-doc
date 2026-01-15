---
description: CLI
---

# CLI

mbc-cqrs-serverless CLI は、新しいプロジェクトのスキャフォールディングや、モジュール、サービス、エンティティのボイラープレートコードの生成を素早く行うためのツールです。フレームワークの規約に従い、一貫性を確保します。

## CLIを使用するタイミング

以下の場合にCLIを使用します：

- 新しい MBC CQRS Serverless プロジェクトを最初から作成する
- 新しいドメインモジュール（product、order、user など）を追加する
- 正しい構造でコントローラー、サービス、エンティティ、DTOファイルを生成する
- ローカル開発サーバーを起動する

## CLIが解決する問題

| 問題 | 解決策 |
|---------|----------|
| プロジェクト構造を手動で設定するとエラーが発生しやすい | `mbc new` で完全なプロジェクトスケルトンを作成 |
| 正しいファイル名やインポートを覚えておく必要がある | `mbc generate` で一貫したボイラープレートを作成 |
| モジュールの登録を忘れやすい | 生成されたコードはNestJSの規約に従う |

## インストール

CLIをグローバルにインストール：

```bash
npm install -g @mbc-cqrs-serverless/cli
```

## 利用可能なコマンド

利用可能なCLIコマンドの一覧を取得するには、次のコマンドを実行します：

```bash
mbc -h
```

出力は次のようになります：

```bash
Usage: mbc [options] [command]

Options:
  -V, --version           output the version number
  -h, --help              display help for command

Commands:
  new|n [name]            Generate a new CQRS application using the MBC CQRS
                          serverless framework
  generate|g <schematic>  Generate a MBC-cqrs-serverless element
  start|s                 Start application with serverless framework
  ui-common|ui [options]  add mbc-cqrs-ui-common components to your project
  help [command]          display help for command
```

## newコマンド

### ユースケース: 新しいバックエンドプロジェクトを開始する

シナリオ: 新しいマイクロサービスやAPIバックエンドを開始する際に、すべての依存関係を含む完全なプロジェクト構造が必要な場合。

```bash
mbc new [projectName[@version]]
```

### 使用例

カレントディレクトリに新しいプロジェクトを作成：

```bash
mbc new
```

特定の名前でプロジェクトを作成：

```bash
mbc new my-cqrs-app
```

特定のバージョンでプロジェクトを作成：

```bash
mbc new my-cqrs-app@0.1.45
```

## generateコマンド

### ユースケース: 既存のプロジェクトに新しいドメインを追加する

シナリオ: プロジェクトに新しいOrder機能が必要で、APIエンドポイント、ビジネスロジック、データベースエンティティを追加する場合。

解決策: モジュール、コントローラー、サービス、エンティティ、DTOを順番に生成します。

```bash
mbc generate <schematic> [name]
# or
mbc g <schematic> [name]
```

### 利用可能なSchematic

| 名前 | エイリアス | 説明 |
|------|-------|-------------|
| module | mo | モジュールを作成 |
| controller | co | コントローラーを作成 |
| service | se | サービスを作成 |
| entity | en | エンティティを作成 |
| dto | dto | DTOを作成 |

### オプション

| オプション | 説明 |
|--------|-------------|
| `-d, --dry-run` | 結果を書き出さずに実行されるアクションを表示 |
| `--mode <mode>` | 操作モードを指定: sync または async（デフォルト: async） |
| `--schema` | スキーマ生成を有効化（デフォルト: true） |
| `--no-schema` | スキーマ生成を無効化 |

### 使用例

新しいモジュールを生成：

```bash
mbc generate module order
# or
mbc g mo order
```

コントローラーを生成：

```bash
mbc generate controller order
# or
mbc g co order
```

サービスを生成：

```bash
mbc generate service order
# or
mbc g se order
```

エンティティを生成：

```bash
mbc generate entity order
# or
mbc g en order
```

DTOを生成：

```bash
mbc generate dto order
# or
mbc g dto order
```

ドライラン（ファイルを作成せずにプレビュー）：

```bash
mbc g mo order --dry-run
```

## startコマンド

### ユースケース: ローカル開発サーバーを実行する

シナリオ: AWSにデプロイする前に、APIエンドポイントをローカルでテストしたい場合。

```bash
mbc start
# or
mbc s
```

## ui-commonコマンド

### ユースケース: フロントエンドに構築済みUIコンポーネントを追加する

シナリオ: フロントエンドを構築中で、標準のMBC CQRS UIコンポーネントライブラリを使用したい場合。

```bash
mbc ui-common [options]
# or
mbc ui [options]
```

このコマンドは、MBC CQRS UI Commonライブラリをプロジェクトに統合し、構築済みのUIコンポーネントとユーティリティを提供します。

### オプション

| オプション | 説明 |
|--------|-------------|
| `-p, --pathDir <string>` | （必須）common-uiコンポーネントのインストール先パス |
| `-b, --branch <string>` | クローンするブランチ名（デフォルト: main） |
| `--auth <string>` | 認証方法: SSH または HTTPS - Token（デフォルト: SSH） |
| `--token <string>` | HTTPS認証用トークン、形式: tokenId:tokenPassword |
| `-c, --component <string>` | インストールするコンポーネント: all, appsync, または component（デフォルト: all） |
| `--alias` | tsconfig.jsonにcommon-ui用のエイリアス設定を追加 |

### 使用例

SSH認証ですべてのコンポーネントをインストール：

```bash
mbc ui-common -p src/common-ui
```

UIコンポーネントのみをインストール（appsyncを除く）：

```bash
mbc ui -p src/common-ui -c component
```

特定のブランチからインストール：

```bash
mbc ui -p src/common-ui -b develop
```

トークン認証を使用してHTTPSでインストール：

```bash
mbc ui -p src/common-ui --auth "HTTPS - Token" --token "user:password"
```

## トラブルシューティング

### バージョンが見つからない

```bash
mbc new myapp@999.999.999
# Error: Version not found
```

解決策: 有効なバージョン番号を使用してください。npmレジストリで利用可能なバージョンを確認してください。

### ディレクトリが空ではない

```bash
mbc new my-project
# Error: Directory not empty
```

解決策: 新しいディレクトリを使用するか、プロジェクト作成前に既存のファイルを削除してください。

### 権限エラー

グローバルインストール時に権限エラーが発生した場合：

```bash
sudo npm install -g @mbc-cqrs-serverless/cli
# or use npm prefix
npm config set prefix ~/.npm-global
npm install -g @mbc-cqrs-serverless/cli
```
