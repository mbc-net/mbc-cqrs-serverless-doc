---
sidebar_position: 9
description: TypeScript、ESLint、プロジェクト設定を含むMBC CQRS Serverlessフレームワークの設定ガイド。
---

# 設定

MBC CQRS サーバーレスフレームワークでは、特定の要件に合わせてプロジェクトをカスタマイズできます。このガイドでは、フレームワークで利用可能なすべての設定オプションについて説明します。

## プロジェクト設定 {#project-configuration}

### serverless.yml

サーバーレスアプリケーションのメイン設定ファイルです。

:::info テーブルプレフィックス
フレームワークは `NODE_ENV` と `APP_NAME` 環境変数にタイプサフィックスを付加してDynamoDBテーブル名を自動生成します。コマンドテーブルは `{NODE_ENV}-{APP_NAME}-{tableName}-command`、データテーブルは `{NODE_ENV}-{APP_NAME}-{tableName}-data` の形式になります。例えば、`NODE_ENV=dev`、`APP_NAME=my-app`、`tableName: 'order'` の場合、テーブル名は `dev-my-app-order-command` と `dev-my-app-order-data` になります。
:::

```yaml
service: my-app

frameworkVersion: '3'

plugins:
  - serverless-offline
  - serverless-dynamodb

provider:
  name: aws
  runtime: nodejs20.x
  stage: ${opt:stage, 'dev'}
  region: ${opt:region, 'ap-northeast-1'}
  memorySize: 512
  timeout: 30

  environment:
    NODE_ENV: ${self:provider.stage}
    APP_NAME: ${self:service}
    COGNITO_USER_POOL_ID: ${env:COGNITO_USER_POOL_ID}
    COGNITO_USER_POOL_CLIENT_ID: ${env:COGNITO_USER_POOL_CLIENT_ID}

  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:Scan
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
          Resource:
            - "arn:aws:dynamodb:${self:provider.region}:*:table/${self:provider.stage}-${self:service}-*"

custom:
  serverless-offline:
    httpPort: 3000
    lambdaPort: 3002

  serverless-dynamodb:
    stages:
      - dev
    start:
      port: 8000
      inMemory: true
      migrate: false
```

### NestJS設定

アプリケーションでNestJSモジュールを設定します。

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommandModule } from '@mbc-cqrs-serverless/core';

@Module({
  imports: [
    // Load environment variables (環境変数をロード)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Configure Command Module (Commandモジュールを設定)
    CommandModule.register({
      tableName: 'order', // 論理名。実際のテーブル名: {NODE_ENV}-{APP_NAME}-order-command
      dataSyncHandlers: [],
    }),
  ],
})
export class AppModule {}
```

## TypeScript設定 {#typescript-configuration}

### tsconfig.json

MBC CQRS Serverlessプロジェクト向けの推奨TypeScript設定。

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "lib": ["ES2021"],
    "declaration": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": false,
    "inlineSourceMap": true,
    "inlineSources": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["src/shared/*"]
    },
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## ESLint設定 {#eslint-configuration}

### .eslintrc.js

推奨ESLint設定。

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
```

## モジュール設定 {#module-configuration}

### CommandModuleオプション

コアCommandModuleを設定します。

```typescript
import { Module } from '@nestjs/common';
import { CommandModule } from '@mbc-cqrs-serverless/core';
import { OrderRdsSyncHandler } from './order-rds-sync.handler'; // Your IDataSyncHandler implementation — see service-patterns (IDataSyncHandlerの実装 — service-patternsを参照)

@Module({
  imports: [
    CommandModule.register({
      // Required: DynamoDB table name (必須: DynamoDBテーブル名)
      tableName: 'order',

      // Optional: Data sync handlers for RDS synchronization (オプション: RDS同期用データ同期ハンドラー)
      dataSyncHandlers: [OrderRdsSyncHandler],

      // Optional: Reserved for future use (not yet implemented) (オプション: 将来使用予定（未実装）)
      skipError: false,

      // Optional: Disable default DynamoDB data sync handler (オプション: デフォルトDynamoDBデータ同期ハンドラーを無効化)
      disableDefaultHandler: false,
    }),
  ],
})
export class OrderModule {}
```

### SequencesModuleオプション

自動インクリメントシーケンスを設定します。

```typescript
import { Module } from '@nestjs/common';
import { SequencesModule } from '@mbc-cqrs-serverless/sequence';

@Module({
  imports: [
    SequencesModule.register({
      // Optional: Enable or disable default sequence controller (オプション: デフォルトシーケンスコントローラーを有効/無効化)
      enableController: true,
    }),
  ],
})
export class AppModule {}
```

注: ローテーション戦略（day、month、year、fiscal_yearly、none）はマスターデータ設定で設定され、モジュールオプションではありません。詳細は[シーケンスドキュメント](/docs/sequence)を参照してください。

### TenantModuleオプション

マルチテナントサポートを設定します。

