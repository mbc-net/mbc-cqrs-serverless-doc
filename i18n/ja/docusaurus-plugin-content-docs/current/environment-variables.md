---
description: アプリケーションに環境変数を追加して検証する方法を学びます。
---

# 環境変数

MBC CQRS サーバーレスフレームワークには、環境変数のサポートが組み込まれており、次のことが可能になります。

- `.env` を使用して環境変数をロードします
- 環境変数を検証する

## 環境変数のロード {#loading-env-vars}

MBC CQRS サーバーレスフレームワークには、環境変数を `.env*` ファイルから `process.env` にロードするためのサポートが組み込まれています。

:::info コア変数とアプリケーション変数
以下に記載する環境変数は2つのタイプに分類されます：

- **コア変数**: フレームワークの基底`EnvironmentVariables`クラスで検証される変数です。フレームワークが動作するために必須です。
- **アプリケーション変数**: 使用する機能に応じてアプリケーションが必要とする変数です。カスタムの`EnvValidation`クラスでこれらの検証ルールを追加してください。

「必須」列は一般的なアプリケーションでの想定を示しています。特定のアプリケーションが依存するすべての変数に対して検証ルールを追加してください。
:::

### コア設定

| 変数 | 説明 | 必須 | デフォルト | 例 |
|-------------|-----------------|--------------|-------------|-------------|
| `NODE_ENV` | 実行環境: local, dev, stg, prod | はい | - | `local` |
| `APP_NAME` | テーブルプレフィックスに使用されるアプリケーション名 | はい | - | `demo` |
| `APP_PORT` | Lambda以外の環境でのアプリケーションポート | いいえ | `3000` | `3000` |
| `LOG_LEVEL` | ログレベル: debug, verbose, info, warn, error, fatal | はい | - | `verbose` |
| `EVENT_SOURCE_DISABLED` | API Gateway統合用のイベントソースルートを無効にする | はい | - | `false` |
| `REQUEST_BODY_SIZE_LIMIT` | JSONおよびURLエンコードデータのリクエストボディサイズ制限 | いいえ | `100kb` | `100kb` |

### マルチテナント設定

| 変数 | 説明 | 必須 | デフォルト | 例 |
|-------------|-----------------|--------------|-------------|-------------|
| `COMMON_TENANT_CODES` | テナント間で共通／共有として扱うテナントコードのカンマ区切りリスト | いいえ | `common` | `common,shared,public` |
| `CROSS_TENANT_ROLES` | テナント横断アクセスを許可するロールのカンマ区切りリスト | いいえ | `system_admin` | `system_admin,general_manager` |

### Read-Your-Writes（RYW）設定 {#ryw-session-configuration}

| 変数 | 説明 | 必須 | デフォルト | 例 |
|-------------|-----------------|--------------|-------------|-------------|
| `RYW_SESSION_TTL_MINUTES` | Read-Your-Writes セッションレコードの有効期間（分）。未設定または0以下の値にすると RYW セッション書き込みが無効になります | いいえ | - | `15` |

### AWS 認証情報

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `AWS_ACCESS_KEY_ID` | ローカル開発用のAWSアクセスキーID | いいえ | `local` |
| `AWS_SECRET_ACCESS_KEY` | ローカル開発用のAWSシークレットアクセスキー | いいえ | `local` |
| `AWS_REGION` | デフォルトのAWSリージョン | いいえ | `ap-northeast-1` |

### DynamoDB 設定

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `DYNAMODB_ENDPOINT` | ローカル開発用のDynamoDBエンドポイントURL | いいえ | `http://localhost:8000` |
| `DYNAMODB_REGION` | DynamoDBリージョン | いいえ | `ap-northeast-1` |
| `ATTRIBUTE_LIMIT_SIZE` | DynamoDBアイテム属性の最大サイズ（バイト） | はい | `389120` |

### S3 設定

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `S3_ENDPOINT` | ローカル開発用のS3エンドポイントURL | いいえ | `http://localhost:4566` |
| `S3_REGION` | S3リージョン | いいえ | `ap-northeast-1` |
| `S3_BUCKET_NAME` | 大きなDynamoDB属性を保存するためのS3バケット名 | はい | `local-bucket` |

