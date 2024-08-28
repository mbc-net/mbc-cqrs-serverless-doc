---
description: { { description } }
---

# {{title}}

{{intro_text}}

{{alias_usage_example_text}}

```ts
// before
import { Role } from "../../../auth/role.enum";

// after
import { Role } from "@/auth/role.enum";
```

## {{absolute_imports_title}}

{{absolute_imports_intro}}

{{absolute_imports_example_text}}

```json
# tsconfig.json
TODO:
{
  "compilerOptions": {
    "baseUrl": "."
  },
  "include": ["src/*", "src/**/*"]
}
```

## {{module_aliases_title}}

{{module_aliases_intro}}

{{module_aliases_example_text}}

```json
# tsconfig.json
 TODO:
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/auth/*": ["auth/*"]
    }
  },
  "include": ["src/*", "src/**/*"]
}
```
