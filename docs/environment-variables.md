---
description: { { Learn how to add and validate your environment variables in your application. } }
---

# {{Environment Variables}}

{{MBC CQRS serverless framework comes with built-in support for environment variables, which allows you to do the following:}}

- {{Use `.env` to load environment variables}}
- {{Validate environment variables}}

## Loading Environment Variables

{{MBC CQRS serverless framework has built-in support for loading environment variables from `.env*` files into `process.env.`}}

```
TODO:
# AWS_PROFILE
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
AWS_DEFAULT_REGION=ap-northeast-1
# running environment
# local, dev, stg, prod
NODE_ENV=local
# NODE_ENV=dev
# name of application
# APP_NAME=suisss-recruit
APP_NAME=demo
# APP_NAME=cqrs
# set log levels
LOG_LEVEL=info # debug, info, warn, error, verbose
# disable event route for API GW integration
EVENT_SOURCE_DISABLED=false
# DynamoDB endpoint, useful for local development
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_REGION=ap-northeast-1
# set the limit size for `attributes` of object in DDB
ATTRIBUTE_LIMIT_SIZE=389120 # bytes, refer to https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html#limits-attributes
# S3 endpoint, useful for local development
S3_ENDPOINT=http://localhost:4566
S3_REGION=ap-northeast-1
# save DDB attributes
S3_BUCKET_NAME=local-bucket
# Step Function endpoint, useful for local development
SFN_ENDPOINT=http://localhost:8083
SFN_REGION=ap-northeast-1
SFN_COMMAND_ARN=arn:aws:states:ap-northeast-1:101010101010:stateMachine:command
# SNS endpoint, useful for local development
SNS_ENDPOINT=http://localhost:4002
SNS_REGION=ap-northeast-1
SNS_TOPIC_ARN=arn:aws:sns:ap-northeast-1:101010101010:MySnsTopic
# Cognito endpoint, useful for local development
COGNITO_URL=http://localhost:9229
COGNITO_USER_POOL_ID=local_2G7noHgW
COGNITO_USER_POLL_CLIENT_ID=dnk8y7ii3wled35p3lw0l2cd7
COGNITO_REGION=ap-northeast-1
# AppSync endpoint, useful for local development
APPSYNC_ENDPOINT=http://localhost:4001/graphql
APPSYNC_API_KEY=da2-fakeApiId123456
# SES email endpoint, useful for local development
SES_ENDPOINT=http://localhost:8005
SES_REGION=ap-northeast-1
SES_FROM_EMAIL=email@example.com

# This was inserted by `prisma init`:
# Environment variables declared in this file are automatically made available to Prisma.
# See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema

# Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.
# See the documentation for all the connection string options: https://pris.ly/d/connection-strings

DATABASE_URL="mysql://root:RootCqrs@localhost:3306/cqrs?schema=public&connection_limit=1"
```

## Validate Environment Variables

{{It is standard practice to throw an exception during application startup if required environment variables haven't been provided or if they don't meet certain validation rules. The `@mbc-cqrs-serverless/core` package makes this easy to do.}}

{{First, we have to define:}}

- {{a class with validation constraints,}}
- {{extend the EnvironmentVariables class.}}

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

{{With this in place, you pass the `EnvValidation` class as a configuration argument of the `createHandler` function, as follows:}}

```ts
import { createHandler } from "@mbc-cqrs-serverless/core";

import { EnvValidation } from "./env.validation";
import { MainModule } from "./main.module";

export const handler = createHandler({
  rootModule: MainModule,
  envCls: EnvValidation,
});
```
