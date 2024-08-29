---
description: Interfaces
---

# Interfaces

### CommandInputModel

```ts
export interface CommandInputModel {
  pk: string
  sk: string // include version
  id: string
  code: string
  name: string
  version: number
  tenantCode: string
  type: string
  isDeleted?: boolean
  seq?: number
  ttl?: number
  attributes?: Record<string, any>
}
```

### CommandPartialInputModel

```ts
export interface CommandPartialInputModel extends Partial<CommandInputModel> {
  pk: string
  sk: string
  version: number
}
```

### ICommandOptions

```ts
import { IInvoke } from '../context'

export interface ICommandOptions {
  source?: string
  requestId?: string

  invokeContext: IInvoke
}
```

### DetailKey

```ts
export interface DetailKey {
  pk: string
  sk: string
}
```

### EmailNotification

```ts
export interface EmailNotification {
  fromAddr?: string
  toAddrs: string[]
  ccAddrs?: string[]
  bccAddrs?: string[]
  subject: string
  body: string // html
}
```