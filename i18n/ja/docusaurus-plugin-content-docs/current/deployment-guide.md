---
description: MBC CQRS ServerlessアプリケーションをAWSにデプロイする方法を学びます。
---

# デプロイメントガイド

このガイドでは、AWS CDKを使用してMBC CQRS ServerlessアプリケーションをAWSにデプロイする方法を説明します。

## 前提条件 {#prerequisites}

デプロイ前に、以下が準備されていることを確認してください：

- AWS CLIがインストールされ、適切な認証情報で設定されている
- Node.js 20.x 以降
- AWS CDK CLIがインストールされている（`npm install -g aws-cdk`）
- 必要な権限を持つAWSアカウント

## AWSアカウントの準備 {#aws-account-preparation}

### 必要なAWSサービス

アプリケーションは以下のAWSサービスを使用します：

- API Gateway - HTTP APIエンドポイント
- Lambda - サーバーレスコンピューティング
- DynamoDB - NoSQLデータベース
- RDS（MySQL）- リレーショナルデータベース（オプション）
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

## CDK Bootstrap {#cdk-bootstrap}

最初のデプロイ前に、AWSアカウントでCDKをブートストラップします：

```bash
cdk bootstrap aws://YOUR_ACCOUNT_ID/YOUR_REGION
```

例：

```bash
cdk bootstrap aws://123456789012/ap-northeast-1
```

## 環境設定 {#environment-configuration}

### 環境設定の作成

`infra/config/{env}/index.ts` に環境固有の設定ファイルを作成します：

```typescript
// infra/config/dev/index.ts
import { ApplicationLogLevel, SystemLogLevel } from 'aws-cdk-lib/aws-lambda';
import { Config } from '../type';

const config: Config = {
  env: 'dev',
  appName: 'your-app',

  // Domain configuration (ドメイン設定)
  domain: {
    http: 'dev-api.your-domain.com',
    appsync: 'dev-appsync.your-domain.com',
  },

  // Existing Cognito User Pool (optional) (既存のCognito User Pool（オプション）)
  userPoolId: 'ap-northeast-1_xxxxxxx',

  // VPC Configuration (VPC設定)
  vpc: {
    id: 'vpc-xxxxxxxxx',
    subnetIds: ['subnet-xxx1', 'subnet-xxx2'],
    securityGroupIds: ['sg-xxxxxxxxx'],
  },

  // RDS Configuration (RDS設定)
  rds: {
    accountSsmKey: '/your-app/dev/rds/account',
    endpoint: 'your-rds-endpoint.ap-northeast-1.rds.amazonaws.com',
    dbName: 'your_app_dev',
  },

  // Log Level Configuration (ログレベル設定)
  logLevel: {
    lambdaSystem: SystemLogLevel.DEBUG,
    lambdaApplication: ApplicationLogLevel.TRACE,
    level: 'verbose',
  },

  frontBaseUrl: 'https://dev.your-domain.com',
  fromEmailAddress: 'noreply@your-domain.com',

  // WAF Configuration (optional) (WAF設定（オプション）)
  // wafArn: 'arn:aws:wafv2:ap-northeast-1:YOUR_ACCOUNT_ID:regional/webacl/xxx',
};

export default config;
```

### 環境変数

`.env` またはCI/CDパイプラインで環境変数を設定します：

```bash
# AWS 設定
AWS_REGION=ap-northeast-1
AWS_ACCOUNT_ID=123456789012

# アプリケーション設定
APP_NAME=your-app
NODE_ENV=dev

# データベース
DATABASE_URL=mysql://user:password@host:3306/dbname

# Cognito
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxx
COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxx
```

## CDKスタック構造 {#cdk-stack-structure}

典型的なMBC CQRS Serverless CDKプロジェクトは以下の構造を持ちます：

```text
infra/
├── bin/
│   └── infra.ts              # CDKアプリエントリーポイント
├── cdk.json                  # CDK設定
├── config/
│   ├── index.ts              # 設定エクスポートとgetConfig関数
│   ├── type.ts               # 設定型定義
│   ├── constant.ts           # 定数（例：PIPELINE_NAME）
│   ├── dev/
│   │   └── index.ts          # 開発環境設定
│   ├── stg/
│   │   └── index.ts          # ステージング環境設定
│   └── prod/
│       └── index.ts          # 本番環境設定
└── libs/
    ├── infra-stack.ts        # メインインフラストラクチャスタック
    ├── pipeline-stack.ts     # CI/CDパイプラインスタック
    └── pipeline-infra-stage.ts # パイプラインインフラストラクチャステージ
```

## 既知の問題と回避策 {#known-issues}

### レガシー依存関係による npm install エラー

