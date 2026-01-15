---
description: 単体テストの書き方を学びます
---

# 単体テスト

このガイドでは、MBC CQRS Serverless フレームワークでサービスやハンドラーの単体テストを書く方法を説明します。

## 依存関係のモック

フレームワークでは `@golevelup/ts-jest` を使用してモックを作成します。`createMock()` 関数は、任意のインターフェースやクラスに対してモック実装を自動生成します。

### createMock() の基本的な使い方

```ts
import { createMock } from '@golevelup/ts-jest'
import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'

const moduleRef = await Test.createTestingModule({
  providers: [MyService],
})
  .useMocker(createMock) // Auto-mock all dependencies (すべての依存関係を自動モック)
  .compile()
```

### カスタムモック実装

```ts
import { createMock } from '@golevelup/ts-jest'
import { ConfigService } from '@nestjs/config'

const config = {
  NODE_ENV: 'test',
  APP_NAME: 'my-app',
}

const moduleRef = await Test.createTestingModule({
  providers: [
    MyService,
    {
      provide: ConfigService,
      useValue: createMock<ConfigService>({
        get: jest.fn((key) => config[key] ?? 'default'),
      }),
    },
  ],
}).compile()
```

## AWS SDK クライアントのモック

AWS SDK v3 クライアントをモックするには `aws-sdk-client-mock` を使用します：

```ts
import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb'

describe('MyService', () => {
  const dynamoDBMock = mockClient(DynamoDBClient)

  beforeEach(() => {
    dynamoDBMock.reset()
  })

  afterEach(() => {
    dynamoDBMock.reset()
  })

  it('should put item to DynamoDB', async () => {
    // Arrange: Set up mock response (準備：モックレスポンスを設定)
    dynamoDBMock.on(PutItemCommand).resolves({})

    // Action: Execute the method (実行：メソッドを実行)
    await myService.saveItem({ pk: 'test', sk: 'item' })

    // Assert: Verify the mock was called (検証：モックが呼ばれたことを確認)
    expect(dynamoDBMock).toHaveReceivedCommandTimes(PutItemCommand, 1)
    expect(dynamoDBMock).toHaveReceivedCommandWith(PutItemCommand, {
      TableName: 'my-table',
      Item: expect.objectContaining({
        pk: { S: 'test' },
        sk: { S: 'item' },
      }),
    })
  })
})
```

## 完全なテスト例

以下は、フレームワークの実際のテストパターンに基づいた完全な例です：

```ts
import { createMock } from '@golevelup/ts-jest'
import { Test } from '@nestjs/testing'
import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { ConfigService } from '@nestjs/config'

const config = {
  NODE_ENV: 'test',
  APP_NAME: 'my-app',
}

describe('CommandService', () => {
  let commandService: CommandService
  const dynamoDBMock = mockClient(DynamoDBClient)

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommandService,
        DynamoDbService,
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>({
            get: jest.fn((key) => config[key]),
          }),
        },
      ],
    })
      .useMocker(createMock) // Auto-mock remaining dependencies (残りの依存関係を自動モック)
      .compile()

    commandService = moduleRef.get<CommandService>(CommandService)
  })

  afterEach(() => {
    jest.clearAllMocks()
    dynamoDBMock.reset()
  })

  describe('getLatestItem', () => {
    it('should return the latest item', async () => {
      // Arrange (準備)
      const key = { pk: 'master', sk: 'test' }

      // Action (実行)
      const item = await commandService.getLatestItem(key)

      // Assert (検証)
      expect(item).toBeDefined()
      expect(item?.pk).toBe('master')
    })

    it('should return null when item not found', async () => {
      // Arrange (準備)
      const key = { pk: 'master', sk: 'nonexistent' }

      // Action (実行)
      const item = await commandService.getLatestItem(key)

      // Assert (検証)
      expect(item).toBeNull()
    })
  })
})
```

## 主要なテストパターン

### テスト構造

各テストは Arrange-Act-Assert パターンに従います：

1. **Arrange (準備)**: テストデータとモックレスポンスを設定
2. **Act (実行)**: テスト対象のメソッドを実行
3. **Assert (検証)**: 結果とモックの呼び出しを検証

### `describe` と `it` の使い方

関連するテストをグループ化するには `describe` を使用し、個々のテストケースには `it` を使用します：

```ts
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should do something when condition is met', async () => {
      // test implementation (テスト実装)
    })

    it('should throw error when input is invalid', async () => {
      // test implementation (テスト実装)
    })
  })
})
```

### エラーケースのテスト

```ts
it('should throw BadRequestException when item not found', async () => {
  const invalidKey = { pk: 'invalid', sk: 'key' }

  await expect(
    commandService.publishPartialUpdateAsync(invalidKey, { invokeContext: {} })
  ).rejects.toThrow(BadRequestException)
})
```
