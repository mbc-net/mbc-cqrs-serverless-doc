---
sidebar_position: 1
description: MBC CQRS ServerlessとのAIツール統合用MCPサーバー。
---

# MCPサーバー

MBC CQRS Serverlessフレームワーク用のMCP（Model Context Protocol）サーバーです。このパッケージにより、Claude Code、Cursorなどのツールからフレームワークと対話できます。

## MCPとは？

Model Context Protocol（MCP）は、AIツールがアプリケーションやフレームワークと標準化された方法で対話するためのプロトコルです。リソース、ツール、プロンプトの3つの主要な概念を提供します。

## 機能

### リソース

フレームワークのドキュメントとプロジェクト情報にアクセスできます。

| リソースURI | 説明 |
|--------------|-------------|
| `mbc://docs/overview` | 完全なフレームワークドキュメント |
| `mbc://docs/llms-short` | 簡潔なフレームワーク概要 |
| `mbc://docs/architecture` | CQRSアーキテクチャガイド |
| `mbc://docs/errors` | ソリューション付きエラーカタログ |
| `mbc://docs/faq` | よくある質問 |
| `mbc://docs/troubleshooting` | トラブルシューティングガイド |
| `mbc://docs/security` | セキュリティベストプラクティス |
| `mbc://project/entities` | プロジェクトエンティティ一覧 |
| `mbc://project/modules` | プロジェクトモジュール一覧 |
| `mbc://project/structure` | プロジェクトディレクトリ構造 |

### ツール

コード生成とプロジェクト分析ツールを提供します。

| ツール | 説明 |
|------|-------------|
| `mbc_generate_module` | 完全なCQRSモジュールを生成 |
| `mbc_generate_controller` | コントローラーを生成 |
| `mbc_generate_service` | サービスを生成 |
| `mbc_generate_entity` | エンティティを生成 |
| `mbc_generate_dto` | DTOを生成 |
| `mbc_validate_cqrs` | CQRSパターン実装を検証 |
| `mbc_analyze_project` | プロジェクト構造を分析 |
| `mbc_lookup_error` | エラー解決策を検索 |
| `mbc_check_anti_patterns` | コードの一般的なアンチパターンをチェック |
| `mbc_health_check` | プロジェクトの健全性チェックを実行 |
| `mbc_explain_code` | MBCコンテキストでコードを説明 |

### プロンプト

ガイド付きアシスタンスを提供します。

| プロンプト | 説明 |
|--------|-------------|
| `cqrs_implementation_guide` | ステップバイステップのCQRS実装 |
| `debug_command_error` | コマンド関連エラーのデバッグ |
| `migration_guide` | バージョン移行ガイダンス |

## インストール

```bash
npm install @mbc-cqrs-serverless/mcp-server
```

または npx で直接使用:

```bash
npx @mbc-cqrs-serverless/mcp-server
```

## 設定

### Claude Code

以下の設定を追加してください `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mbc-cqrs-serverless": {
      "command": "npx",
      "args": ["@mbc-cqrs-serverless/mcp-server"],
      "env": {
        "MBC_PROJECT_PATH": "/path/to/your/project"
      }
    }
  }
}
```

### Cursor

CursorのMCP設定に追加:

```json
{
  "mbc-cqrs-serverless": {
    "command": "npx",
    "args": ["@mbc-cqrs-serverless/mcp-server"],
    "env": {
      "MBC_PROJECT_PATH": "/path/to/your/project"
    }
  }
}
```

### 環境変数

| 変数 | 説明 | デフォルト |
|----------|-------------|---------|
| `MBC_PROJECT_PATH` | プロジェクトディレクトリへのパス | 現在の作業ディレクトリ |

## 使用例

### モジュール生成

Claude Codeに以下のように依頼できます:

```
"Generate a new Order module with async command handling"
```

### プロジェクト分析

プロジェクト構造を分析します。

```
"Analyze my project structure"
```

### デバッグ支援

エラーのデバッグを支援します。

```
"I'm getting a version mismatch error, help me debug"
```

## コード分析ツール {#code-analysis-tools}

