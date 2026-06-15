---
description: 添付ファイルや動的データのインラインテンプレートを含む、EmailServiceモジュールを使ったAWS SESによるメール送信。
---

# EmailService

## 説明 {#description}

このサービスは、[AWS SES (Simple Email Service)](https://aws.amazon.com/ses/)を使用してメールを送信するように設計されています。

## メソッド {#methods}

### *async* `sendEmail(msg: EmailNotification): Promise<any>`

メールメッセージを作成し、送信のためにすぐにキューに入れます。

#### 基本的な例

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

#### CCとBCCを使用

```ts
await this.emailService.sendEmail({
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

#### 複数の添付ファイル

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

## EmailNotificationインターフェース {#email-notification-interface}

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
| `emailTags` | `EmailTag[]` | いいえ | 分類とフィルタリングのためのAWS SESタグ |

## Attachmentインターフェース {#attachment-interface}

| プロパティ | 型 | 必須 | 説明 |
|----------|------|----------|-------------|
| `filename` | `string` | はい | 受信者に表示されるファイル名 |
| `content` | `Buffer` | はい | Bufferとしてのファイル内容 |
| `contentType` | `string` | いいえ | MIMEタイプ（例：'application/pdf'） |


## 関連ドキュメント

- [通知モジュール](/docs/notification-module) - AppSyncを使ったリアルタイム通知
- [環境変数](/docs/environment-variables) - SES設定の環境変数
- [インターフェース](/docs/interfaces) - EmailNotificationインターフェースリファレンス