```typescript
import { Module } from '@nestjs/common';
import { TenantModule } from '@mbc-cqrs-serverless/tenant';
import { TenantRdsSyncHandler } from './tenant-rds-sync.handler'; // Your IDataSyncHandler implementation — see service-patterns (IDataSyncHandlerの実装 — service-patternsを参照)

@Module({
  imports: [
    TenantModule.register({
      // Optional: Enable or disable default tenant controller (オプション: デフォルトテナントコントローラーを有効/無効化)
      enableController: true,

      // Optional: Data sync handlers for RDS synchronization (オプション: RDS同期用データ同期ハンドラー)
      dataSyncHandlers: [TenantRdsSyncHandler],
    }),
  ],
})
export class AppModule {}
```

### NotificationModule

環境変数を使用してメール通知を設定します。

```typescript
import { Module } from '@nestjs/common';
import { NotificationModule } from '@mbc-cqrs-serverless/core';

@Module({
  imports: [
    // NotificationModule is a global module - just import it (NotificationModuleはグローバルモジュール - インポートするだけで使用可能)
    NotificationModule,
  ],
})
export class AppModule {}
```

NotificationModuleは環境変数で設定されます：

```bash
# 必須: デフォルト送信者メールアドレス
SES_FROM_EMAIL=noreply@example.com

# 任意: AWS SES エンドポイント（ローカル開発用）
SES_ENDPOINT=http://localhost:4566

# 任意: AWS SES リージョン
SES_REGION=ap-northeast-1
```

## ログ設定 {#logging-configuration}

### ロガーの設定

本番環境向けの構造化ログを設定します。

```typescript
import { Injectable, Logger } from '@nestjs/common';

// Configure log level based on environment (環境に基づいてログレベルを設定)
const LOG_LEVELS = {
  production: ['error', 'warn', 'log'],
  development: ['error', 'warn', 'log', 'debug', 'verbose'],
  test: ['error', 'warn'],
};

// In main.ts or bootstrap (main.tsまたはbootstrapで設定)
const app = await NestFactory.create(AppModule, {
  logger: LOG_LEVELS[process.env.NODE_ENV] || LOG_LEVELS.development,
});

// Structured logging in services (サービス内の構造化ログ)
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    this.logger.log({
      message: 'Creating order',
      code: dto.code,
      tenantCode: dto.tenantCode,
    });

    // ... implementation
  }
}
```

## バリデーション設定 {#validation-configuration}

### グローバルバリデーションパイプ

すべてのエンドポイントのバリデーションを設定します。

```typescript
import { BadRequestException, ValidationPipe } from '@nestjs/common';

// In main.ts or bootstrap (main.tsまたはbootstrapで設定)
app.useGlobalPipes(
  new ValidationPipe({
    // Transform payloads to DTO instances (ペイロードをDTOインスタンスに変換)
    transform: true,

    // Strip properties not in DTO (DTOにないプロパティを除去)
    whitelist: true,

    // Throw error for extra properties (余分なプロパティでエラーをスロー)
    forbidNonWhitelisted: true,

    // Transform primitive types (プリミティブ型を変換)
    transformOptions: {
      enableImplicitConversion: true,
    },

    // Custom error messages (カスタムエラーメッセージ)
    exceptionFactory: (errors) => {
      const messages = errors.map(error => ({
        field: error.property,
        errors: Object.values(error.constraints || {}),
      }));
      return new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    },
  }),
);
```

## CORS設定 {#cors-configuration}

### CORSの設定

クロスオリジンリソース共有を設定します。

```typescript
// In main.ts
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  credentials: true,
  maxAge: 3600,
});
```

## ステージ固有の設定 {#stage-specific-configuration}

### 環境ベースの設定

環境ごとに異なる設定を行います。

```typescript
// config/configuration.ts
export default () => ({
  stage: process.env.STAGE || 'dev',

  database: {
    tablePrefix: `myapp-${process.env.STAGE}`,
    commandTable: `myapp-${process.env.STAGE}-command`,
    dataTable: `myapp-${process.env.STAGE}-data`,
  },

  aws: {
    region: process.env.AWS_REGION || 'ap-northeast-1',
    dynamodbEndpoint: process.env.DYNAMODB_ENDPOINT, // ローカル開発用
  },

  auth: {
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    clientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
  },

  features: {
    enableDebugLogs: process.env.STAGE === 'dev',
    enableMetrics: process.env.STAGE === 'prod',
  },
});

// 使用例
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getTableName(): string {
    return this.configService.get<string>('database.commandTable');
  }
}
```

## 関連ドキュメント

- [環境変数](/docs/environment-variables) - 利用可能な全環境変数
- [モジュール](/docs/modules) - モジュールの設定と登録
- [コマンドサービス](/docs/command-service) - CommandModuleの動作とオプション
- [シーケンス](/docs/sequence) - 自動インクリメントID用SequencesModule
- [テナントモジュール](/docs/tenant) - TenantModuleの設定
- [通知モジュール](/docs/notification-module) - メールおよびリアルタイム通知の設定
- [デプロイガイド](/docs/deployment-guide) - 本番環境の設定
