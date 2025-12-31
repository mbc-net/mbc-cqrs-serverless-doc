---
description: イベント処理
---

# イベント処理

現在、MBC CQRS サーバーレスフレームワークでは以下6種類のイベントをサポートしております。

- [SNSイベント](https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html#sns-sample-event)
- [SQSイベント](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#example-standard-queue-message-event)
- [DynamoDBイベント](https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html#events-sample-dynamodb)
- Event Bridgeイベント
- Step Functionイベント
- [S3イベント](https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html)

このガイドはカスタムイベントを作成し、そのイベントハンドラーを登録するのに役立ちます。

```mdx-code-block
import DocCardList from '@theme/DocCardList';

<DocCardList />
```
