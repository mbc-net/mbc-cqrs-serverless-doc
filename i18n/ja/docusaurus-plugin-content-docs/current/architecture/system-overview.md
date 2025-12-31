---
sidebar_position: 1
---

# システムアーキテクチャ概要

このドキュメントではMBC CQRS Serverlessフレームワークのアーキテクチャ概要を説明します。

## AWSインフラストラクチャ

```mermaid
flowchart TB
    subgraph Clients
        WebApp[Web Application]
        MobileApp[Mobile Application]
        External[External Systems]
    end

    subgraph AWS
        subgraph API
            APIGW[API Gateway]
            AppSync[AppSync]
            WSGateway[WebSocket API]
        end

        subgraph Auth
            Cognito[Amazon Cognito]
        end

        subgraph Compute
            Lambda[AWS Lambda]
        end

        subgraph Storage
            DynamoDB[(DynamoDB)]
            RDS[(RDS Aurora)]
            S3[(S3)]
        end

        subgraph Messaging
            SNS[SNS]
            SQS[SQS]
        end

        subgraph Orchestration
            StepFunctions[Step Functions]
        end

        subgraph Notifications
            SES[SES]
        end
    end

    WebApp --> APIGW
    WebApp --> AppSync
    WebApp --> WSGateway
    MobileApp --> APIGW
    MobileApp --> AppSync
    External --> APIGW

    APIGW --> Cognito
    AppSync --> Cognito
    WSGateway --> Cognito

    APIGW --> Lambda
    AppSync --> Lambda
    WSGateway --> Lambda

    Lambda --> DynamoDB
    Lambda --> RDS
    Lambda --> S3
    Lambda --> SNS
    Lambda --> SES
    Lambda --> StepFunctions

    SNS --> SQS
    SQS --> Lambda
    StepFunctions --> Lambda
```

## コンポーネント説明

### APIレイヤー

クライアントリクエストを受け取るエントリーポイントです。

- **API Gateway**: CRUD操作用のREST APIエンドポイント
- **AppSync**: 柔軟なクエリとサブスクリプション用のGraphQL API
- **WebSocket API**: リアルタイム双方向通信

### 認証

- **Amazon Cognito**: ユーザー認証、JWTトークン、ユーザープール

### コンピューティング

- **AWS Lambda**: NestJSアプリケーションのサーバーレス実行

### データストレージ

- **DynamoDB**: CQRSデータ永続化のためのプライマリイベントストア
- **RDS Aurora**: 複雑なクエリ用のオプショナルリレーショナルデータ
- **S3**: ファイルとドキュメントのストレージ

### メッセージング

- **SNS**: イベントファンアウトとトピックベースのパブリッシング
- **SQS**: 信頼性の高いメッセージキューイングと非同期処理

### オーケストレーション

- **Step Functions**: 長時間実行ワークフローとSagaパターン

### 通知

- **SES**: トランザクションメール配信

## データフロー

システム内でのリクエストの流れを説明します。

1. **クライアントリクエスト**: クライアントがAPI Gateway、AppSync、またはWebSocket経由でリクエストを送信
2. **認証**: CognitoがJWTトークンを検証
3. **コマンド実行**: Lambdaがコマンドを処理しDynamoDBに永続化
4. **イベント発行**: イベントがSNSに発行される
5. **イベント処理**: SQSキューが非同期処理用のLambdaハンドラーをトリガー
6. **リードモデル更新**: プロジェクションが複雑なクエリ用にRDSを更新

## マルチテナントアーキテクチャ

```mermaid
flowchart LR
    subgraph TenantIsolation
        Request[Incoming Request]
        Auth[Authentication]
        TenantResolver[Tenant Resolver]

        subgraph DataPartition
            T1[Tenant A Data]
            T2[Tenant B Data]
            T3[Tenant C Data]
        end
    end

    Request --> Auth
    Auth --> TenantResolver
    TenantResolver --> T1
    TenantResolver --> T2
    TenantResolver --> T3
```

テナント分離は以下の方法で実現されます：

- **パーティションキープレフィックス**: 各テナントのデータはテナントコードでプレフィックスされる
- **リクエストコンテキスト**: テナント情報はJWTトークンから抽出される
- **クエリフィルタリング**: すべてのクエリは自動的にテナントにスコープされる
