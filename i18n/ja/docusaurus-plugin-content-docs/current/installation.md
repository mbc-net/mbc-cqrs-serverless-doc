---
description: システム要件、CLIスキャフォールディング、ローカル開発環境を含むMBC CQRS Serverlessフレームワークのインストールとセットアップ。
---

# インストール

システム要件:

- [Node.js](https://nodejs.org/en/download/package-manager) (20.x or later)
- [JQ cli](https://jqlang.github.io/jq/download/)
- [AWS cli](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [Docker](https://docs.docker.com/engine/install/)
- Windows / macOS / Linux をサポートしています。

## 自動インストール {#automatic-installation}

まず、[mbc-cqrs-serverless CLI](/docs/cli) を使用してプロジェクトをスキャフォールディングします。次のコマンドを実行します。これにより、新しいプロジェクト ディレクトリが作成され、そのディレクトリに初期コアの mbc-cqrs-serverless ファイルとサポート モジュールが追加され、プロジェクトの従来の基本構造が作成されます。

```bash
npm i -g @mbc-cqrs-serverless/cli
mbc new project-name
```

mbc-cqrs-serverless を初めて使う方は、[プロジェクト構造](/docs/project-structure) のドキュメントを参照して、アプリケーション内で使用できるすべてのファイルとフォルダーの概要を確認してください。

## 開発用サーバの実行 {#run-dev-server}

1. `npm run build` を実行してウォッチモードでプロジェクトをビルドします。
2. 別のターミナルセッションを開き、`npm run offline:docker` を実行して Docker サービス（DynamoDB Local、MySQL、S3 用の Floci など）を起動します。
3. MySQLが完全に起動するまで約30秒待ってから、別のターミナルを開いて`npm run migrate`を実行し、RDSとDynamoDBのテーブルをマイグレーションします。
4. 最後に `npm run offline:sls` コマンドを実行して serverless offline mode を実行します。

:::info ローカル開発でのAWSクレデンシャル
ローカル開発では AWS の代わりにローカルのエミュレーター（DynamoDB Local、S3 用の Floci、ElasticMQ など）を使用します。実際の AWS 認証情報は不要です。`.env` ファイルにダミー値を設定してください：

```bash
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```
:::

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
- Swagger UI: http://localhost:3000/swagger-ui
- オフラインLambdaサーバー: http://localhost:4000
- Lambda用HTTP: http://localhost:3002
- Step Functions: http://localhost:8083
- DynamoDB: http://localhost:8000
- DynamoDB管理画面: http://localhost:8001
- SNS: http://localhost:4002
- SQS: http://localhost:9324
- SQS管理画面: http://localhost:9325
- Floci (S3): http://localhost:4566
- AppSync: http://localhost:4001
- Cognito: http://localhost:9229
- EventBridge: http://localhost:4010
- Simple Email Service: http://localhost:8005
- `npx prisma studio` を実行して prisma studio を起動します。 エンドポイント: http://localhost:5000

:::tip セットアップの確認
[Swagger UI](http://localhost:3000/swagger-ui) をブラウザで開き、APIサーバーが起動していることを確認してください。利用可能なすべてのエンドポイントを含むインタラクティブなAPIドキュメントが表示されるはずです。
:::

## ローカル S3 エミュレーター（Floci） {#local-s3-floci}

ローカルスタックは [Floci](https://github.com/floci-io/floci)（`floci/floci:1.6.0`）でポート `4566`（`LOCAL_S3_PORT`）に S3 をエミュレートし、パス形式のアドレッシングを使用します。バケットは Docker ボリューム `floci-data` に保存され、`.env` の `COMPOSE_PROJECT_NAME` によってプロジェクトごとに分離されます。

`infra-local/scripts/resources.sh`（Windows では `resources.ps1`）がバケットを作成し、CORS ルールを適用します。Floci はバケットに CORS ルールがないとブラウザのプリフライトリクエストを `403` で拒否するため、`DirectoryFileService` が発行する署名付きアップロード/表示 URL はこのルールに依存します。本番環境では CDK スタックでバケットに CORS を設定しており、このスクリプトはそのローカル版です。

:::danger 破壊的変更 (v1.5.0)
[バージョン 1.5.0](/docs/changelog#v150) より前に作成したプロジェクトは S3 に LocalStack を使用しています。LocalStack Community Edition は 2026 年 3 月にサポートが終了したため、ローカルスタックを Floci に移行してください。アプリケーションコードと `.env` の値は変更不要です。

1. `infra-local/docker-compose.yml` の `localstack` サービスを置き換え、名前付きボリュームを宣言します：

```yaml
  floci:
    image: floci/floci:1.6.0
    ports:
      - '${LOCAL_S3_PORT:-4566}:4566'
    environment:
      - FLOCI_DEFAULT_REGION=ap-northeast-1
      - FLOCI_STORAGE_MODE=persistent
    volumes:
      - floci-data:/app/data

volumes:
  floci-data:
```

2. `package.json` から `serverless-localstack` を削除し、`npm install` を実行します。
3. 最新テンプレートの `infra-local/scripts/resources.sh` / `resources.ps1` から `configure S3 bucket CORS` ブロックを自分のスクリプトにコピーします。Windows では JSON ファイルを BOM なしで書き込んでください。Windows PowerShell 5.1 は `Set-Content -Encoding utf8` で BOM を付け、AWS CLI はそれを受け付けません。
4. `npm run offline:docker` でスタックを起動し（実行し続けます）、別のターミナルから `bash infra-local/scripts/resources.sh`（Windows では `npm run resources:win32`）でバケットを作り直します。LocalStack に保存していたオブジェクトは移行されません。

`FLOCI_STORAGE_MODE=persistent` は必須です。既定値の `memory` では `docker compose down` のたびにすべてのバケットが破棄されます。スクリプトを更新していない場合は、バケット作成後に CORS ルールを一度手動で適用してください：

```bash
set -a; . ./.env; set +a
aws --endpoint-url="$S3_ENDPOINT" s3api put-bucket-cors \
  --bucket "$S3_BUCKET_NAME" \
  --cors-configuration '{"CORSRules":[{"AllowedOrigins":["*"],"AllowedMethods":["GET","PUT","POST","DELETE","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"]}]}'
```

参照: [変更履歴 v1.5.0](/docs/changelog#v150)
:::

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
| `LOCAL_S3_PORT` | `4566` | Floci (S3) |
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


## 次のステップ {#next-steps}

ローカル環境の準備が整いました。次の順序で進めることをお勧めします：

1. **[クイックスタートチュートリアル](/docs/quickstart-tutorial)** — 15分で最初のAPIエンドポイントを構築
2. **[プロジェクト構成](/docs/project-structure)** — 生成されたファイルとフォルダの役割を理解する
3. **[アーキテクチャ](/docs/architecture)** — フレームワークの背景にあるCQRSとイベントソーシングの概念を学ぶ
4. **[バックエンド開発](/docs/backend-development)** — 実際の機能の実装を開始する

## 関連ドキュメント

- [はじめに](/docs/getting-started) - MBC CQRS Serverlessの紹介
- [プロジェクト構成](/docs/project-structure) - 生成されたプロジェクト構成を理解
- [設定](/docs/configuring) - アプリケーションのモジュール設定
- [CLI](/docs/cli) - スキャフォールディング用CLIコマンド
- [用語集](/docs/glossary) - フレームワークの用語と概念
- [アプリケーションを構築する](/docs/build-your-application) - セットアップ後のアプリケーション開発ガイド
- [CodePipeline CI/CD](/docs/codepipeline-cicd) - AWS CodePipelineによる自動デプロイ
