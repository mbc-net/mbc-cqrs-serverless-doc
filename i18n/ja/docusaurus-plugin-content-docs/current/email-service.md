---
description: EmailService
---

# EmailService

## 説明

このサービスは、[AWS SES (Simple Email Service)](https://aws.amazon.com/ses/) を使用してメールを送信するように設計されています。

## メソッド

### *async* `sendEmail(msg: EmailNotification)`

電子メール メッセージを作成し、送信のためにすぐにキューに入れます。

例

```ts
const email = "cat@example.com";
const subject = "Welcome to MBC CQRS serverless framework!";
const body = "<p>Enjoy</p>";

await this.mailService.sendEmail({
  toAddrs: [email],
  subject,
  body,
});
```
