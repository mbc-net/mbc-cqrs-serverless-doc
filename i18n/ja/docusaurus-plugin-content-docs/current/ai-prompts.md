---
sidebar_position: 3
description: MBC CQRS ServerlessでのAI支援開発に最適化されたプロンプト集。
---

# AIプロンプトライブラリ

このページでは、MBC CQRS Serverlessフレームワークを使用する際のAIアシスタント向けに最適化されたプロンプトを提供します。

## モジュール生成

### 新しいCQRSモジュールの作成

```
Create a new CQRS module for [FEATURE_NAME] in MBC CQRS Serverless with:
- CommandModule registration with table name "[TABLE_NAME]"
- Command handlers: Create, Update, Delete (async processing)
- DataService for queries: list with pagination, getById
- Entity extending DataEntity with attributes
- DTOs for create, update, and response
- Follow existing patterns in the codebase
```

### RDS同期付きモジュールの作成

```
Create a CQRS module for [FEATURE_NAME] that syncs data to RDS:
- CommandModule with DataSyncHandler for RDS
- TypeORM entity for the RDS table
- Prisma schema if using Prisma
- Handle create, update, and delete sync operations
- Include error handling for sync failures
```

## コマンド操作

### 非同期コマンドの実装

```
Implement an async command handler for [OPERATION] in MBC CQRS Serverless:
- Use publishAsync for immediate response
- Include input validation in DTO
- Set appropriate command source
- Handle optimistic locking with version
- Follow the existing command pattern in this codebase
```

### 同期コマンドの実装

```
Implement a synchronous command for [OPERATION] that waits for completion:
- Use publishSync method
- Return the fully processed result
- Include proper error handling
- Consider timeout implications
```

## クエリ操作

### フィルター付きリストクエリ

```
Implement a list query for [ENTITY] with:
- Pagination support (limit, cursor)
- Filter by [FIELD_NAMES]
- Sort options
- Use DataService.listItems with skExpression
- Return paginated response with items and cursor
```

### 詳細クエリ

```
Implement a detail query to get [ENTITY] by ID:
- Use DataService.getItem
- Handle VERSION_LATEST for latest version
- Include proper error handling for not found
- Serialize response for API output
```

## イベントハンドリング

### カスタムイベントハンドラーの作成

```
Create a custom event handler for [EVENT_TYPE] in MBC CQRS Serverless:
- Extend appropriate event class (DynamoDbEvent, SqsEvent, etc.)
- Implement IEventHandler interface
- Register handler in EventHandlerModule
- Include error handling and logging
- Follow the event handling patterns in the codebase
```

### DynamoDBストリームハンドラー

```
Create a DynamoDB stream handler to [PURPOSE]:
- Process INSERT, MODIFY, REMOVE events
- Filter by table name if needed
- Extract old and new images
- Implement idempotent processing
- Handle errors appropriately
```

## データ同期

### データ同期ハンドラーの作成

```
Create a DataSyncHandler to sync [ENTITY] to [TARGET]:
- Implement IDataSyncHandler interface
- Handle up() for create/update operations
- Handle down() for delete operations
- Use transactions where appropriate
- Include error handling and rollback logic
```

## マルチテナンシー

### テナント対応機能の実装

```
Implement [FEATURE] with multi-tenancy support:
- Extract tenantCode from invocation context
- Use tenant-prefixed partition keys
- Apply tenant isolation in queries
- Include tenant validation
- Follow existing tenant patterns in the codebase
```

## テスト

### コマンドハンドラーのユニットテスト

```
Write unit tests for [COMMAND_HANDLER]:
- Mock CommandService and dependencies
- Test successful command execution
- Test validation errors
- Test version conflict handling
- Use Jest with AWS SDK mocks
```

### 統合テスト

```
Write integration tests for [FEATURE]:
- Set up test DynamoDB tables
- Test full command-query flow
- Verify data sync if applicable
- Clean up test data after each test
- Use LocalStack for local testing
```

## デバッグ

### バージョン競合の診断

```
I'm getting a "version not match" error when updating [ENTITY].
Please help me:
1. Understand why this error occurs in CQRS/Event Sourcing
2. Check if I'm using the correct version in my update
3. Suggest how to handle concurrent updates properly
4. Show me how to implement retry logic if needed
```

### データ同期問題の診断

```
Data is not syncing to RDS for [ENTITY]. Please help me:
1. Check if DataSyncHandler is properly registered
2. Verify the sync handler implementation
3. Check for errors in the sync process
4. Suggest debugging steps and logging
```

### イベント処理の診断

```
Events are not being processed for [EVENT_TYPE]. Please check:
1. Event handler registration in the module
2. Event class implementation
3. SQS/SNS configuration
4. Error handling and dead letter queue setup
```

## アーキテクチャレビュー

### モジュール実装のレビュー

```
Review this [MODULE_NAME] module implementation for:
- Proper CQRS pattern adherence (command/query separation)
- Event sourcing best practices
- Multi-tenancy implementation
- Error handling completeness
- Performance considerations
- Security best practices
```

### 本番稼働準備のレビュー

```
Review [FEATURE] for production readiness:
- Error handling and recovery
- Logging and monitoring
- Performance under load
- Security vulnerabilities
- Data consistency guarantees
- Rollback procedures
```

## マイグレーション

### スキーマ変更用マイグレーションの作成

```
Create a migration for [SCHEMA_CHANGE]:
- TypeORM migration file
- Handle existing data transformation
- Include rollback procedure
- Test with sample data
- Document breaking changes if any
```

## ベストプラクティス

これらのプロンプトを使用する際：

1. **具体的に**: プレースホルダーを実際の名前と要件に置き換えてください
2. **コンテキストを提供**: 関連するコードスニペットやファイルパスを含めてください
3. **既存コードを参照**: コードベース内の類似実装を指し示してください
4. **制約を指定**: パフォーマンス、セキュリティ、互換性の要件があれば言及してください
5. **説明を求める**: AIに実装の選択理由を説明させてください

## 関連情報

- [AI統合](./ai-integration) - AIツールサポートの概要
- [MCPサーバー](./mcp-server) - MCP経由の動的AI統合
- [エラーカタログ](./error-catalog) - よくあるエラーと解決策
