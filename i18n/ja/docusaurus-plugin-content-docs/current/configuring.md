---
sidebar_position: 9
description: Configuration guide for MBC CQRS Serverless framework including TypeScript, ESLint, and project settings.
---

# 設定

MBC CQRS serverless framework allows you to customize your project to meet specific requirements. This guide covers all configuration options available in the framework.

## Project Configuration

### serverless.yml

The main configuration file for your serverless application.

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

### NestJS Configuration

Configure NestJS modules in your application.

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

## TypeScript Configuration

### tsconfig.json

Recommended TypeScript configuration for MBC CQRS Serverless projects.

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

## ESLint Configuration

### .eslintrc.js

Recommended ESLint configuration.

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

## Module Configuration

### CommandModule Options

Configure the core CommandModule.

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

      // Optional: Skip publishing to data table (for testing)
      skipPublish: false,
    }),
  ],
})
export class OrderModule {}
```

### SequenceModule Options

Configure auto-incrementing sequences.

```typescript
import { Module } from '@nestjs/common';
import { SequenceModule } from '@mbc-cqrs-serverless/sequence';

@Module({
  imports: [
    SequenceModule.register({
      // Optional: Table name (default: 'sequence')
      tableName: 'sequence',

      // Optional: Rotation strategy
      // 'day' - Reset daily (YYYYMMDD prefix)
      // 'month' - Reset monthly (YYYYMM prefix)
      // 'year' - Reset yearly (YYYY prefix)
      // 'none' - Never reset
      rotateBy: 'day',
    }),
  ],
})
export class AppModule {}
```

### TenantModule Options

Configure multi-tenant support.

```typescript
import { Module } from '@nestjs/common';
import { TenantModule } from '@mbc-cqrs-serverless/tenant';

@Module({
  imports: [
    TenantModule.register({
      // Optional: Table name (default: 'tenant')
      tableName: 'tenant',

      // Optional: Common tenant code for shared data
      commonTenantCode: 'common',
    }),
  ],
})
export class AppModule {}
```

### NotificationModule Options

Configure email notifications.

```typescript
import { Module } from '@nestjs/common';
import { NotificationModule } from '@mbc-cqrs-serverless/core';

@Module({
  imports: [
    NotificationModule.register({
      // Required: Default sender email
      fromEmail: 'noreply@example.com',

      // Optional: AWS SES region
      sesRegion: 'ap-northeast-1',

      // Optional: Email template directory
      templateDir: './templates/email',
    }),
  ],
})
export class AppModule {}
```

## Logging Configuration

### Configure Logger

Set up structured logging for production.

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

## Validation Configuration

### Global Validation Pipe

Configure validation for all endpoints.

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

## CORS Configuration

### Configure CORS

Set up Cross-Origin Resource Sharing.

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

## Stage-Specific Configuration

### Environment-Based Settings

Configure different settings per environment.

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

## See Also

```mdx-code-block
import DocCardList from '@theme/DocCardList';

<DocCardList />
```

- [Environment Variables](./environment-variables) - Environment configuration
- [Absolute Imports](./absolute_imports_and_module_path_aliases) - Path aliases
- [Deployment Guide](./deployment-guide) - Deployment configuration