:::info バージョン情報
コード分析ツール（`mbc_check_anti_patterns`、`mbc_health_check`、`mbc_explain_code`）は[バージョン1.0.22](./changelog#v1022)で追加されました。
:::

### アンチパターン検出

`mbc_check_anti_patterns`ツールは一般的なコードの問題を検出します：

| コード | 名前 | 重大度 | 説明 |
|------|------|----------|-------------|
| AP001 | 直接DynamoDB書き込み | 重大 | 直接DynamoDB書き込みの代わりにCommandServiceを使用 |
| AP002 | バージョン不一致の無視 | 高 | VersionMismatchErrorをリトライで適切に処理 |
| AP003 | N+1クエリパターン | 高 | ループクエリの代わりにバッチ操作を使用 |
| AP004 | フルテーブルスキャン | 高 | Scanの代わりにキー条件付きQueryを使用 |
| AP005 | ハードコードされたテナント | 重大 | テナントコードにgetUserContext()を使用 |
| AP006 | テナント検証の欠如 | 重大 | クライアント提供のテナントコードを信頼しない |
| AP007 | 同期ハンドラーでのスロー | 高 | DataSyncHandlerでエラーを適切に処理 |
| AP008 | ハードコードされたシークレット | 重大 | 環境変数またはSecrets Managerを使用 |
| AP009 | 手動JWTパース | 重大 | ビルトインのCognitoオーソライザーを使用 |
| AP010 | 重いモジュールインポート | 中 | コールドスタートを削減するため必要な関数のみインポート |

### ヘルスチェック

`mbc_health_check`ツールはプロジェクト設定を検証します：

- MBCフレームワークパッケージのインストール
- NestJS依存関係
- TypeScript設定
- 環境ファイルのセットアップ
- ソースディレクトリ構造
- Serverless設定

### コード説明

`mbc_explain_code`ツールはコードを分析して説明します：

- NestJSモジュール構造とインポート
- RESTコントローラーエンドポイント
- サービスパターンと依存関係
- エンティティ定義とDynamoDBキー
- CQRSコマンド発行パターン
- データ同期ハンドラーの動作

## Claude Code Skills {#claude-code-skills}

:::info バージョン情報
Claude Code Skillsは[バージョン1.0.24](/docs/changelog#v1024)で追加されました。
:::

Claude Code Skillsは、MBC CQRS Serverless開発のためのガイド付きアシスタンスを提供します。Skillsは、開発者が一般的なタスクを行うための特化したプロンプトです。

### 利用可能なSkills

| Skill | 説明 |
|-------|-------------|
| `/mbc-generate` | ボイラープレートコードを生成（モジュール、サービス、コントローラー、DTO、ハンドラー） |
| `/mbc-review` | ベストプラクティスとアンチパターン（20パターン）のコードレビュー |
| `/mbc-migrate` | バージョン移行と破壊的変更のガイド |
| `/mbc-debug` | 一般的な問題のデバッグとトラブルシューティング |

### Skillsのインストール

#### CLIを使用（推奨）

最も簡単なインストール方法はMBC CLIを使用することです：

```bash
# 個人skillsディレクトリにインストール（すべてのプロジェクトで利用可能）
mbc install-skills

# プロジェクトディレクトリにインストール（gitでチームと共有）
mbc install-skills --project

# 利用可能なskillsを一覧表示
mbc install-skills --list

# 既存のskillsを強制上書き
mbc install-skills --force
```

#### 手動インストール

または、Claude Codeのskillsディレクトリに手動でコピーできます：

```bash
# 個人skillsにコピー（すべてのプロジェクトで利用可能）
cp -r node_modules/@mbc-cqrs-serverless/mcp-server/skills/* ~/.claude/skills/

# またはプロジェクトskillsにコピー（チームで共有）
cp -r node_modules/@mbc-cqrs-serverless/mcp-server/skills/* .claude/skills/
```

### /mbc-generate Skill

MBC CQRS Serverlessのベストプラクティスに従ってボイラープレートコードを生成します。

**コアテンプレート：**
- モジュール、コントローラー、サービス、DTO、DataSyncHandler

**追加テンプレート：**
- カスタムイベント処理用のイベントハンドラー
- 複雑な検索用のクエリハンドラー
- Elasticsearch同期ハンドラー
- GraphQLリゾルバー

**使用例：**
```
/mbc-generate
Create an Order module with RDS synchronization
```

### /mbc-review Skill

MBC CQRS Serverlessのベストプラクティスに基づいてコードをレビューし、アンチパターンを特定します。

**検出されるアンチパターン（20パターン）：**

| コード | 説明 | 重大度 |
|------|-------------|----------|
| AP001 | publishAsyncの代わりにpublishSyncを使用 | 警告 |
| AP002 | マルチテナント操作でtenantCodeが欠落 | エラー |
| AP003 | ハードコードされたバージョン番号 | エラー |
| AP004 | DataSyncHandlerの登録漏れ | エラー |
| AP005 | ConditionalCheckFailedExceptionを処理していない | 警告 |
| AP006 | 誤ったPK/SK形式の使用 | エラー |
| AP007 | サービスメソッドでinvokeContextが欠落 | エラー |
| AP008 | エンティティIDにgenerateIdを使用していない | 警告 |
| AP009 | DTOバリデーションデコレーターが欠落 | 警告 |
| AP010 | 非推奨メソッドの使用 | 警告 |
| AP011 | トレーシング用のgetCommandSourceが欠落 | 警告 |
| AP012 | DataServiceの代わりに直接DynamoDBアクセス | 警告 |
| AP013 | DataSyncHandlerでtype宣言が欠落 | エラー |
| AP014 | DetailKey型を使用していない | 情報 |
| AP015 | ハードコードされたテーブル名 | 警告 |
| AP016 | エラーログが欠落 | 警告 |
| AP017 | 不正な属性マージ | エラー |
| AP018 | Swaggerドキュメントが欠落 | 情報 |
| AP019 | ページネーションを正しく処理していない | 警告 |
| AP020 | モジュールの循環依存 | エラー |

**使用例：**
```
/mbc-review
Review the code in src/order/order.service.ts
```

### /mbc-migrate Skill

MBC CQRS Serverlessフレームワークのバージョン移行をガイドします。

**機能：**
- バージョン移行マトリックス（v1.0.16からv1.0.23）
- 各バージョンの詳細な移行ガイド
- 非推奨APIの移行手順
- 移行チェックリスト（移行前、移行中、移行後）
- バージョン互換性マトリックス

**使用例：**
```
/mbc-migrate
I need to upgrade from v1.0.20 to v1.0.23
```

### /mbc-debug Skill

MBC CQRS Serverlessアプリケーションの問題のデバッグとトラブルシューティングを支援します。

**機能：**
- エラーコードクイックルックアップ
- 6つのデバッグワークフロー（コマンド、ConditionalCheckFailedException、DataSyncHandler、テナント、インポート、パフォーマンス）
- CloudWatchログクエリ
- ローカル開発デバッグ（LocalStack、Serverless Offline）
- トラブルシューティング決定木

**使用例：**
```
/mbc-debug
I'm getting ConditionalCheckFailedException errors
```

## 関連パッケージ

- [CLIツール](./cli) - コード生成用CLIツール
- [APIリファレンス](./api-reference) - 詳細なAPIドキュメント
