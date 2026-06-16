---
description: Learn how to add and validate your environment variables in your application.
---

# Environment Variables

MBC CQRS Serverless framework comes with built-in support for environment variables, which allows you to do the following:

- Use `.env` to load environment variables
- Validate environment variables

## Loading Environment Variables {#loading-env-vars}

MBC CQRS Serverless framework has built-in support for loading environment variables from `.env*` files into `process.env.`

:::info Core vs Application Variables
The environment variables listed below are categorized into two types:

- **Core Variables**: Variables validated by the framework's base `EnvironmentVariables` class. These are essential for the framework to function.
- **Application Variables**: Variables that your application may need based on which features you use. Add validation for these in your custom `EnvValidation` class.

The "Required" column indicates the general expectation for typical applications. You should add validation rules for all variables your specific application depends on.
:::

### Core Configuration

| Variable | Description | Required | Default | Example |
|-------------|-----------------|--------------|-------------|-------------|
| `NODE_ENV` | Running environment: local, dev, stg, prod | Yes | - | `local` |
| `APP_NAME` | Application name used for table prefixes | Yes | - | `demo` |
| `APP_PORT` | Application port for non-Lambda environments | No | `3000` | `3000` |
| `IS_OFFLINE` | Set to `true` automatically by serverless-offline when running locally. The framework uses this flag to detect local development and skip production-only behaviors. | No | `false` | `true` |
| `LOG_LEVEL` | Log level: debug, verbose, info, warn, error, fatal | Yes | - | `verbose` |
| `EVENT_SOURCE_DISABLED` | Disable event source route for API Gateway integration | Yes | - | `false` |
| `REQUEST_BODY_SIZE_LIMIT` | Request body size limit for JSON and URL-encoded data | No | `100kb` | `100kb` |

### Multi-Tenancy Configuration

| Variable | Description | Required | Default | Example |
|-------------|-----------------|--------------|-------------|-------------|
| `COMMON_TENANT_CODES` | Comma-separated list of tenant codes treated as common/shared across tenants | No | `common` | `common,shared,public` |
| `CROSS_TENANT_ROLES` | Comma-separated list of roles granted cross-tenant access | No | `system_admin` | `system_admin,general_manager` |

### Read-Your-Writes (RYW) Configuration {#ryw-session-configuration}

| Variable | Description | Required | Default | Example |
|-------------|-----------------|--------------|-------------|-------------|
| `RYW_SESSION_TTL_MINUTES` | Time-to-live in minutes for Read-Your-Writes session records. Leave unset or set to a non-positive value to disable RYW session writes | No | - | `15` |

### AWS Credentials

| Variable | Description | Required | Example |
|-------------|-----------------|--------------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key ID for local development | No | `local` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key for local development | No | `local` |
| `AWS_REGION` | Default AWS region | No | `ap-northeast-1` |

### DynamoDB Configuration

| Variable | Description | Required | Example |
|-------------|-----------------|--------------|-------------|
| `DYNAMODB_ENDPOINT` | DynamoDB endpoint URL for local development | No | `http://localhost:8000` |
| `DYNAMODB_REGION` | DynamoDB region | No | `ap-northeast-1` |
| `ATTRIBUTE_LIMIT_SIZE` | Maximum size in bytes for DynamoDB item attributes | Yes | `389120` |

### S3 Configuration

| Variable | Description | Required | Example |
|-------------|-----------------|--------------|-------------|
| `S3_ENDPOINT` | S3 endpoint URL for local development | No | `http://localhost:4566` |
| `S3_REGION` | S3 region | No | `ap-northeast-1` |
| `S3_BUCKET_NAME` | S3 bucket name for storing large DynamoDB attributes | Yes | `local-bucket` |

### Step Functions Configuration

| Variable | Description | Required | Example |
|-------------|-----------------|--------------|-------------|
| `SFN_ENDPOINT` | Step Functions endpoint URL for local development | No | `http://localhost:8083` |
| `SFN_REGION` | Step Functions region | No | `ap-northeast-1` |
| `SFN_COMMAND_ARN` | Step Functions state machine ARN for command processing | Yes | `arn:aws:states:ap-northeast-1:101010101010:stateMachine:command` |

### SNS Configuration

| Variable | Description | Required | Example |
|-------------|-----------------|--------------|-------------|
| `SNS_ENDPOINT` | SNS endpoint URL for local development | No | `http://localhost:4002` |
| `SNS_REGION` | SNS region | No | `ap-northeast-1` |
| `SNS_TOPIC_ARN` | Default SNS topic ARN for event notifications | No | `arn:aws:sns:ap-northeast-1:101010101010:CqrsSnsTopic` |
| `SNS_ALARM_TOPIC_ARN` | SNS topic ARN for alarm notifications (error alerts) | No | `arn:aws:sns:ap-northeast-1:101010101010:AlarmSnsTopic` |

### SQS Configuration

| Variable | Description | Required | Example |
|-------------|-----------------|--------------|-------------|
| `SQS_ENDPOINT` | SQS endpoint URL for local development | No | `http://localhost:9324` |
| `SQS_REGION` | SQS region | No | `ap-northeast-1` |

### Cognito Configuration

| Variable | Description | Required | Example |
|-------------|-----------------|--------------|-------------|
| `COGNITO_URL` | Cognito endpoint URL for local development | No | `http://localhost:9229` |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID | Yes | `local_2G7noHgW` |
| `COGNITO_USER_POOL_CLIENT_ID` | Cognito User Pool Client ID | Yes | `dnk8y7ii3wled35p3lw0l2cd7` |
| `COGNITO_REGION` | Cognito region | No | `ap-northeast-1` |

### AppSync Configuration

#### AppSync GraphQL Subscription (existing)