一部のserverless-offlineプラグインには、`npm install` 時にビルドエラーを引き起こす可能性のあるレガシー依存関係があります：

```text
npm error path node_modules/zlib
npm error command sh -c node-waf clean || true; node-waf configure build
npm error sh: node-waf: command not found
```

回避策：`--ignore-scripts` と `--legacy-peer-deps` フラグを使用します：

```bash
npm install --legacy-peer-deps --ignore-scripts
npx prisma generate  # postinstallスクリプトを手動で実行
```

### CDK 環境設定

デフォルトの `infra/bin/infra.ts` テンプレートでは account/region の値が空になっている場合があり、以下のようなエラーが発生することがあります：

```text
Invalid S3 bucket name (value: cdk-hnb659fds-assets--)
```

生成された `infra/bin/infra.ts` ではデフォルトで `account` と `region` が空になっています。明示的に設定するか、CDK 標準の環境変数を使用してください：

```typescript
import * as cdk from 'aws-cdk-lib';

const cdkEnv: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
};
```

CDKコマンドを実行する際、AWSプロファイルがこれらの値を自動的に提供します：

```bash
AWS_PROFILE=your-profile cdk synth
```

## CDKでのデプロイ {#deploying-with-cdk}

### デプロイ対象環境の設定

デプロイする環境は `infra/bin/infra.ts` の `envs` 配列を変更して設定します：

```typescript
// infra/bin/infra.ts
const envs: Env[] = ['dev'];  // Add 'stg' or 'prod' as needed (必要に応じて 'stg' や 'prod' を追加)
```

複数の環境をデプロイするには、配列に追加します：

```typescript
const envs: Env[] = ['dev', 'stg', 'prod'];
```

### CloudFormationテンプレートの合成

まず、CloudFormationテンプレートを合成して設定を確認します：

```bash
cd infra
cdk synth
```

### スタックのデプロイ

設定されたすべての環境スタックをデプロイします：

```bash
cdk deploy --all
```

または特定の環境スタックをデプロイします（利用可能なスタック名を確認するには `cdk ls` を実行してください）：

```bash
cdk ls
cdk deploy dev-your-app-pipeline-stack
```

### 承認付きデプロイ

承認が必要なデプロイの場合：

```bash
cdk deploy --all --require-approval broadening
```

## デプロイ後の確認 {#post-deployment}

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

## マルチ環境戦略 {#multi-environment-strategy}

### 環境の分離

複数環境を管理するためのベストプラクティス：

| 項目 | 開発 | ステージング | 本番 |
|------------|-----------------|-------------|----------------|
| AWSアカウント | 共有または専用 | 専用 | 専用 |
| VPC | 共有 | 専用 | 専用 |
| データベース | 共有RDS | 専用RDS | Multi-AZ RDS |
| ログレベル | verbose/debug | info | warn/error |

### リソース命名規則

リソースには一貫した命名を使用します：

```text
{environment}-{app-name}-{resource-type}
```

例：
- `dev-myapp-api`
- `dev-myapp-dynamodb-command`
- `prod-myapp-lambda-handler`

## ロールバック {#rollback}

### 自動ロールバック

CloudFormationはデプロイが失敗した場合に自動的にロールバックします。手動でロールバックするには：

```bash
aws cloudformation rollback-stack --stack-name YourStackName-dev
```

### 以前のバージョンのデプロイ

以前のバージョンをデプロイするには、Gitで目的のコミットをチェックアウトして再デプロイします：

```bash
git checkout <previous-commit>
cdk deploy --all
```

## クリーンアップ {#cleanup}

### スタックの削除

すべてのリソースを削除するには：

```bash
cdk destroy --all
```

または特定の環境スタックを削除します：

```bash
cdk destroy dev-your-app-pipeline-stack
```

注意：これによりデータを含むすべてのリソースが削除されます。注意して使用してください。

### 選択的クリーンアップ

一部のリソースには削除保護が設定されている場合があります。削除前に無効化してください：

- 削除保護が設定されたDynamoDBテーブル
- 削除保護が設定されたRDSインスタンス
- S3バケット（先に空にする必要があります）

## 関連ドキュメント

- [CodePipelineによるCI/CD](/docs/codepipeline-cicd) - CodePipelineでデプロイを自動化
- [CDKインフラストラクチャ](/docs/architecture/cdk-infrastructure) - AWSインフラストラクチャアーキテクチャの詳細
- [監視とログ](/docs/monitoring-logging) - デプロイ後のオブザーバビリティ設定
- [環境変数](/docs/environment-variables) - デプロイ用の環境設定
- [トラブルシューティング](/docs/common-issues) - よくあるデプロイの問題
