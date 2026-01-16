---
description: アプリケーションに環境変数を追加して検証する方法を学びます。
---

# 環境変数

MBC CQRS サーバーレスフレームワークには、環境変数のサポートが組み込まれており、次のことが可能になります。

- `.env` を使用して環境変数をロードします
- 環境変数を検証する

## Loading Environment Variables

MBC CQRS サーバーレスフレームワークには、環境変数を `.env*` ファイルから `process.env` にロードするためのサポートが組み込まれています。

### コア設定

| 変数 | 説明 | 必須 | デフォルト | 例 |
|-------------|-----------------|--------------|-------------|-------------|
| `NODE_ENV` | 実行環境: local, dev, stg, prod | はい | - | `local` |
| `APP_NAME` | テーブルプレフィックスに使用されるアプリケーション名 | はい | - | `demo` |
| `APP_PORT` | Lambda以外の環境でのアプリケーションポート | いいえ | `3000` | `3000` |
| `LOG_LEVEL` | ログレベル: debug, verbose, info, warn, error, fatal | はい | - | `verbose` |
| `EVENT_SOURCE_DISABLED` | API Gateway統合用のイベントソースルートを無効にする | はい | - | `false` |
| `REQUEST_BODY_SIZE_LIMIT` | JSONおよびURLエンコードデータのリクエストボディサイズ制限 | いいえ | `100kb` | `100kb` |

### AWS 認証情報

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `AWS_ACCESS_KEY_ID` | ローカル開発用のAWSアクセスキーID | いいえ | `local` |
| `AWS_SECRET_ACCESS_KEY` | ローカル開発用のAWSシークレットアクセスキー | いいえ | `local` |
| `AWS_DEFAULT_REGION` | デフォルトのAWSリージョン | いいえ | `ap-northeast-1` |

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
| `SNS_TOPIC_ARN` | イベント通知用のデフォルトSNSトピックARN | はい | `arn:aws:sns:ap-northeast-1:101010101010:CqrsSnsTopic` |
| `SNS_ALARM_TOPIC_ARN` | アラーム通知用のSNSトピックARN（エラーアラート） | いいえ | `arn:aws:sns:ap-northeast-1:101010101010:AlarmSnsTopic` |

### Cognito 設定

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `COGNITO_URL` | ローカル開発用のCognitoエンドポイントURL | いいえ | `http://localhost:9229` |
| `COGNITO_USER_POOL_ID` | Cognito ユーザープール ID | はい | `local_2G7noHgW` |
| `COGNITO_USER_POOL_CLIENT_ID` | Cognito ユーザープールクライアント ID | はい | `dnk8y7ii3wled35p3lw0l2cd7` |
| `COGNITO_REGION` | Cognitoリージョン | いいえ | `ap-northeast-1` |

### AppSync 設定

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `APPSYNC_ENDPOINT` | AppSync GraphQL エンドポイントURL | いいえ | `http://localhost:4001/graphql` |
| `APPSYNC_API_KEY` | ローカル開発用のAppSync APIキー | いいえ | `da2-fakeApiId123456` |

### SES メール設定

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `SES_ENDPOINT` | ローカル開発用のSESエンドポイントURL | いいえ | `http://localhost:8005` |
| `SES_REGION` | SESリージョン | いいえ | `ap-northeast-1` |
| `SES_FROM_EMAIL` | デフォルトの送信者メールアドレス | はい | `email@example.com` |

### データベース設定 (Prisma)

| 変数 | 説明 | 必須 | 例 |
|-------------|-----------------|--------------|-------------|
| `DATABASE_URL` | Prisma ORM用のデータベース接続URL | いいえ | `mysql://root:RootCqrs@localhost:3306/cqrs?schema=public&connection_limit=1` |

### .env ファイルの例

```bash
# AWS 認証情報
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
AWS_DEFAULT_REGION=ap-northeast-1

# コア設定
NODE_ENV=local
APP_NAME=demo
APP_PORT=3000
LOG_LEVEL=verbose
EVENT_SOURCE_DISABLED=false
REQUEST_BODY_SIZE_LIMIT=100kb

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

# Cognito 設定
COGNITO_URL=http://localhost:9229
COGNITO_USER_POOL_ID=local_2G7noHgW
COGNITO_USER_POOL_CLIENT_ID=dnk8y7ii3wled35p3lw0l2cd7
COGNITO_REGION=ap-northeast-1

# AppSync 設定
APPSYNC_ENDPOINT=http://localhost:4001/graphql
APPSYNC_API_KEY=da2-fakeApiId123456

# SES 設定
SES_ENDPOINT=http://localhost:8005
SES_REGION=ap-northeast-1
SES_FROM_EMAIL=email@example.com

# データベース設定
DATABASE_URL="mysql://root:RootCqrs@localhost:3306/cqrs?schema=public&connection_limit=1"
```

## Validate Environment Variables

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
