---
description: Learn how to write unit test
---

# Unit test

This guide explains how to write unit tests for services and handlers in the MBC CQRS Serverless framework.

## Mocking Dependencies

The framework uses `@golevelup/ts-jest` for creating mocks. The `createMock()` function automatically generates mock implementations for any interface or class.

### Basic Usage of createMock()

```ts
import { createMock } from '@golevelup/ts-jest'
import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'

const moduleRef = await Test.createTestingModule({
  providers: [MyService],
})
  .useMocker(createMock) // Auto-mock all dependencies
  .compile()
```

### Custom Mock Implementation

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

## Mocking AWS SDK Clients

Use `aws-sdk-client-mock` to mock AWS SDK v3 clients:

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
    // Arrange: Set up mock response
    dynamoDBMock.on(PutItemCommand).resolves({})

    // Action: Execute the method
    await myService.saveItem({ pk: 'test', sk: 'item' })

    // Assert: Verify the mock was called
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

## Complete Test Example

Here is a complete example based on the framework's actual test patterns:

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
      .useMocker(createMock) // Auto-mock remaining dependencies
      .compile()

    commandService = moduleRef.get<CommandService>(CommandService)
  })

  afterEach(() => {
    jest.clearAllMocks()
    dynamoDBMock.reset()
  })

  describe('getLatestItem', () => {
    it('should return the latest item', async () => {
      // Arrange
      const key = { pk: 'master', sk: 'test' }

      // Action
      const item = await commandService.getLatestItem(key)

      // Assert
      expect(item).toBeDefined()
      expect(item?.pk).toBe('master')
    })

    it('should return null when item not found', async () => {
      // Arrange
      const key = { pk: 'master', sk: 'nonexistent' }

      // Action
      const item = await commandService.getLatestItem(key)

      // Assert
      expect(item).toBeNull()
    })
  })
})
```

## Key Testing Patterns

### Test Structure

Each test follows the Arrange-Act-Assert pattern:

1. **Arrange**: Set up test data and mock responses
2. **Act**: Execute the method being tested
3. **Assert**: Verify the results and mock interactions

### Using `describe` and `it`

Use `describe` to group related tests and `it` for individual test cases:

```ts
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should do something when condition is met', async () => {
      // test implementation
    })

    it('should throw error when input is invalid', async () => {
      // test implementation
    })
  })
})
```

### Testing Error Cases

```ts
it('should throw BadRequestException when item not found', async () => {
  const invalidKey = { pk: 'invalid', sk: 'key' }

  await expect(
    commandService.publishPartialUpdateAsync(invalidKey, { invokeContext: {} })
  ).rejects.toThrow(BadRequestException)
})
```

## Advanced AWS SDK Mock Patterns {#advanced-mock-patterns}

### Mocking Multiple AWS Services

When testing services that interact with multiple AWS services, set up mocks for each client:

```ts
import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

describe('MultiServiceTest', () => {
  const dynamoMock = mockClient(DynamoDBClient)
  const snsMock = mockClient(SNSClient)
  const sqsMock = mockClient(SQSClient)

  beforeEach(() => {
    dynamoMock.reset()
    snsMock.reset()
    sqsMock.reset()
  })

  it('should publish to SNS after saving to DynamoDB', async () => {
    dynamoMock.on(PutItemCommand).resolves({})
    snsMock.on(PublishCommand).resolves({ MessageId: 'msg-123' })

    await myService.saveAndNotify(data)

    expect(dynamoMock).toHaveReceivedCommandTimes(PutItemCommand, 1)
    expect(snsMock).toHaveReceivedCommandTimes(PublishCommand, 1)
  })
})
```

### Mocking Conditional Responses

Use `callsFake` to return different responses based on input:

```ts
dynamoMock.on(GetItemCommand).callsFake((input) => {
  if (input.Key.pk.S === 'existing-key') {
    return {
      Item: marshall({
        pk: 'existing-key',
        sk: 'item',
        name: 'Test Item',
      }),
    }
  }
  return { Item: undefined } // Item not found
})
```

### Mocking Errors

Test error handling by making mocks reject:

```ts
it('should handle DynamoDB errors gracefully', async () => {
  dynamoMock.on(PutItemCommand).rejects(
    new Error('ConditionalCheckFailedException')
  )

  await expect(myService.saveItem(data)).rejects.toThrow('ConditionalCheckFailedException')
})
```

### Using jest.mock() for Module-Level Mocking

For services that instantiate AWS clients internally, use `jest.mock()`:

```ts
// Mock at the top of your test file
jest.mock('@aws-sdk/client-dynamodb', () => {
  const original = jest.requireActual('@aws-sdk/client-dynamodb')
  return {
    ...original,
    DynamoDBClient: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
  }
})
```

:::tip Best Practice
Prefer `aws-sdk-client-mock` over `jest.mock()` when possible, as it provides better type safety and more detailed assertions like `toHaveReceivedCommandWith`.
:::
