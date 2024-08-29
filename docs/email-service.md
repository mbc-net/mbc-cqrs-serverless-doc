---
description: { { description } }
---

# {{title}}

## {{description_title}}

{{description_text}}

## {{methods_title}}

### {{sendEmail_method_title}}

{{sendEmail_method_description}}

{{sendEmail_example}}

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
