---
description: イベント処理
---

# イベント処理

現在、MBC CQRS serverlss では以下6種類のイベントをサポートしております。

- [SNS event](https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html#sns-sample-event)
- [SQS event](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#example-standard-queue-message-event)
- [DynamoDB event](https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html#events-sample-dynamodb)
- Event Bridge event
- Step function event
- [S3 event](https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html)

このガイドはカスタムイベントを作成し、そのイベントハンドラーを登録するのに役立ちます。

```mdx-code-block
import DocCardList from '@theme/DocCardList';

<DocCardList />
```
