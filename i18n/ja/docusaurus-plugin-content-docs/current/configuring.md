---
sidebar_position: 9
description: TypeScript、ESLint、プロジェクト設定を含むMBC CQRS Serverlessフレームワークの設定ガイド。
---

# 設定

MBC CQRS サーバーレスフレームワークでは、特定の要件に合わせてプロジェクトをカスタマイズできます。このガイドでは、フレームワークで利用可能なすべての設定オプションについて説明します。

## プロジェクト設定

### serverless.yml

サーバーレスアプリケーションのメイン設定ファイルです。

```yaml
service: my-app

frameworkVersion: '3'

plugins:
  - serverless-offline
  - serverless-plugin-typescript
  - serverless-dynamodb-local

provider:
  name: aws
  runtime: nodejs18.x
  stage: ${opt:stage, 'dev'}
  region: ${opt:region, 'ap-northeast-1'}
  memorySize: 512
  timeout: 30

  environment:
    NODE_ENV: ${self:provider.stage}
    DYNAMODB_TABLE_PREFIX: ${self:service}-${self:provider.stage}
    COGNITO_USER_POOL_ID: ${env:COGNITO_USER_POOL_ID}
    COGNITO_CLIENT_ID: ${env:COGNITO_CLIENT_ID}

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
            - !GetAtt CommandTable.Arn
            - !GetAtt DataTable.Arn

custom:
  serverless-offline:
    httpPort: 3000
    lambdaPort: 3002

  dynamodb:
    stages:
      - dev
    start:
      port: 8000
      inMemory: true
      migrate: true
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
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Configure Command Module
    CommandModule.register({
      tableName: process.env.DYNAMODB_TABLE_NAME,
      dataSyncHandlers: [],
    }),
  ],
})
export class AppModule {}
```

## TypeScript設定

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

## ESLint設定

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

## モジュール設定

### CommandModuleオプション

コアCommandModuleを設定します。

```typescript
import { Module } from '@nestjs/common';
import { CommandModule } from '@mbc-cqrs-serverless/core';

@Module({
  imports: [
    CommandModule.register({
      // Required: DynamoDB table name
      tableName: 'order',

      // Optional: Data sync handlers for RDS synchronization
      dataSyncHandlers: [OrderRdsSyncHandler],

      // Optional: Skip errors from previous command versions
      skipError: false,

      // Optional: Disable default data sync handler
      disableDefaultHandler: false,
    }),
  ],
})
export class OrderModule {}
```

### SequenceModuleオプション

自動インクリメントシーケンスを設定します。

```typescript
import { Module } from '@nestjs/common';
import { SequenceModule } from '@mbc-cqrs-serverless/sequence';

@Module({
  imports: [
    SequenceModule.register({
      // Optional: Enable or disable default sequence controller
      enableController: true,
    }),
  ],
})
export class AppModule {}
```

注: ローテーション戦略（day、month、year、fiscal_yearly、none）はマスターデータ設定で設定され、モジュールオプションではありません。詳細は[シーケンスドキュメント](./sequence)を参照してください。

### TenantModuleオプション

マルチテナントサポートを設定します。

```typescript
import { Module } from '@nestjs/common';
import { TenantModule } from '@mbc-cqrs-serverless/tenant';

@Module({
  imports: [
    TenantModule.register({
      // Optional: Enable or disable default tenant controller
      enableController: true,

      // Optional: Data sync handlers for RDS synchronization
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
    // NotificationModule is a global module - just import it
    NotificationModule,
  ],
})
export class AppModule {}
```

NotificationModuleは環境変数で設定されます：

```bash
# Required: Default sender email address
SES_FROM_EMAIL=noreply@example.com

# Optional: AWS SES endpoint (for local development)
SES_ENDPOINT=http://localhost:4566

# Optional: AWS SES region
SES_REGION=ap-northeast-1
```

## ログ設定

### ロガーの設定

本番環境向けの構造化ログを設定します。

```typescript
import { Logger } from '@nestjs/common';

// Configure log level based on environment
const LOG_LEVELS = {
  production: ['error', 'warn', 'log'],
  development: ['error', 'warn', 'log', 'debug', 'verbose'],
  test: ['error', 'warn'],
};

// In main.ts or bootstrap
const app = await NestFactory.create(AppModule, {
  logger: LOG_LEVELS[process.env.NODE_ENV] || LOG_LEVELS.development,
});

// Structured logging in services
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

## バリデーション設定

### グローバルバリデーションパイプ

すべてのエンドポイントのバリデーションを設定します。

```typescript
import { ValidationPipe } from '@nestjs/common';

// In main.ts or bootstrap
app.useGlobalPipes(
  new ValidationPipe({
    // Transform payloads to DTO instances
    transform: true,

    // Strip properties not in DTO
    whitelist: true,

    // Throw error for extra properties
    forbidNonWhitelisted: true,

    // Transform primitive types
    transformOptions: {
      enableImplicitConversion: true,
    },

    // Custom error messages
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

## CORS設定

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

## ステージ固有の設定

### 環境ベースの設定

環境ごとに異なる設定を設定します。

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
    dynamodbEndpoint: process.env.DYNAMODB_ENDPOINT, // For local dev
  },

  auth: {
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    clientId: process.env.COGNITO_CLIENT_ID,
  },

  features: {
    enableDebugLogs: process.env.STAGE === 'dev',
    enableMetrics: process.env.STAGE === 'prod',
  },
});

// Usage
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getTableName(): string {
    return this.configService.get<string>('database.commandTable');
  }
}
```

## 関連情報

```mdx-code-block
import DocCardList from '@theme/DocCardList';

<DocCardList />
```

- [環境変数](./environment-variables) - 環境設定
- [絶対インポート](./absolute_imports_and_module_path_aliases) - パスエイリアス
- [デプロイガイド](./deployment-guide) - デプロイ設定
