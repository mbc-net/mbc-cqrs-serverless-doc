---
description: インストール
---

# インストール

システム要件:

- [Node.js](https://nodejs.org/en/download/package-manager)
- [JQ cli](https://jqlang.github.io/jq/download/)
- [AWS cli](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [Docker](https://docs.docker.com/engine/install/)
- Windows / macOS / Linux をサポートしています。

## 自動インストール

まず、[mbc-cqrs-serverless CLI](/docs/cli) を使用してプロジェクトをスキャフォールディングします。 mbc-cqrs-serverless CLI を使用してプロジェクトをスキャフォールディングするには、次のコマンドを実行します。これにより、新しいプロジェクト ディレクトリが作成され、そのディレクトリに初期コアの mbc-cqrs-serverless ファイルとサポート モジュールが追加され、プロジェクトの従来の基本構造が作成されます。

```bash
npm i -g @mbc-cqrs-serverless/cli
mbc new project-name
```

mbc-cqrs-serverless を使用して新しいプロジェクトを作成した際は、[プロジェクト構造](/docs/project-structure) のドキュメントを参照してアプリケーションないで使用出来る全てのファイルとフォルダーの概要を確認して下さい。

## 開発用サーバの実行

1. `npm run build` コマンドを実行して開発モードでビルドします。
2. 別のターミナルを開いて `npm run offline:docker` コマンドを実行し、開発用サーバをDockerで実行します。
3. 別のターミナルを開いて `npm run migrate` コマンドを実行し開発サーバ内のRDS及びDynamoDBをマイグレーとします。
4. 最後に `npm run offline:sls` コマンドを実行して serverless offline mode を実行します。

サーバの起動が完了したら次のようなメッセージを確認する事が出来ます。

```bash
DEBUG[serverless-offline-sns][adapter]: successfully subscribed queue "http://localhost:9324/101010101010/notification-queue" to topic: "arn:aws:sns:ap-northeast-1:101010101010:MySnsTopic"
Offline Lambda Server listening on http://localhost:4000
serverless-offline-aws-eventbridge :: Plugin ready
serverless-offline-aws-eventbridge :: Mock server running at port: 4010
Starting Offline SQS at stage dev (ap-northeast-1)
Starting Offline Dynamodb Streams at stage dev (ap-northeast-1)

Starting Offline at stage dev (ap-northeast-1)

Offline [http for lambda] listening on http://localhost:3002
Function names exposed for local invocation by aws-sdk:
           * main: serverless-example-dev-main
Configuring JWT Authorization: ANY /{proxy+}

   ┌────────────────────────────────────────────────────────────────────────┐
   │                                                                        │
   │   ANY | http://localhost:3000/api/public                               │
   │   POST | http://localhost:3000/2015-03-31/functions/main/invocations   │
   │   ANY | http://localhost:3000/swagger-ui/{proxy*}                      │
   │   POST | http://localhost:3000/2015-03-31/functions/main/invocations   │
   │   ANY | http://localhost:3000/{proxy*}                                 │
   │   POST | http://localhost:3000/2015-03-31/functions/main/invocations   │
   │                                                                        │
   └────────────────────────────────────────────────────────────────────────┘

Server ready: http://localhost:3000 🚀
```

次のサービスのエンドポイントが起動します。:

- API Gateway: http://localhost:3000
- オフラインLambdaサーバー: http://localhost:4000
- Lambda用HTTP: http://localhost:3002
- Step Functions: http://localhost:8083
- DynamoDB: http://localhost:8000
- DynamoDB管理画面: http://localhost:8001
- SNS: http://localhost:4002
- SQS: http://localhost:9324
- SQS管理画面: http://localhost:9325
- Localstack: http://localhost:4566
- AppSync: http://localhost:4001
- Cognito: http://localhost:9229
- EventBridge: http://localhost:4010
- Simple Email Service: http://localhost:8005
- `npx prisma studio` を実行して prisma studio を起動します。 エンドポイント: http://localhost:5000

## ローカルサービスのポート設定 {#configuring-local-ports}

:::info バージョンノート
ローカルポート設定機能は[バージョン 1.0.26](/docs/changelog#v1026)で追加されました。
:::

他のサービス（別のMySQLインスタンスやポート3000を使用する他のアプリケーションなど）とポートが競合する場合は、`.env`ファイルの環境変数でローカルサービスのポートを設定できます。

### 利用可能なポート変数

| 変数 | デフォルト | サービス |
|-------------|-------------|-------------|
| `LOCAL_HTTP_PORT` | `3000` | API Gateway (Serverless Offline) |
| `LOCAL_LAMBDA_PORT` | `3002` | Lambda HTTPエンドポイント |
| `LOCAL_DYNAMODB_PORT` | `8000` | DynamoDB Local |
| `LOCAL_RDS_PORT` | `3306` | MySQL (RDS) |
| `LOCAL_S3_PORT` | `4566` | LocalStack (S3) |
| `LOCAL_SNS_PORT` | `4002` | SNS |
| `LOCAL_SQS_PORT` | `9324` | SQS (ElasticMQ) |
| `LOCAL_SQS_UI_PORT` | `9325` | SQS管理画面 |
| `LOCAL_SFN_PORT` | `8083` | Step Functions Local |
| `LOCAL_COGNITO_PORT` | `9229` | Cognito Local |
| `LOCAL_APPSYNC_PORT` | `4001` | AppSyncシミュレーター |
| `LOCAL_EVENTBRIDGE_PORT` | `4010` | EventBridge |
| `LOCAL_SES_PORT` | `8005` | Simple Email Service |
| `LOCAL_DDB_ADMIN_PORT` | `8001` | DynamoDB管理画面 |

### 例: ポートの変更

API Gatewayのポートを3000から3010に、MySQLのポートを3306から3307に変更するには、`.env`ファイルに以下を追加します：

```bash
# API Gatewayのポートを3010に変更
LOCAL_HTTP_PORT=3010

# MySQLのポートを3307に変更
LOCAL_RDS_PORT=3307

# DynamoDBのポートを9000に変更
LOCAL_DYNAMODB_PORT=9000
```

ポートを変更した後、すべてのサービスを再起動します：

1. 実行中のすべてのサービス（DockerとServerless Offline）を停止
2. `npm run offline:docker`を実行してDockerサービスを再起動
3. `npm run offline:sls`を実行してServerless Offlineを再起動

:::tip
ポート設定は、Docker Compose、Serverless Offline、DynamoDBストリームトリガースクリプトを含むすべての関連サービスに自動的に適用されます。`.env`ファイルで環境変数を一度設定するだけで済みます。
:::

:::note

ローカル開発環境で `npm run migrate` コマンドやローカルの Cognito にログイン出来ない場合は次のコマンドを使用してファイルやフォルダーにアクセス権を設定する必要があります。

```bash
sudo chmod -R 777 ./infra-local/cognito-local
sudo chmod -R 777 ./infra-local/cognito-local/db/clients.json
sudo chmod -R 777 ./infra-local
sudo chmod -R 777 ./infra-local/docker-data/
sudo chmod -R 777 ./infra-local/docker-data/dynamodb-local
```

:::


## Related Documentation

- [Getting Started](/docs/getting-started) - MBC CQRS Serverlessの紹介
- [Project Structure](/docs/project-structure) - 生成されたプロジェクト構成を理解
- [Configuring](/docs/configuring) - アプリケーションのモジュール設定
- [CLI](/docs/cli) - スキャフォールディング用CLIコマンド
