---
description: Lean how to use NotificationModule
---

# NotificationModule

![NotificationModule alt](./images/NotificationModule.png)

## Description

The `NotificationModule` exports the `EmailService`, and the MBC CQRS framework makes it easy to use with minimal configuration. You only need to set bellow environment variables:

```bash
SES_ENDPOINT=
SES_REGION=
SES_FROM_EMAIL=
```

This module is registered with global scope, so you can inject the `EmailService` anywhere in your application.