| Variable | Description | Required | Example |
|-------------|-----------------|--------------|-------------|
| `APPSYNC_ENDPOINT` | AppSync GraphQL endpoint URL | No | `http://localhost:4001/graphql` |
| `APPSYNC_API_KEY` | AppSync API key for local development | No | `da2-fakeApiId123456` |

#### AppSync Events API (opt-in) {#appsync-events-env}

Set `NOTIFICATION_TRANSPORTS=appsync-event` (or `appsync-graphql,appsync-event` for dual-publish) to activate the AppSync Events API transport. See [AppSyncEventsService](/docs/notification-module#appsync-events-service) for details.

| Variable | Description | Required | Default | Example |
|-------------|-----------------|--------------|-------------|-------------|
| `NOTIFICATION_TRANSPORTS` | Comma-separated list of active transports. Built-ins: `appsync-graphql`, `appsync-event` | No | `appsync-graphql` | `appsync-event` |
| `APPSYNC_EVENTS_ENDPOINT` | AppSync Events API HTTP endpoint URL | When `appsync-event` is active | - | `https://xxxx.appsync-api.ap-northeast-1.amazonaws.com/event` |
| `APPSYNC_EVENTS_NAMESPACE` | Channel namespace name — must match a pre-created namespace in your AppSync Event API | No | `default` | `notifications` |

### SES Email Configuration

| Variable | Description | Required | Example |
|-------------|-----------------|--------------|-------------|
| `SES_ENDPOINT` | SES endpoint URL for local development | No | `http://localhost:8005` |
| `SES_REGION` | SES region | No | `ap-northeast-1` |
| `SES_FROM_EMAIL` | Default sender email address | Yes | `email@example.com` |

### Database Configuration (Prisma)

| Variable | Description | Required | Example |
|-------------|-----------------|--------------|-------------|
| `DATABASE_URL` | Database connection URL for Prisma ORM | No | `mysql://root:RootCqrs@localhost:3306/cqrs` |

### Example .env file

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
AWS_REGION=ap-northeast-1

# Core Configuration
NODE_ENV=local
APP_NAME=demo
APP_PORT=3000
LOG_LEVEL=verbose
EVENT_SOURCE_DISABLED=false
REQUEST_BODY_SIZE_LIMIT=100kb

# Multi-Tenancy Configuration
# COMMON_TENANT_CODES=common
# CROSS_TENANT_ROLES=system_admin

# Read-Your-Writes (RYW) Configuration
# RYW_SESSION_TTL_MINUTES=15

# DynamoDB Configuration
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_REGION=ap-northeast-1
ATTRIBUTE_LIMIT_SIZE=389120

# S3 Configuration
S3_ENDPOINT=http://localhost:4566
S3_REGION=ap-northeast-1
S3_BUCKET_NAME=local-bucket

# Step Functions Configuration
SFN_ENDPOINT=http://localhost:8083
SFN_REGION=ap-northeast-1
SFN_COMMAND_ARN=arn:aws:states:ap-northeast-1:101010101010:stateMachine:command

# SNS Configuration
SNS_ENDPOINT=http://localhost:4002
SNS_REGION=ap-northeast-1
SNS_TOPIC_ARN=arn:aws:sns:ap-northeast-1:101010101010:CqrsSnsTopic
SNS_ALARM_TOPIC_ARN=arn:aws:sns:ap-northeast-1:101010101010:AlarmSnsTopic

# SQS Configuration
SQS_ENDPOINT=http://localhost:9324
SQS_REGION=ap-northeast-1

# Cognito Configuration
COGNITO_URL=http://localhost:9229
COGNITO_USER_POOL_ID=local_2G7noHgW
COGNITO_USER_POOL_CLIENT_ID=dnk8y7ii3wled35p3lw0l2cd7
COGNITO_REGION=ap-northeast-1

# AppSync Configuration
APPSYNC_ENDPOINT=http://localhost:4001/graphql
APPSYNC_API_KEY=da2-fakeApiId123456
# AppSync Events API (optional — set NOTIFICATION_TRANSPORTS=appsync-event to activate)
# NOTIFICATION_TRANSPORTS=appsync-event
# APPSYNC_EVENTS_ENDPOINT=https://xxxx.appsync-api.ap-northeast-1.amazonaws.com/event
# APPSYNC_EVENTS_NAMESPACE=default

# SES Configuration
SES_ENDPOINT=http://localhost:8005
SES_REGION=ap-northeast-1
SES_FROM_EMAIL=email@example.com

# Database Configuration
DATABASE_URL="mysql://root:RootCqrs@localhost:3306/cqrs"
```

## Validate Environment Variables {#validate-env-vars}

It is standard practice to throw an exception during application startup if required environment variables haven't been provided or if they don't meet certain validation rules. The `@mbc-cqrs-serverless/core` package makes this easy to do.

First, we have to define:

- a class with validation constraints,
- extend the EnvironmentVariables class.

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

With this in place, you pass the `EnvValidation` class as a configuration argument of the `createHandler` function, as follows:

```ts
import { createHandler } from "@mbc-cqrs-serverless/core";

import { EnvValidation } from "./env.validation";
import { MainModule } from "./main.module";

export const handler = createHandler({
  rootModule: MainModule,
  envCls: EnvValidation,
});
```


## Related Documentation

- [Configuring](/docs/configuring) - Module-level configuration options
- [Queue Module](/docs/queue) - SNS and SQS usage
- [Notification Module](/docs/notification-module) - SES and AppSync Events configuration
- [Directory](/docs/directory) - S3 file and folder management with presigned URLs
- [Deployment Guide](/docs/deployment-guide) - Deployment environment setup
- [Security Best Practices](/docs/security-best-practices) - Secure handling of credentials and secrets
- [Installation](/docs/installation) - Initial environment setup
