---
description: 添付ファイルや動的データのインラインテンプレートを含む、EmailServiceモジュールを使ったAWS SESによるメール送信。
---

# EmailService

## 説明 {#description}

このサービスは、[AWS SES (Simple Email Service)](https://aws.amazon.com/ses/)を使用してメールを送信するように設計されています。

## 使い方 {#usage}

`EmailService`は`@mbc-cqrs-serverless/core`からエクスポートされ、フレームワークによってグローバルプロバイダーとして自動登録されます。標準のNestJSコンストラクタインジェクションを使って任意のサービスに注入できます：

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

`SES_REGION`と任意で`SES_FROM_EMAIL`環境変数を設定してSESを構成してください。詳細は[環境変数](/docs/environment-variables)を参照。

## メソッド {#methods}

### *async* `sendEmail(msg: EmailNotification): Promise<any>`

メールを作成してすぐに送信キューに追加します。`Promise<SendEmailCommandOutput>`を返します — AWS SESレスポンスには追跡に使用できる`MessageId`文字列が含まれます：

```ts
const result = await this.emailService.sendEmail({
  toAddrs: ["recipient@example.com"],
  subject: "Hello",
  body: "<p>World</p>",
});
console.log(result.MessageId); // Log MessageId for email tracking (メール追跡用にMessageIdをログ出力)
```

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

### *async* `sendInlineTemplateEmail(msg: TemplatedEmailNotification): Promise<any>` {#send-inline-template-email}

:::info バージョン情報
`sendInlineTemplateEmail()`は[バージョン1.0.23](/docs/changelog#v1023)で追加されました。
:::

件名と本文に`{{variableName}}`プレースホルダーを使ったテンプレートメールを送信します。SES登録テンプレートとは異なり、テンプレートをリクエストにインラインで指定するため、事前登録は不要です。

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

完全なインターフェース定義と高度なテンプレート機能（空白のトリミング、ネストデータ）については、[通知モジュール — インラインテンプレートメール](/docs/notification-module#inline-template-emails)を参照してください。

## テスト {#testing}

実際のSES呼び出しを避けるため、ユニットテストでは `EmailService` をモックします：

```typescript
// テストモジュールのセットアップ
const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ MessageId: 'test-message-id' }),
};

const module = await Test.createTestingModule({
  providers: [
    YourService,
    { provide: EmailService, useValue: mockEmailService },
  ],
}).compile();

// 期待するパラメーターでメールが送信されたことを確認
expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
  expect.objectContaining({
    toAddrs: ['user@example.com'],
    subject: expect.stringContaining('Welcome'),
  }),
);
```

## 関連ドキュメント

- [通知モジュール](/docs/notification-module) - AppSyncを使ったリアルタイム通知
- [環境変数](/docs/environment-variables) - SES設定の環境変数
- [インターフェース](/docs/interfaces) - EmailNotificationインターフェースリファレンス
- [ユニットテスト](/docs/unit-test) - サービスのユニットテストパターン
