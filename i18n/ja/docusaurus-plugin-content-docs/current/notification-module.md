---
description: NotificationModule について学びましょう。
---

# NotificationModule

![NotificationModuleの代替](./images/NotificationModule.png)

## 説明

「NotificationModule」は「EmailService」をエクスポートし、MBC CQRS serverless フレームワークにより最小限の構成で簡単に使用できるようになります。以下の環境変数を設定するだけで済みます。

```bash
SES_ENDPOINT=
SES_REGION=
SES_FROM_EMAIL=
```

このモジュールはグローバル スコープで登録されているため、アプリケーションのどこにでも「EmailService」を挿入できます。