### Step Functions 設定

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `SFN_ENDPOINT` | ローカル開発用のStep FunctionsエンドポイントURL | いいえ | `http://localhost:8083` |
| `SFN_REGION` | Step Functionsリージョン | いいえ | `ap-northeast-1` |
| `SFN_COMMAND_ARN` | コマンド処理用のStep Functionsステートマシン ARN | はい | `arn:aws:states:ap-northeast-1:101010101010:stateMachine:command` |

### SNS 設定

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `SNS_ENDPOINT` | ローカル開発用のSNSエンドポイントURL | いいえ | `http://localhost:4002` |
| `SNS_REGION` | SNSリージョン | いいえ | `ap-northeast-1` |
| `SNS_TOPIC_ARN` | イベント通知用のデフォルトSNSトピックARN | いいえ | `arn:aws:sns:ap-northeast-1:101010101010:CqrsSnsTopic` |
| `SNS_ALARM_TOPIC_ARN` | アラーム通知用のSNSトピックARN（エラーアラート） | いいえ | `arn:aws:sns:ap-northeast-1:101010101010:AlarmSnsTopic` |

### SQS 設定

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `SQS_ENDPOINT` | ローカル開発用のSQSエンドポイントURL | いいえ | `http://localhost:9324` |
| `SQS_REGION` | SQSリージョン | いいえ | `ap-northeast-1` |

### Cognito 設定

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `COGNITO_URL` | ローカル開発用のCognitoエンドポイントURL | いいえ | `http://localhost:9229` |
| `COGNITO_USER_POOL_ID` | Cognito ユーザープール ID | はい | `local_2G7noHgW` |
| `COGNITO_USER_POOL_CLIENT_ID` | Cognito ユーザープールクライアント ID | はい | `dnk8y7ii3wled35p3lw0l2cd7` |
| `COGNITO_REGION` | Cognitoリージョン | いいえ | `ap-northeast-1` |

### AppSync 設定

#### AppSync GraphQL サブスクリプション（既存）

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `APPSYNC_ENDPOINT` | AppSync GraphQL エンドポイントURL | いいえ | `http://localhost:4001/graphql` |
| `APPSYNC_API_KEY` | ローカル開発用のAppSync APIキー | いいえ | `da2-fakeApiId123456` |

#### AppSync Events API（オプトイン） {#appsync-events-env}

