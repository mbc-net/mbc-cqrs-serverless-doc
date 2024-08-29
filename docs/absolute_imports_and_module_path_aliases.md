---
description: { { Configure module path aliases that allow you to remap certain import paths. } }
---

# {{Absolute Imports and Module Path Aliases}}

{{MBC CQRS serverless framework has in-built support for the `"paths"` and `"baseUrl"` options of `tsconfig.json` file.}}

{{These options allow you to alias project directories to absolute paths, making it easier to import modules. For example:}}

```ts
// before
import { Role } from "../../../auth/role.enum";

// after
import { Role } from "@/auth/role.enum";
```

## {{Absolute Imports}}

{{The `baseUrl` configuration option allows you to import directly from the root of the project.}}

{{An example of this configuration:}}

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

## {{Module Aliases}}

{{In addition to configuring the `baseUrl` path, you can use the "paths" option to "alias" module paths.}}

{{For example, the following configuration maps `@/auth/*` to `auth/*`:}}

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
