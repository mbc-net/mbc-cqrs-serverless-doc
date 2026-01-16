---
description: {{EmailService}}
---

# {{EmailService}}

## {{Description}}

{{This service is designed to send emails using [AWS SES (Simple Email Service)](https://aws.amazon.com/ses/).}}

## {{Methods}}

### {{*async* `sendEmail(msg: EmailNotification): Promise<any>`}}

{{Composes an email message and immediately queues it for sending.}}

#### {{Basic Example}}

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

#### {{With CC and BCC}}

```ts
await this.mailService.sendEmail({
  toAddrs: ["recipient@example.com"],
  ccAddrs: ["cc@example.com"],
  bccAddrs: ["bcc@example.com"],
  subject: "Meeting Invitation",
  body: "<p>Please join our meeting.</p>",
});
```

#### {{With Attachments}}

{{You can attach files to emails by providing an array of attachment objects:}}

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

#### {{Multiple Attachments}}

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

## {{EmailNotification Interface}}

| {{Property}} | {{Type}} | {{Required}} | {{Description}} |
|----------|------|----------|-------------|
| `fromAddr` | `string` | {{No}} | {{Sender email address (uses default if not specified)}} |
| `toAddrs` | `string[]` | {{Yes}} | {{List of recipient email addresses}} |
| `ccAddrs` | `string[]` | {{No}} | {{CC recipients}} |
| `bccAddrs` | `string[]` | {{No}} | {{BCC recipients}} |
| `subject` | `string` | {{Yes}} | {{Email subject line}} |
| `body` | `string` | {{Yes}} | {{Email body as HTML}} |
| `replyToAddrs` | `string[]` | {{No}} | {{Reply-to addresses}} |
| `attachments` | `Attachment[]` | {{No}} | {{File attachments}} |

## {{Attachment Interface}}

| {{Property}} | {{Type}} | {{Required}} | {{Description}} |
|----------|------|----------|-------------|
| `filename` | `string` | {{Yes}} | {{Filename shown to recipient}} |
| `content` | `Buffer` | {{Yes}} | {{File content as Buffer}} |
| `contentType` | `string` | {{No}} | {{MIME type (e.g., 'application/pdf')}} |

