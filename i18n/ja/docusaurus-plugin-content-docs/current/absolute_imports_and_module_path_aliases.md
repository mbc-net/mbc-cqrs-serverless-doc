---
description: 特定のインポート パスを再マップできるようにするモジュール パス エイリアスを構成します。
---

# 絶対パスインポートとモジュールパスエイリアス

MBC CQRS serverless フレームワークには、`tsconfig.json` ファイルの `"paths"` および `"baseUrl"` オプションのサポートが組み込まれています。

これらのオプションを使用すると、プロジェクト ディレクトリに絶対パスのエイリアスを付けることができ、モジュールのインポートが容易になります。例えば：

```ts
// before
import { Role } from "../../../auth/role.enum";

// after
import { Role } from "@/auth/role.enum";
```

## 絶対パスインポート

「baseUrl」設定オプションを使用すると、プロジェクトのルートから直接インポートできます。

以下が設定例です。

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

## モジュールエイリアス


「baseUrl」パスの設定に加えて、「paths」オプションを使用してモジュール パスを「エイリアス」することもできます。

たとえば、次の設定は `@/auth/*` を `auth/*` にマップします。

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
