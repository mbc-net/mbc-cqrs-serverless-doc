---
description: 特定のインポート パスを再マップできるようにするモジュール パス エイリアスを構成します。
---

# 絶対パスインポートとモジュールパスエイリアス

MBC CQRS serverless フレームワークには、`tsconfig.json` ファイルの `"paths"` および `"baseUrl"` オプションのサポートが組み込まれています。

これらのオプションを使用すると、プロジェクト ディレクトリに絶対パスのエイリアスを付けることができ、モジュールのインポートが容易になります。例えば：

```ts
// 変更前
import { Role } from "../../../auth/role.enum";

// 変更後
import { Role } from "@/auth/role.enum";
```

## 絶対パスインポート {#absolute-imports}

「baseUrl」設定オプションを使用すると、プロジェクトのルートから直接インポートできます。

以下が設定例です。

```json title="tsconfig.json"
{
  "compilerOptions": {
    "baseUrl": "."
  },
  "include": ["src/*", "src/**/*"]
}
```

## モジュールエイリアス {#module-aliases}

`baseUrl`の設定に加えて、`"paths"`オプションでモジュールパスエイリアスを設定できます。MBC CQRS Serverlessの慣例では`@/*`を`src/*`にマップします：

```json title="tsconfig.json"
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/**/*"]
}
```

これにより、クリーンでリファクタリングしやすいインポートが書けます：

```ts
// エイリアスなし
import { OrderService } from "../../../orders/order.service";

// エイリアスあり
import { OrderService } from "@/orders/order.service";
```

## Jestの設定 {#jest-configuration}

TypeScriptのパスエイリアスはJestにも登録する必要があります。`jest.config.json`に`moduleNameMapper`を追加してください：

```json title="jest.config.json"
{
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1"
  }
}
```

:::info
`moduleNameMapper`のパターンを`tsconfig.json`の`paths`エントリと同期させてください。マッパーが欠けていると、テストのみで`Cannot find module`エラーが発生し、原因の特定が難しくなります。
:::

## 関連ドキュメント

- [プロジェクト構成](/docs/project-structure) - プロジェクトファイル構成
- [インストール](/docs/installation) - TypeScript設定のセットアップ
- [はじめに](/docs/getting-started) - 初期プロジェクトセットアップ
