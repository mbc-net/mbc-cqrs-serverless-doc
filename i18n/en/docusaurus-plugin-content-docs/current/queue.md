---
description: Learn about the QueueModule, SnsService, and SqsService for messaging in MBC CQRS Serverless.
---

# Queue Module

The `QueueModule` provides messaging services for SNS (pub/sub) and SQS (queue) operations. It is registered as a global module, so `SnsService` and `SqsService` are available for injection throughout the application without explicitly importing `QueueModule`.

## SnsService

`SnsService` provides SNS publish operations.

### `publish<T extends SnsEvent>(msg: T, topicArn?: string)`

Publishes a message to an SNS topic.

```typescript
// Inject SnsService
constructor(private readonly snsService: SnsService) {}

// Publish to default topic (SNS_TOPIC_ARN env var)
await this.snsService.publish({ action: 'my-action', ...payload })

// Publish to a specific topic
await this.snsService.publish({ action: 'my-action', ...payload }, 'arn:aws:sns:...')
```

**Environment variables:**

| Variable | Description |
|---|---|
| `SNS_TOPIC_ARN` | Default topic ARN used when `topicArn` is not provided |
| `SNS_ENDPOINT` | Custom endpoint (e.g. `http://localhost:4566` for LocalStack) |
| `SNS_REGION` | AWS region |

---

## SqsService {#sqs-service}

:::info Version Note
`SqsService` was added in [version 1.2.1](/docs/changelog#v121).
:::

`SqsService` provides SQS send, receive, and delete operations.

**Environment variables:**

| Variable | Description |
|---|---|
| `SQS_ENDPOINT` | Custom endpoint (e.g. `http://localhost:4566` for LocalStack) |
| `SQS_REGION` | AWS region |

### `sendMessage(queueUrl, body, opts?)`

Sends a single message to an SQS queue.

```typescript
await this.sqsService.sendMessage(
  'https://sqs.ap-northeast-1.amazonaws.com/123456789012/my-queue',
  JSON.stringify({ key: 'value' }),
)

// With optional fields
await this.sqsService.sendMessage(queueUrl, body, {
  DelaySeconds: 5,
  MessageGroupId: 'group-1',         // FIFO queues only
  MessageDeduplicationId: 'dedup-1', // FIFO queues only
  MessageAttributes: { key: { DataType: 'String', StringValue: 'value' } }, // {{Custom message attributes}}
})
```

### `sendMessageBatch(queueUrl, entries)`

Sends up to 10 messages in a single API call. Caller is responsible for ensuring `entries.length <= 10`.

```typescript
await this.sqsService.sendMessageBatch(queueUrl, [
  { Id: '1', MessageBody: JSON.stringify({ key: 'value1' }) },
  { Id: '2', MessageBody: JSON.stringify({ key: 'value2' }) },
])
```

### `receiveMessages(queueUrl, opts?)`

Receives messages from an SQS queue. Defaults to `MaxNumberOfMessages: 10` and `WaitTimeSeconds: 0`.

```typescript
// Default: MaxNumberOfMessages=10, WaitTimeSeconds=0
const output = await this.sqsService.receiveMessages(queueUrl)
const messages = output.Messages ?? []

// With options
const outputWithOpts = await this.sqsService.receiveMessages(queueUrl, {
  MaxNumberOfMessages: 5,
  WaitTimeSeconds: 20,         // Long polling
  VisibilityTimeout: 30,
  MessageSystemAttributeNames: ['All'],
})
```

### `deleteMessage(queueUrl, receiptHandle)`

Deletes a single message from the queue after processing.

```typescript
for (const message of messages) {
  // Process message...
  await this.sqsService.deleteMessage(queueUrl, message.ReceiptHandle!)
}
```

### `deleteMessageBatch(queueUrl, entries)`

Deletes up to 10 messages in a single API call.

```typescript
await this.sqsService.deleteMessageBatch(queueUrl, [
  { Id: '1', ReceiptHandle: messages[0].ReceiptHandle! },
  { Id: '2', ReceiptHandle: messages[1].ReceiptHandle! },
])
```
