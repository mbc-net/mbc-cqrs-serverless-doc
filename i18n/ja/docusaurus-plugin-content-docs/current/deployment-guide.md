---
description: MBC CQRS ServerlessアプリケーションをAWSにデプロイする方法を学びます。
---

# デプロイメントガイド

このガイドでは、AWS CDKを使用してMBC CQRS ServerlessアプリケーションをAWSにデプロイする方法を説明します。

## 前提条件

デプロイ前に、以下が準備されていることを確認してください：

- AWS CLIがインストールされ、適切な認証情報で設定されている
- Node.js 18.x 以降
- AWS CDK CLIがインストールされている（`npm install -g aws-cdk`）
- 必要な権限を持つAWSアカウント

## AWSアカウントの準備

### 必要なAWSサービス

アプリケーションは以下のAWSサービスを使用します：

- API Gateway - HTTP APIエンドポイント
- Lambda - サーバーレスコンピューティング
- DynamoDB - NoSQLデータベース
- RDS（PostgreSQL）- リレーショナルデータベース（オプション）
- Cognito - ユーザー認証
- S3 - ファイルストレージ
- SQS/SNS - メッセージキューイング
- Step Functions - ワークフローオーケストレーション
- CloudWatch - ロギングとモニタリング

### IAMパーミッション

デプロイを行うユーザー/ロールには以下の権限が必要です：

- CloudFormation（フルアクセス）
- Lambda、API Gateway、DynamoDB、S3、SQS、SNS、Step Functions
- IAM（ロール作成用）
- CloudWatch Logs
- VPC（RDS使用時）

## CDK Bootstrap

最初のデプロイ前に、AWSアカウントでCDKをブートストラップします：

```bash
cdk bootstrap aws://YOUR_ACCOUNT_ID/YOUR_REGION
```

例：

```bash
cdk bootstrap aws://123456789012/ap-northeast-1
```

## 環境設定

### 環境設定の作成

`infra/config/` に環境固有の設定ファイルを作成します：

```typescript
// infra/config/dev.ts
import { IConfig } from './type';

export const config: IConfig = {
  envName: 'dev',
  region: 'ap-northeast-1',

  // VPC Configuration
  vpcId: 'vpc-xxxxxxxxx',

  // Domain Configuration (optional)
  domainName: 'dev-api.your-domain.com',
  certificateArn: 'arn:aws:acm:ap-northeast-1:YOUR_ACCOUNT:certificate/xxx',

  // Database Configuration
  database: {
    name: 'your_app_dev',
    instanceType: 't3.micro',
  },

  // API Gateway Configuration
  apiGateway: {
    throttlingRateLimit: 1000,
    throttlingBurstLimit: 500,
  },
};
```

### 環境変数

`.env` またはCI/CDパイプラインで環境変数を設定します：

```bash
# AWS Configuration
AWS_REGION=ap-northeast-1
AWS_ACCOUNT_ID=123456789012

# Application Configuration
APP_NAME=your-app
ENVIRONMENT=dev

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Cognito
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxx
```

## CDKスタック構造

典型的なMBC CQRS Serverless CDKプロジェクトは以下の構造を持ちます：

```
infra/
├── app.ts                    # CDK app entry point
├── cdk.json                  # CDK configuration
├── config/
│   ├── type.ts              # Config type definitions
│   ├── dev.ts               # Development config
│   ├── stg.ts               # Staging config
│   └── prod.ts              # Production config
└── libs/
    ├── infra-stack.ts       # Main infrastructure stack
    └── pipeline-stack.ts    # CI/CD pipeline stack
```

## CDKでのデプロイ

### CloudFormationテンプレートの合成

まず、CloudFormationテンプレートを合成して設定を確認します：

```bash
cd infra
cdk synth
```

### 開発環境へのデプロイ

```bash
cdk deploy --context env=dev
```

### ステージング環境へのデプロイ

```bash
cdk deploy --context env=stg
```

### 本番環境へのデプロイ

```bash
cdk deploy --context env=prod
```

### 承認付きデプロイ

本番デプロイでは、承認を必要とする場合があります：

```bash
cdk deploy --context env=prod --require-approval broadening
```

## デプロイ後の確認

### スタックステータスの確認

```bash
aws cloudformation describe-stacks --stack-name YourStackName-dev
```

### API Gatewayの確認

CloudFormation出力からAPIエンドポイントを取得します：

```bash
aws cloudformation describe-stacks \
  --stack-name YourStackName-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text
```

### ヘルスエンドポイントのテスト

```bash
curl https://your-api-endpoint.execute-api.ap-northeast-1.amazonaws.com/health
```

## マルチ環境戦略

### 環境の分離

複数環境を管理するためのベストプラクティス：

| 項目 | 開発 | ステージング | 本番 |
|------------|-----------------|-------------|----------------|
| AWSアカウント | 共有または専用 | 専用 | 専用 |
| VPC | 共有 | 専用 | 専用 |
| データベース | 共有RDS | 専用RDS | Multi-AZ RDS |
| Lambdaメモリ | 512 MB | 1024 MB | 2048 MB |
| APIスロットリング | 低 | 中 | 高 |

### リソース命名規則

リソースには一貫した命名を使用します：

```
{app-name}-{environment}-{resource-type}
```

例：
- `myapp-dev-api`
- `myapp-dev-dynamodb-command`
- `myapp-prod-lambda-handler`

## ロールバック

### 自動ロールバック

CloudFormationはデプロイが失敗した場合に自動的にロールバックします。手動でロールバックするには：

```bash
aws cloudformation rollback-stack --stack-name YourStackName-dev
```

### 以前のバージョンのデプロイ

以前のバージョンをデプロイするには、Gitで目的のコミットをチェックアウトして再デプロイします：

```bash
git checkout <previous-commit>
cdk deploy --context env=dev
```

## クリーンアップ

### スタックの削除

すべてのリソースを削除するには：

```bash
cdk destroy --context env=dev
```

注意：これによりデータを含むすべてのリソースが削除されます。注意して使用してください。

### 選択的クリーンアップ

一部のリソースには削除保護が設定されている場合があります。削除前に無効化してください：

- 削除保護が設定されたDynamoDBテーブル
- 削除保護が設定されたRDSインスタンス
- S3バケット（先に空にする必要があります）

## 次のステップ

- [CodePipelineによるCI/CD](./codepipeline-cicd) - デプロイを自動化する
- [モニタリングとロギング](./monitoring-logging) - 可観測性をセットアップする
- [トラブルシューティング](./common-issues) - よくあるデプロイの問題
