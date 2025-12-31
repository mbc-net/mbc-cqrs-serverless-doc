---
sidebar_position: 1
---

# AI統合

MBC CQRS ServerlessフレームワークはAIツールとの統合を念頭に設計されています。

## 概要

モダンな開発ワークフローには、コード生成、デバッグ、ドキュメント参照においてAI支援が含まれることが増えています。このフレームワークはllms.txtファイルとMCPサーバーを通じてAI開発ツールをサポートしています。

## llms.txt規約

### llms.txtとは？

llms.txt規約は、ウェブサイトやプロジェクトがLLM向けに情報を公開するための標準化された方法を提供します。

### ファイル構造

このフレームワークは2つのバージョンを提供しています：

- **`llms.txt`** - 簡潔な概要とクイックリファレンス
- **`llms-full.txt`** - 包括的なドキュメントとコンテキスト

### llms.txtの使用方法

AIツールはこれらのファイルを直接取得してフレームワークのコンテキストを構築できます：

```bash
# Short version for quick context
curl https://raw.githubusercontent.com/mbc-net/mbc-cqrs-serverless/main/llms.txt

# Full version for comprehensive context
curl https://raw.githubusercontent.com/mbc-net/mbc-cqrs-serverless/main/llms-full.txt
```

## MCPサーバー統合

Model Context Protocol（MCP）サーバーは、AIツールがフレームワークと対話するためのより動的な方法を提供します。

### 主な機能

| 機能 | 説明 |
|---------|-------------|
| Resources | フレームワークドキュメントへのアクセス |
| Tools | コード生成と検証ツール |
| Prompts | 一般的なタスクのためのガイド付きワークフロー |

### セットアップ

Claude Codeまたは他のMCP互換ツールに追加：

```json
{
  "mcpServers": {
    "mbc-cqrs-serverless": {
      "command": "npx",
      "args": ["@mbc-cqrs-serverless/mcp-server"]
    }
  }
}
```

詳細はこちら: [MCPサーバードキュメント](./mcp-server)

## ベストプラクティス

### ドキュメント優先

複雑なタスクに取り組む前に、AIにフレームワークのドキュメントを読ませましょう：

1. MCPリソースを使用してアーキテクチャドキュメントを取得
2. CQRSパターンとイベントソーシングの概念を確認
3. 既存のモジュールを参照パターンとして確認

### コード生成

AIにモジュールを生成させる際は、具体的に記述してください：

```
"Generate an Order module with async command handling and validation"
```

### デバッグ支援

エラーに遭遇した場合、AIはエラーカタログを使用して解決策を見つけることができます：

```
"I'm getting error 'version not match'. What should I do?"
```

## 対応ツール

以下のAIツールはMBC CQRS Serverlessと統合できます：

| ツール | サポート | 備考 |
|------|---------|-------|
| Claude Code | フルサポート | MCPネイティブサポート |
| Cursor | フルサポート | MCPサポートあり |
| GitHub Copilot | 部分サポート | llms.txt経由 |

## 関連リソース

- [MCPサーバー](./mcp-server) - 詳細なMCPサーバードキュメント
- [CLIツール](./cli) - コード生成用CLIコマンド
- [エラーカタログ](./error-catalog) - 解決策付きエラーリファレンス
- [アーキテクチャ](./architecture) - システムアーキテクチャの概要
