---
description: MBC CQRS ServerlessにおけるQueueModule、SnsService、SqsServiceを使ったメッセージングについて学びます。
---

# キューモジュール

`QueueModule`はSNS（パブ/サブ）とSQS（キュー）操作のメッセージングサービスを提供します。グローバルモジュールとして登録されているため、`QueueModule`を明示的にインポートしなくても、`SnsService`と`SqsService`をアプリケーション全体でインジェクションできます。

## SnsService

`SnsService`はSNSのパブリッシュ操作を提供します。

### `publish<T extends SnsEvent>(msg: T, topicArn?: string)`

SNSトピックへメッセージをパブリッシュします。

```typescript
// SnsServiceをインジェクト
constructor(private readonly snsService: SnsService) {}

// デフォルトトピックへ送信（SNS_TOPIC_ARN環境変数）
await this.snsService.publish({ action: 'my-action', ...payload })

// 特定のトピックへ送信
await this.snsService.publish({ action: 'my-action', ...payload }, 'arn:aws:sns:...')
```

**環境変数:**

| 変数 | 説明 |
|---|---|
| `SNS_TOPIC_ARN` | `topicArn`未指定時に使用されるデフォルトのトピックARN |
| `SNS_ENDPOINT` | カスタムエンドポイント（例: LocalStack用`http://localhost:4566`） |
| `SNS_REGION` | AWSリージョン |

---

## SqsService {#sqs-service}

:::info バージョンノート
`SqsService`は[バージョン1.2.1](/docs/changelog#v121)で追加されました。
:::

`SqsService`はSQSの送信・受信・削除操作を提供します。

**環境変数:**

| 変数 | 説明 |
|---|---|
| `SQS_ENDPOINT` | カスタムエンドポイント（例: LocalStack用`http://localhost:4566`） |
| `SQS_REGION` | AWSリージョン |

### `sendMessage(queueUrl, body, opts?)`

SQSキューへ単一メッセージを送信します。

```typescript
await this.sqsService.sendMessage(
  'https://sqs.ap-northeast-1.amazonaws.com/123456789012/my-queue',
  JSON.stringify({ key: 'value' }),
)

// オプションフィールドを指定する場合
await this.sqsService.sendMessage(queueUrl, body, {
  DelaySeconds: 5,
  MessageGroupId: 'group-1',         // FIFOキューのみ
  MessageDeduplicationId: 'dedup-1', // FIFOキューのみ
  MessageAttributes: { key: { DataType: 'String', StringValue: 'value' } }, // {{Custom message attributes}}
})
```

### `sendMessageBatch(queueUrl, entries)`

1回のAPIコールで最大10件のメッセージを送信します。`entries.length <= 10`であることは呼び出し側の責任です。

```typescript
await this.sqsService.sendMessageBatch(queueUrl, [
  { Id: '1', MessageBody: JSON.stringify({ key: 'value1' }) },
  { Id: '2', MessageBody: JSON.stringify({ key: 'value2' }) },
])
```

### `receiveMessages(queueUrl, opts?)`

SQSキューからメッセージを受信します。デフォルトは`MaxNumberOfMessages: 10`、`WaitTimeSeconds: 0`です。

```typescript
// デフォルト: MaxNumberOfMessages=10, WaitTimeSeconds=0
const output = await this.sqsService.receiveMessages(queueUrl)
const messages = output.Messages ?? []

// オプションを指定する場合
const outputWithOpts = await this.sqsService.receiveMessages(queueUrl, {
  MaxNumberOfMessages: 5,
  WaitTimeSeconds: 20,         // ロングポーリング
  VisibilityTimeout: 30,
  MessageSystemAttributeNames: ['All'],
})
```

### `deleteMessage(queueUrl, receiptHandle)`

処理後にキューから単一メッセージを削除します。

```typescript
for (const message of messages) {
  // メッセージを処理...
  await this.sqsService.deleteMessage(queueUrl, message.ReceiptHandle!)
}
```

### `deleteMessageBatch(queueUrl, entries)`

1回のAPIコールで最大10件のメッセージを削除します。

```typescript
await this.sqsService.deleteMessageBatch(queueUrl, [
  { Id: '1', ReceiptHandle: messages[0].ReceiptHandle! },
  { Id: '2', ReceiptHandle: messages[1].ReceiptHandle! },
])
```
