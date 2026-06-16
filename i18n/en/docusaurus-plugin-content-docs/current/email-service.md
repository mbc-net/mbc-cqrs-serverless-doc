---
description: Send emails using AWS SES with the EmailService module, including attachments and inline templates with dynamic data.
---

# EmailService

## Description {#description}

This service is designed to send emails using [AWS SES (Simple Email Service)](https://aws.amazon.com/ses/).

## Usage {#usage}

`EmailService` is exported from `@mbc-cqrs-serverless/core` and is registered as a global provider automatically by the framework. Inject it into any service using the standard NestJS constructor injection:

```typescript
import { EmailService, EmailNotification } from '@mbc-cqrs-serverless/core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  constructor(private readonly emailService: EmailService) {}

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.emailService.sendEmail({
      toAddrs: [email],
      subject: `Welcome, ${name}!`,
      body: `<p>Thank you for joining.</p>`,
    });
  }
}
```

Set the `SES_REGION` and optionally `SES_FROM_EMAIL` environment variables for SES configuration. See [Environment Variables](/docs/environment-variables) for details.

## Methods {#methods}

### *async* `sendEmail(msg: EmailNotification): Promise<any>`

Composes an email message and immediately queues it for sending. Returns `Promise<SendEmailCommandOutput>` — the AWS SES response includes a `MessageId` string you can capture for tracking:

```ts
const result = await this.emailService.sendEmail({
  toAddrs: ["recipient@example.com"],
  subject: "Hello",
  body: "<p>World</p>",
});
console.log(result.MessageId); // Log MessageId for email tracking
```

#### Basic Example

```ts
const email = "cat@example.com";
const subject = "Welcome to MBC CQRS serverless framework!";
const body = "<p>Enjoy</p>";

await this.emailService.sendEmail({
  toAddrs: [email],
  subject,
  body,
});
```

#### With CC and BCC

```ts
await this.emailService.sendEmail({
  toAddrs: ["recipient@example.com"],
  ccAddrs: ["cc@example.com"],
  bccAddrs: ["bcc@example.com"],
  subject: "Meeting Invitation",
  body: "<p>Please join our meeting.</p>",
});
```

#### With Attachments

You can attach files to emails by providing an array of attachment objects:

```ts
await this.emailService.sendEmail({
  toAddrs: ["recipient@example.com"],
  subject: "Report Attached",
  body: "<p>Please find the attached report.</p>",
  attachments: [
    {
      filename: "report.pdf",
      content: pdfBuffer,
      contentType: "application/pdf",
    },
  ],
});
```

#### Multiple Attachments

```ts
await this.emailService.sendEmail({
  toAddrs: ["recipient@example.com"],
  subject: "Documents",
  body: "<p>Please find the attached documents.</p>",
  attachments: [
    {
      filename: "document.pdf",
      content: pdfBuffer,
      contentType: "application/pdf",
    },
    {
      filename: "image.jpg",
      content: imageBuffer,
      contentType: "image/jpeg",
    },
    {
      filename: "data.csv",
      content: csvBuffer,
      contentType: "text/csv",
    },
  ],
});
```

## EmailNotification Interface {#email-notification-interface}

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `fromAddr` | `string` | No | Sender email address (uses default if not specified) |
| `toAddrs` | `string[]` | Yes | List of recipient email addresses |
| `ccAddrs` | `string[]` | No | CC recipients |
| `bccAddrs` | `string[]` | No | BCC recipients |
| `subject` | `string` | Yes | Email subject line |
| `body` | `string` | Yes | Email body as HTML |
| `replyToAddrs` | `string[]` | No | Reply-to addresses |
| `attachments` | `Attachment[]` | No | File attachments |
| `emailTags` | `EmailTag[]` | No | AWS SES tags for categorization and filtering |

## Attachment Interface {#attachment-interface}

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `filename` | `string` | Yes | Filename shown to recipient |
| `content` | `Buffer` | Yes | File content as Buffer |
| `contentType` | `string` | No | MIME type (e.g., 'application/pdf') |

### *async* `sendInlineTemplateEmail(msg: TemplatedEmailNotification): Promise<any>` {#send-inline-template-email}

:::info Version Note
`sendInlineTemplateEmail()` was added in [version 1.0.23](/docs/changelog#v1023).
:::

Sends a templated email using `{{variableName}}` placeholders in the subject and body. Unlike SES registered templates, the template is inlined in the request — no pre-registration required.

```ts
import { EmailService, TemplatedEmailNotification } from '@mbc-cqrs-serverless/core';

await this.emailService.sendInlineTemplateEmail({
  toAddrs: ['user@example.com'],
  template: {
    subject: '{{orderType}} Confirmation — Order {{orderId}}',
    html: '<h1>Hello {{name}}!</h1><p>Your order #{{orderId}} is confirmed.</p>',
    text: 'Hello {{name}}, your order #{{orderId}} is confirmed.',
  },
  data: {
    name: 'Jane Doe',
    orderId: '12345',
    orderType: 'Purchase',
  },
});
```

For the full interface definition and advanced template features (whitespace trimming, nested data), see [Notification Module — Inline Template Emails](/docs/notification-module#inline-template-emails).

## Testing {#testing}

Mock `EmailService` in unit tests to avoid making real SES calls:

```typescript
// In your test module setup
const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ MessageId: 'test-message-id' }),
};

const module = await Test.createTestingModule({
  providers: [
    YourService,
    { provide: EmailService, useValue: mockEmailService },
  ],
}).compile();

// Assert the email was sent with the expected parameters
expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
  expect.objectContaining({
    toAddrs: ['user@example.com'],
    subject: expect.stringContaining('Welcome'),
  }),
);
```

## Related Documentation

- [Notification Module](/docs/notification-module) - Real-time notifications with AppSync
- [Environment Variables](/docs/environment-variables) - SES configuration environment variables
- [Interfaces](/docs/interfaces) - EmailNotification interface reference
- [Unit Testing](/docs/unit-test) - Unit testing patterns for services
