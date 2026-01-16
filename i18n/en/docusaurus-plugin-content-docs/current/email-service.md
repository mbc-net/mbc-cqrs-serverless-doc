---
description: EmailService
---

# EmailService

## Description

This service is designed to send emails using [AWS SES (Simple Email Service)](https://aws.amazon.com/ses/).

## Methods

### *async* `sendEmail(msg: EmailNotification)`

Composes an email message and immediately queues it for sending.

#### Basic Example

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

#### With CC and BCC

```ts
await this.mailService.sendEmail({
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
await this.mailService.sendEmail({
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
await this.mailService.sendEmail({
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

## EmailNotification Interface

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

## Attachment Interface

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `filename` | `string` | Yes | Filename shown to recipient |
| `content` | `Buffer` | Yes | File content as Buffer |
| `contentType` | `string` | No | MIME type (e.g., 'application/pdf') |

## Inline Template Emails {#inline-template-emails}

:::info Version Note
Inline template email support was added in [version 1.0.23](./changelog#v1023).
:::

### *async* `sendInlineTemplateEmail(msg: TemplatedEmailNotification)`

Sends an email using SES v2 Inline Templates. This method supports variable substitution in email templates without requiring pre-registered templates in AWS Console.

#### Features

- Define email templates with variables using `{{variableName}}` syntax
- Automatic variable substitution at send time
- Local development support with fallback to manual template compilation
- Privacy-safe logging (logs recipient count, not addresses)

#### Basic Example

```ts
await this.mailService.sendInlineTemplateEmail({
  toAddrs: ["user@example.com"],
  template: {
    subject: "Welcome, {{name}}!",
    html: "<h1>Hello {{name}}</h1><p>Your verification code is: {{code}}</p>",
    text: "Hello {{name}}, Your verification code is: {{code}}",
  },
  data: {
    name: "John",
    code: "123456",
  },
});
```

#### With Configuration Set

You can specify a Configuration Set for tracking opens and clicks:

```ts
await this.mailService.sendInlineTemplateEmail({
  toAddrs: ["user@example.com"],
  template: {
    subject: "Order Confirmation #{{orderId}}",
    html: "<p>Thank you for your order, {{customerName}}!</p>",
  },
  data: {
    orderId: "ORD-12345",
    customerName: "Jane Doe",
  },
  configurationSetName: "my-tracking-config",
});
```

## TemplatedEmailNotification Interface

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `fromAddr` | `string` | No | Sender email address (uses default if not specified) |
| `toAddrs` | `string[]` | Yes | List of recipient email addresses |
| `ccAddrs` | `string[]` | No | CC recipients |
| `bccAddrs` | `string[]` | No | BCC recipients |
| `replyToAddrs` | `string[]` | No | Reply-to addresses |
| `template` | `InlineTemplateContent` | Yes | The template structure (subject, HTML, text) |
| `data` | `Record<string, any>` | Yes | Data to inject into template variables |
| `configurationSetName` | `string` | No | Configuration set name for open/click tracking |

## InlineTemplateContent Interface

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `subject` | `string` | Yes | Email subject line (can include variables) |
| `html` | `string` | Yes | HTML body (can include variables) |
| `text` | `string` | No | Plain text body for non-HTML clients |

## Local Development

When running in offline mode (`IS_OFFLINE=true`), the service automatically falls back to manual template compilation. This allows testing templated emails without requiring AWS SES connectivity.
