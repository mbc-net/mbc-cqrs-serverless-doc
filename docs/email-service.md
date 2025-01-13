---
description: EmailService
---

# {{EmailService}}

## {{Description}}

{{This service is designed to send emails using [AWS SES (Simple Email Service)](https://aws.amazon.com/ses/).}}

## {{Methods}}

### {{*async* `sendEmail(msg: EmailNotification)`}}

{{Composes an email message and immediately queues it for sending.}}

{{For example:}}

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
