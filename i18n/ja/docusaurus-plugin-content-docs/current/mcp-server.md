---
sidebar_position: 1
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

## 関連パッケージ

- [CLIツール](./cli) - コード生成用CLIツール
- [APIリファレンス](./api-reference) - 詳細なAPIドキュメント
