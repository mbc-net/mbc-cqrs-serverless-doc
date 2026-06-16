---
description: CLIスキャフォールディングツールによって生成されるMBC CQRS Serverlessプロジェクトのファイルとフォルダー構成の概要。
---

# プロジェクト構造 

## MBC CQRS サーバーレスフレームワーク プロジェクトの構造 {#project-structure}

このページでは MBC CQRS サーバーレスフレームワークのプロジェクトの構造を説明します。プロジェクトルートディレクトリのファイルとディレクトリ、構成ファイルについて説明します。

### プロジェクトルートのディレクトリ

最上位のディレクトリはローカル開発、データマイグレーション、テスト用のディレクトリから構成されています。

| <!-- -->    | <!-- -->                    |
| ----------- | --------------------------- |
| infra       | クラウドデプロイ用のAWS CDKインフラコード |
| infra-local | ローカル開発のためのインフラ実行基盤 |
| prisma      | Prisma ORM、DynamoDBテーブルの設定      |
| src         | アプリケーションソースフォルダ         |
| test        | E2Eテスト、APIテスト等の設定        |

### プロジェクトルートディレクトリ内のファイル

プロジェクトルートディレクトリ内のファイルはアプリケーション設定、依存関係の管理、環境設定ファイルの定義等を行っています。

| <!-- -->            | <!-- -->                       |
| ------------------- | ------------------------------ |
| .env                | 環境設定ファイル            |
| .env.local          | ローカル開発用環境設定ファイル      |
| .eslintrc.js        | ESLint 設定ファイル       |
| .gitignore          | .gitignore ファイル      |
| .prettierrc         | Prettier のコード整形ルール設定ファイル     |
| jest.config.json    | Jest 用テスト設定ファイル    |
| nest-cli.json       | NestJS プラグイン設定ファイル       |
| package-lock.json   | package.json のロックファイル   |
| package.json        | プロジェクトの依存モジュール及び、スクリプトファイル        |
| README.md           | プロジェクトの説明、インストール方法、ガイドライン等を記載したファイル         |
| tsconfig.build.json | TypeScript コンパイラーオプション設定ファイル |
| tsconfig.json       | TypeScript 設定ファイル       |

## アプリケーションモジュールの規約 {#module-conventions}

次の記述は、src ディレクトリ内に新しいモジュールを定義する際の規約です。

| <!-- -->             | folder | <!-- -->                        |
| -------------------- | ------ | ------------------------------- |
| dto                  | folder | DTO (データ転送オブジェクト) スキーマを定義します。 DTO は、ネットワーク上でデータを送信する方法を定義するオブジェクトです。      |
| entity               | folder | ビジネスオブジェクトを定義します。 |
| handler              | folder | データ同期ハンドラークラスを定義します。  |
| [name].service.ts    | file   | ビジネスロジックを定義します。    |
| [name].controller.ts | file   | コントローラを定義します。 |
| [name].module.ts     | file   | 特定の機能に関するコード記述します。整理した状態を保ち明確な境界を確立します。     |


## 関連ドキュメント

- [はじめに](/docs/getting-started) - はじめに・前提条件
- [モジュール](/docs/modules) - モジュールの設定と使用
- [設定](/docs/configuring) - 設定オプション
- [CLI](/docs/cli) - CLIでプロジェクトを生成
- [絶対インポートとモジュールパスエイリアス](/docs/absolute_imports_and_module_path_aliases) - TypeScriptパスエイリアスの設定
