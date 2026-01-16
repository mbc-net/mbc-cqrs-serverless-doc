---
description: EmailService
---

# EmailService

## 説明

このサービスは、[AWS SES (Simple Email Service)](https://aws.amazon.com/ses/)を使用してメールを送信するように設計されています。

## メソッド

### *async* `sendEmail(msg: EmailNotification)`

メールメッセージを作成し、送信のためにすぐにキューに入れます。

#### 基本的な例

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

#### CCとBCCを使用

```ts
await this.mailService.sendEmail({
  toAddrs: ["recipient@example.com"],
  ccAddrs: ["cc@example.com"],
  bccAddrs: ["bcc@example.com"],
  subject: "Meeting Invitation",
  body: "<p>Please join our meeting.</p>",
});
```

#### 添付ファイル付き

添付ファイルオブジェクトの配列を指定することで、メールにファイルを添付できます：

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

#### 複数の添付ファイル

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

## EmailNotificationインターフェース

| プロパティ | 型 | 必須 | 説明 |
|----------|------|----------|-------------|
| `fromAddr` | `string` | いいえ | 送信者メールアドレス（指定しない場合はデフォルトを使用） |
| `toAddrs` | `string[]` | はい | 受信者メールアドレスのリスト |
| `ccAddrs` | `string[]` | いいえ | CC受信者 |
| `bccAddrs` | `string[]` | いいえ | BCC受信者 |
| `subject` | `string` | はい | メール件名 |
| `body` | `string` | はい | HTMLとしてのメール本文 |
| `replyToAddrs` | `string[]` | いいえ | 返信先アドレス |
| `attachments` | `Attachment[]` | いいえ | 添付ファイル |

## Attachmentインターフェース

| プロパティ | 型 | 必須 | 説明 |
|----------|------|----------|-------------|
| `filename` | `string` | はい | 受信者に表示されるファイル名 |
| `content` | `Buffer` | はい | Bufferとしてのファイル内容 |
| `contentType` | `string` | いいえ | MIMEタイプ（例：'application/pdf'） |

## インラインテンプレートメール {#inline-template-emails}

:::info バージョン情報
インラインテンプレートメールのサポートは[バージョン1.0.23](./changelog#v1023)で追加されました。
:::

### *async* `sendInlineTemplateEmail(msg: TemplatedEmailNotification)`

SES v2インラインテンプレートを使用してメールを送信します。このメソッドは、AWSコンソールで事前登録されたテンプレートを必要とせず、メールテンプレートの変数置換をサポートします。

#### 機能

- Define email templates with variables using `{{variableName` syntax}}
- 送信時の自動変数置換
- 手動テンプレートコンパイルへのフォールバックによるローカル開発サポート
- プライバシー安全なログ記録（アドレスではなく受信者数を記録）

#### 基本的な例

```ts
await this.mailService.sendInlineTemplateEmail({
  toAddrs: ["user@example.com"],
  template: {
    subject: "Welcome, name!",
    html: "<h1>Hello name</h1><p>Your verification code is: code</p>",
    text: "Hello name, Your verification code is: code",
  },
  data: {
    name: "John",
    code: "123456",
  },
});
```

#### Configuration Setを使用

開封とクリックのトラッキング用にConfiguration Setを指定できます：

```ts
await this.mailService.sendInlineTemplateEmail({
  toAddrs: ["user@example.com"],
  template: {
    subject: "Order Confirmation #orderId",
    html: "<p>Thank you for your order, customerName!</p>",
  },
  data: {
    orderId: "ORD-12345",
    customerName: "Jane Doe",
  },
  configurationSetName: "my-tracking-config",
});
```

## TemplatedEmailNotificationインターフェース

| プロパティ | 型 | 必須 | 説明 |
|----------|------|----------|-------------|
| `fromAddr` | `string` | いいえ | 送信者メールアドレス（指定しない場合はデフォルトを使用） |
| `toAddrs` | `string[]` | はい | 受信者メールアドレスのリスト |
| `ccAddrs` | `string[]` | いいえ | CC受信者 |
| `bccAddrs` | `string[]` | いいえ | BCC受信者 |
| `replyToAddrs` | `string[]` | いいえ | 返信先アドレス |
| `template` | `InlineTemplateContent` | はい | テンプレート構造（件名、HTML、テキスト） |
| `data` | `Record<string, any>` | はい | テンプレート変数に挿入するデータ |
| `configurationSetName` | `string` | いいえ | 開封/クリックトラッキング用のConfiguration Set名 |

## InlineTemplateContentインターフェース

| プロパティ | 型 | 必須 | 説明 |
|----------|------|----------|-------------|
| `subject` | `string` | はい | メール件名（変数を含めることができます） |
| `html` | `string` | はい | HTML本文（変数を含めることができます） |
| `text` | `string` | いいえ | HTML非対応クライアント用のプレーンテキスト本文 |

## ローカル開発

オフラインモード（`IS_OFFLINE=true`）で実行する場合、サービスは自動的に手動テンプレートコンパイルにフォールバックします。これにより、AWS SES接続を必要とせずにテンプレートメールをテストできます。