`NOTIFICATION_TRANSPORTS=appsync-event`（またはデュアルパブリッシュの場合は `appsync-graphql,appsync-event`）を設定すると AppSync Events API トランスポートが有効になります。詳細は [AppSyncEventsService](/docs/notification-module#appsync-events-service) を参照してください。

| 変数 | 説明 | 必須 | デフォルト | 例 |
|-------------|-----------------|--------------|-------------|-------------|
| `NOTIFICATION_TRANSPORTS` | アクティブなトランスポートのカンマ区切りリスト。組み込み値: `appsync-graphql`, `appsync-event` | いいえ | `appsync-graphql` | `appsync-event` |
| `APPSYNC_EVENTS_ENDPOINT` | AppSync Events API の HTTP エンドポイント URL | `appsync-event` が有効な場合 | - | `https://xxxx.appsync-api.ap-northeast-1.amazonaws.com/event` |
| `APPSYNC_EVENTS_NAMESPACE` | チャンネルのネームスペース名 — AppSync Event API に事前作成されたネームスペース名と一致する必要があります | いいえ | `default` | `notifications` |

### SES メール設定

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `SES_ENDPOINT` | ローカル開発用のSESエンドポイントURL | いいえ | `http://localhost:8005` |
| `SES_REGION` | SESリージョン | いいえ | `ap-northeast-1` |
| `SES_FROM_EMAIL` | デフォルトの送信者メールアドレス | はい | `email@example.com` |

### データベース設定 (Prisma)

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `DATABASE_URL` | Prisma ORM用のデータベース接続URL | いいえ | `postgresql://root:RootCqrs@localhost:5432/cqrs?schema=public` |

### .env ファイルの例

```bash
# AWS 認証情報
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
AWS_REGION=ap-northeast-1

# コア設定
NODE_ENV=local
APP_NAME=demo
APP_PORT=3000
LOG_LEVEL=verbose
EVENT_SOURCE_DISABLED=false
REQUEST_BODY_SIZE_LIMIT=100kb

# マルチテナント設定
# COMMON_TENANT_CODES=common
# CROSS_TENANT_ROLES=system_admin

# Read-Your-Writes（RYW）設定
# RYW_SESSION_TTL_MINUTES=15

# DynamoDB 設定
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_REGION=ap-northeast-1
ATTRIBUTE_LIMIT_SIZE=389120

# S3 設定
S3_ENDPOINT=http://localhost:4566
S3_REGION=ap-northeast-1
S3_BUCKET_NAME=local-bucket

# Step Functions 設定
SFN_ENDPOINT=http://localhost:8083
SFN_REGION=ap-northeast-1
SFN_COMMAND_ARN=arn:aws:states:ap-northeast-1:101010101010:stateMachine:command

# SNS 設定
SNS_ENDPOINT=http://localhost:4002
SNS_REGION=ap-northeast-1
SNS_TOPIC_ARN=arn:aws:sns:ap-northeast-1:101010101010:CqrsSnsTopic
SNS_ALARM_TOPIC_ARN=arn:aws:sns:ap-northeast-1:101010101010:AlarmSnsTopic

# SQS 設定
SQS_ENDPOINT=http://localhost:9324
SQS_REGION=ap-northeast-1

# Cognito 設定
COGNITO_URL=http://localhost:9229
COGNITO_USER_POOL_ID=local_2G7noHgW
COGNITO_USER_POOL_CLIENT_ID=dnk8y7ii3wled35p3lw0l2cd7
COGNITO_REGION=ap-northeast-1

# AppSync 設定
APPSYNC_ENDPOINT=http://localhost:4001/graphql
APPSYNC_API_KEY=da2-fakeApiId123456
# AppSync Events API（オプション — 有効にするには NOTIFICATION_TRANSPORTS=appsync-event を設定）
# NOTIFICATION_TRANSPORTS=appsync-event
# APPSYNC_EVENTS_ENDPOINT=https://xxxx.appsync-api.ap-northeast-1.amazonaws.com/event
# APPSYNC_EVENTS_NAMESPACE=default

# SES 設定
SES_ENDPOINT=http://localhost:8005
SES_REGION=ap-northeast-1
SES_FROM_EMAIL=email@example.com

# データベース設定
DATABASE_URL="postgresql://root:RootCqrs@localhost:5432/cqrs?schema=public"
```

## 環境変数の検証 {#validate-env-vars}

必要な環境変数が指定されていない場合、または環境変数が特定の検証ルールを満たしていない場合、アプリケーションの起動中に例外をスローするのが標準的な方法です。 `@mbc-cqrs-serverless/core` パッケージを使用すると、これを簡単に行うことができます。

まずはじめに定義しなければいけないもの

- 検証制約のあるクラス
- EnvironmentVariables 拡張クラス

```ts
// env.validation.ts
import { EnvironmentVariables } from "@mbc-cqrs-serverless/core";
import { IsUrl } from "class-validator";

export class EnvValidation extends EnvironmentVariables {
  @IsUrl({
    require_tld: false,
  })
  FRONT_BASE_URL: string;
}
```

これを配置したら、次のように `EnvValidation` クラスを `createHandler` 関数の構成引数として渡します。

```ts
import { createHandler } from "@mbc-cqrs-serverless/core";

import { EnvValidation } from "./env.validation";
import { MainModule } from "./main.module";

export const handler = createHandler({
  rootModule: MainModule,
  envCls: EnvValidation,
});
```


## 関連ドキュメント

- [設定](/docs/configuring) - モジュールレベルの設定オプション
- [デプロイガイド](/docs/deployment-guide) - デプロイ環境のセットアップ
- [インストール](/docs/installation) - 初期環境セットアップ
