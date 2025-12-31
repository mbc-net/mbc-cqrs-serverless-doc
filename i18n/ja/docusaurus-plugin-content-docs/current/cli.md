---
description: CLI
---

# CLI

mbc-cqrs-serverless CLIを使用すると、新しいプロジェクトの作成やアプリケーション要素の生成ができます。

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

新しいプロジェクトを作成：

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

モジュール、コントローラー、サービス、エンティティ、DTOなどのアプリケーション要素を生成します。

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

serverless frameworkでアプリケーションを起動：

```bash
mbc start
# or
mbc s
```

## ui-commonコマンド

プロジェクトにmbc-cqrs-ui-commonコンポーネントを追加：

```bash
mbc ui-common [options]
# or
mbc ui [options]
```
