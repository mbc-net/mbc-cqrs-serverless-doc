---
description: {{description}}
---

# {{title}}

{{intro_text}}

- {{step_1}}
- {{step_2}}
- {{step_3}}
- {{step_4}}
- {{step_5}}

{{scaffolds_intro}}

- {{scaffold_1}}
- {{scaffold_2}}
- {{scaffold_3}}
- {{scaffold_4}}

```ts
import 'aws-sdk-client-mock-jest'
import serverlessExpress from '@codegenie/serverless-express'
import { AppModule } from '@mbc-cqrs-severless/core'
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PrismockClient } from 'prismock'
import { EnvValidation } from 'src/env.validation'
import { MainModule } from 'src/main.module'
import { PrismaService } from 'src/prisma'
import { readEventData } from 'test/lib/utils'
import { TableName } from 'test/step/unit/ddbTableName'
import { deleteDdbTable } from 'test/step/unit/delete-ddb-table'
import { createDdbTable } from 'test/step/unit/init-ddb-table'
import { mockClient } from 'aws-sdk-client-mock'
import { SESv2Client } from '@aws-sdk/client-sesv2'
import { SNSClient } from '@aws-sdk/client-sns'

describe('Register tentative company - STEP 1', () => {
  const prismock = new PrismockClient()
  let app: INestApplication
  let serverlessExpressInstance

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppModule.forRoot({
          rootModule: MainModule,
          envCls: EnvValidation,
        }),
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismock)
      .compile()

    app = moduleRef.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    )
    await app.init()

    const expressApp = app.getHttpAdapter().getInstance()
    serverlessExpressInstance = serverlessExpress({
      app: expressApp,
      eventSourceRoutes: {
        AWS_SNS: '/event/sns',
        AWS_SQS: '/event/sqs',
        AWS_DYNAMODB: '/event/dynamodb',
        AWS_EVENTBRIDGE: '/event/event-bridge',
        AWS_STEP_FUNCTIONS: '/event/step-functions',
        AWS_S3: '/event/s3',
        AWS_KINESIS_DATA_STREAM: '/event/kinesis-data-stream',
      },
    })

    // TODO: 1. create data/table
  })

  test('', async () => {
    // Arrange
    // TODO: 2. read event

    // Action
    const response = await serverlessExpressInstance(event)

    // Assert
    // TODO: 3. assert result
  })

  afterEach(async () => {
    await app.close()
    // TODO: 4. clean data/table
  })
})
```
