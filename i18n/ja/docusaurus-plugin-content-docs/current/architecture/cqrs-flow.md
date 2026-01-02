---
sidebar_position: 2
---

# CQRSパターンフロー

このドキュメントでは、MBC CQRS ServerlessにおけるCQRS（Command Query Responsibility Segregation）パターンの実装について説明します。

## CQRS概要

```mermaid
flowchart TB
    Client[Client Application]

    subgraph Write
        CommandAPI[Command API]
        CommandHandler[Command Handler]
        CommandService[Command Service]
        EventStore[(Event Store)]
        EventPublisher[Event Publisher]
    end

    subgraph Read
        QueryAPI[Query API]
        QueryHandler[Query Handler]
        DataService[Data Service]
        ReadStore[(Read Store)]
    end

    subgraph Events
        EventHandler[Event Handler]
        Projector[Projector]
    end

    Client --> CommandAPI
    Client --> QueryAPI

    CommandAPI --> CommandHandler
    CommandHandler --> CommandService
    CommandService --> EventStore
    CommandService --> EventPublisher

    QueryAPI --> QueryHandler
    QueryHandler --> DataService
    DataService --> ReadStore

    EventPublisher --> EventHandler
    EventHandler --> Projector
    Projector --> ReadStore
```

## コマンドフロー - 書き込みパス

書き込み操作のフローです。

```mermaid
sequenceDiagram
    Client->>Gateway: POST request
    Gateway->>Controller: DTO
    Controller->>Handler: Command
    Handler->>Handler: Validate
    Handler->>Service: publish
    Service->>DynamoDB: PutItem
    DynamoDB-->>Service: OK
    Service->>SNS: Event
    SNS-->>Service: OK
    Service-->>Handler: Entity
    Handler-->>Controller: Result
    Controller-->>Gateway: 201
    Gateway-->>Client: Response
```

### コマンドフローのステップ

1. **リクエスト受信**: クライアントがPOST/PUT/DELETEリクエストを送信
2. **DTOバリデーション**: コントローラーがclass-validatorを使用して入力を検証
3. **コマンドディスパッチ**: コントローラーがコマンドを作成してディスパッチ
4. **ビジネスロジック**: コマンドハンドラーがビジネスルールを実行
5. **永続化**: コマンドサービスが楽観的ロックでDynamoDBに永続化
6. **イベント発行**: ドメインイベントがSNSに発行される
7. **レスポンス**: 成功レスポンスをクライアントに返却

## クエリフロー - 読み取りパス

読み取り操作のフローです。

```mermaid
sequenceDiagram
    Client->>Gateway: GET request
    Gateway->>Controller: Request
    Controller->>Handler: Query
    Handler->>DataService: getItem
    DataService->>Database: Query
    Database-->>DataService: Item
    DataService-->>Handler: Entity
    Handler-->>Controller: Result
    Controller-->>Gateway: 200
    Gateway-->>Client: Response
```

### クエリフローのステップ

1. **リクエスト受信**: クライアントがGETリクエストを送信
2. **クエリディスパッチ**: コントローラーがクエリを作成してディスパッチ
3. **データ取得**: クエリハンドラーがデータサービスを呼び出す
4. **データベースクエリ**: データサービスがDynamoDBまたはRDSにクエリ
5. **レスポンス**: データをクライアントに返却

## 主要コンポーネント

### コマンドハンドラー

```typescript
@CommandHandler(CreateResourceCommand)
export class CreateResourceHandler
  implements ICommandHandler<CreateResourceCommand> {

  constructor(private readonly commandService: CommandService) {}

  async execute(command: CreateResourceCommand): Promise<DataEntity> {
    // 1. Validate business rules
    // 2. Create entity
    // 3. Persist and publish event
    return this.commandService.publishAsync(entity, { invokeContext });
  }
}
```

### クエリハンドラー

```typescript
@QueryHandler(GetResourceQuery)
export class GetResourceHandler
  implements IQueryHandler<GetResourceQuery> {

  constructor(private readonly dataService: DataService) {}

  async execute(query: GetResourceQuery): Promise<DataEntity> {
    return this.dataService.getItem({
      pk: query.pk,
      sk: query.sk,
    });
  }
}
```

## CQRSの利点

CQRSパターンを採用することで以下の利点が得られます：

- **スケーラビリティ**: 読み取りと書き込みを独立してスケール可能
- **最適化**: 各側面を目的に応じて最適化可能
- **柔軟性**: 読み取りと書き込みで異なるデータモデルを使用可能
- **パフォーマンス**: 高速クエリのためにリードモデルを非正規化
- **監査性**: 監査証跡のための完全なイベント履歴
