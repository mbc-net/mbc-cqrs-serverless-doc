---
description: 15分で最初のMBC CQRS Serverlessアプリケーションを構築します。
---

# クイックスタートチュートリアル

このチュートリアルでは、最初のMBC CQRS Serverlessアプリケーションの作成方法を説明します。完了時には、ローカルで動作するAPIが完成します。

## 前提条件

開始する前に、以下がインストールされていることを確認してください：

- Node.js 20.x 以降
- Docker と Docker Compose
- AWS CLI（ローカル開発では実際のクレデンシャルは不要です — `.env`ファイルに`AWS_ACCESS_KEY_ID=local`と`AWS_SECRET_ACCESS_KEY=local`を設定してください）
- Git

## ステップ1: 新規プロジェクトの作成

MBC CQRS CLIを使用して新しいプロジェクトをスキャフォールドします：

```bash
npx @mbc-cqrs-serverless/cli new my-app
cd my-app
```

CLIは以下の構造でプロジェクトを作成します：

```
my-app/
├── src/
│   ├── main.ts
│   ├── main.module.ts
│   └── ...
├── infra-local/
│   ├── docker-compose.yml
│   └── serverless.yml
├── prisma/
│   └── schema.prisma
├── package.json
└── ...
```

## ステップ2: 依存関係のインストール

```bash
npm install
```

TypeScriptアプリケーションをビルドします（サーバー起動前に必要）：

```bash
npm run build
```

## ステップ3: ローカルインフラの起動

Docker Composeを使用してローカル開発環境を起動します：

```bash
npm run offline:docker
```

以下のサービスが起動します：

- DynamoDB Local（ポート8000）
- MySQL（ポート3306）
- AWSサービス用のLocalStack

## ステップ4: データベースの初期化

Prismaマイグレーションを実行してデータベーススキーマをセットアップします：

```bash
npm run migrate
```

## ステップ5: 開発サーバーの起動

新しいターミナルで、Serverless Offlineサーバーを起動します：

```bash
npm run offline:sls
```

APIは `http://localhost:3000` で実行されています。

## ステップ6: APIのテスト

ブラウザでSwagger UIを開いてAPIを確認・テストしてください：

```
http://localhost:3000/swagger-ui/
```

Swagger UIが表示され、利用可能なエンドポイントが一覧表示されます。

## 最初のエンドポイントの作成

シンプルな「Hello World」エンドポイントを作成しましょう。

### コントローラーの作成

`src/hello/hello.controller.ts` を新規作成します：

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('hello')
export class HelloController {
  @Get()
  getHello(): string {
    return 'Hello, MBC CQRS Serverless!';
  }
}
```

### モジュールの作成

`src/hello/hello.module.ts` を新規作成します：

```typescript
import { Module } from '@nestjs/common';
import { HelloController } from './hello.controller';

@Module({
  controllers: [HelloController],
})
export class HelloModule {}
```

### モジュールの登録

`src/main.module.ts` のメインモジュールにHelloModuleを追加します：

```typescript
import { Module } from '@nestjs/common';
import { HelloModule } from './hello/hello.module';

@Module({
  imports: [
    // ... existing imports
    HelloModule,
  ],
})
export class MainModule {}
```

### 新しいエンドポイントのテスト

サーバーを再起動して新しいエンドポイントをテストします：

```bash
curl http://localhost:3000/hello
```

`Hello, MBC CQRS Serverless!` と表示されます。

## 次のステップ

おめでとうございます！最初のMBC CQRS Serverlessアプリケーションが完成しました。次に探索すべき内容：

- [Todoアプリの構築](/docs/build-todo-app) - 完全なアプリケーションを構築してCQRSパターンを学ぶ
- [コアコンセプト](/docs/architecture) - CQRSとイベントソーシングアーキテクチャを理解する
- [デプロイメントガイド](/docs/deployment-guide) - アプリケーションをAWSにデプロイする

## よく使うコマンド

| コマンド | 説明 |
|-------------|-----------------|
| `npm run offline:docker` | ローカルDockerサービスを起動 |
| `npm run offline:sls` | Serverless Offlineを起動 |
| `npm run migrate` | データベースマイグレーションを実行 |
| `npm run build` | アプリケーションをビルド |
| `npm run test` | ユニットテストを実行 |
| `npm run test:e2e` | E2Eテストを実行 |

## トラブルシューティング

### Dockerサービスが起動しない

Dockerが実行中で、十分なリソースが割り当てられていることを確認してください。以下を試してください：

```bash
docker-compose -f infra-local/docker-compose.yml down
docker-compose -f infra-local/docker-compose.yml up -d
```

### データベース接続エラー

MySQLが完全に起動するまで数秒待ってから、再度マイグレーションを実行してください：

```bash
npm run migrate
```

### ポートの競合

ポート3000、3306、8000が使用中の場合は、競合するサービスを停止するか、`docker-compose.yml`でポート設定を変更してください。


## 関連ドキュメント

- [Todoアプリを作る](/docs/build-todo-app) - より完全なCQRSパターン例
- [バックエンド開発](/docs/backend-development) - バックエンドパターンの詳細
- [サービスパターン](/docs/service-patterns) - 完全なCRUDサービスパターン
- [コマンドサービス](/docs/command-service) - CommandService APIリファレンス
