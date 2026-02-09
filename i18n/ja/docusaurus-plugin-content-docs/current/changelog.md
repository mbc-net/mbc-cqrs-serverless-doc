---
sidebar_position: 100
description: MBC CQRS Serverlessのリリースにおけるすべての注目すべき変更、新機能、バグ修正を追跡します。
---

# 変更履歴

MBC CQRS Serverlessのすべての注目すべき変更がここに記録されています。このプロジェクトは[セマンティックバージョニング](https://semver.org/)と[Conventional Commits](https://conventionalcommits.org/)に従っています。

## バージョン体系

- `x.y.z` - 本番リリース
- `x.y.z-beta.n` - テスト用ベータリリース
- `x.y.z-alpha.n` - 早期アクセス用アルファリリース

---

## 安定版リリース (1.x)

## [1.1.1](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.1.1) (2026-02-07) {#v111}

### バグ修正

- **cli:** 不足していた`import_tmp.json` DynamoDBテーブルテンプレートを追加 ([詳細を見る](/docs/dynamodb#system-table-definitions)) ([PR #323](https://github.com/mbc-net/mbc-cqrs-serverless/pull/323))
  - CLIテンプレートに`import_tmp`テーブル定義が含まれておらず、`npm run offline:sls`が失敗していました
  - `serverless.yml`が参照する`LOCAL_DDB_IMPORT_TMP_STREAM`環境変数は、マイグレーション時にテーブルが作成される必要があります
  - 以前のバージョンを使用している場合の回避策は[よくある問題](/docs/common-issues#missing-import-tmp-table)を参照

---

## [1.1.0](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.1.0) (2026-02-03) {#v110}

### 破壊的変更

- **tenant:** `TENANT_COMMON`のenum値を`'COMMON'`から`'common'`（小文字）に変更
  - この変更はパーティションキーのフォーマットに影響します: `TENANT#COMMON` → `TENANT#common`
  - **マイグレーション必須:** `TENANT#COMMON`パーティションキーを持つ既存データの移行が必要です
  - 詳細な手順は[マイグレーションガイド](/docs/migration/v1.1.0)を参照してください
- **core:** 非推奨の`CommandService.publish()`メソッドを削除 ([詳細を見る](/docs/migration/v1.1.0#breaking-change-3-deprecated-methods-removed))
  - 代わりに`CommandService.publishAsync()`を使用してください
- **core:** 非推奨の`CommandService.publishPartialUpdate()`メソッドを削除
  - 代わりに`CommandService.publishPartialUpdateAsync()`を使用してください
- **sequence:** 非推奨の`SequencesService.genNewSequence()`メソッドを削除
  - 代わりに`SequencesService.generateSequenceItem()`を使用してください

### 新機能

- **core:** 大文字小文字を区別しないマッチングのためのテナントコード正規化を追加 ([詳細を見る](/docs/data-migration-patterns#tenant-code-normalization-migration))
  - テナントコードは自動的に小文字に正規化されるようになりました
  - `getUserContext()`は正規化されたテナントコードを返します
  - すべてのDynamoDB操作は一貫性のため正規化されたテナントコードを使用します
- **core:** 明示的な正規化のための`normalizeTenantCode()`ユーティリティ関数を追加
- **core:** 共通テナント検出のための`isCommonTenant()`ユーティリティ関数を追加
- **core:** AWS SESメールのカテゴリ分けとフィルタリング用EmailTagsサポートを追加 ([詳細を見る](/docs/notification-module#email-tags))
  - `EmailNotification`インターフェースに新しい`emailTags`オプション
  - タグはSESに渡されメールのカテゴリ分けとトラッキングに使用
- **core:** RolesGuardに拡張可能なテナント検証を追加 ([詳細を見る](/docs/authentication#tenant-verification))
  - `isHeaderOverride()`: ヘッダーベースのテナントオーバーライドを検出
  - `canOverrideTenant()`: クロステナントアクセスの権限をチェック
  - `getCommonTenantCodes()`: 設定可能な共通テナントリスト
  - `getCrossTenantRoles()`: 設定可能なクロステナントロール（デフォルト: 'system_admin'）
- **cli:** スキル更新用のnpmレジストリバージョンチェックを追加
  - ローカルのpackage.jsonではなくnpmレジストリから最新バージョンを取得
  - ネットワークリクエストを削減するための24時間キャッシュ
  - オフライン時はキャッシュバージョンにフォールバック

### セキュリティ

- **core:** テナントコードヘッダーオーバーライドをシステム管理者のみに制限
  - 以前は`custom:tenant` Cognito属性のないユーザーがヘッダー経由で任意のテナントを指定可能でした
  - 現在はグローバル`system_admin`ロールを持つユーザーのみが`x-tenant-code`ヘッダーでテナントコードをオーバーライド可能
  - 一般ユーザーはCognitoで`custom:tenant`を設定する必要があります

### バグ修正

- **master:** MasterSettingServiceとMasterDataServiceでの`TENANT_COMMON`定数の使用を修正
  - 以前ハードコードされていた`'COMMON'`文字列は`SettingTypeEnum.TENANT_COMMON`を使用するようになりました
  - フレームワーク全体で一貫したパーティションキー生成を保証

### テスト

- **tenant:** TenantServiceメソッドの包括的なテストを追加
  - `getTenant()`: 取得テスト
  - `updateTenant()`: 更新と属性マージテスト
  - `deleteTenant()`: ソフト削除テスト
  - `addTenantGroup()`: グループ管理テスト
  - `customizeSettingGroups()`: 設定カスタマイズテスト
  - `createTenantGroup()`: テナントグループ作成テスト
- **tenant:** SettingTypeEnum検証テストを追加
  - `TENANT_COMMON = 'common'`（小文字）を検証
  - enumの完全性と一貫性を保証
- **core:** テナントコード正規化テストを追加（70件以上のテストケース）
- **core:** テナント正規化コマンドテストを追加（30件以上のテストケース）
- **core:** 包括的な依存関係統合テストを追加（3400以上のテスト）
  - AWS SDK統合テスト（DynamoDB、S3、SNS、SQS、Step Functions、SES）
  - NestJS動作テスト（デコレーター、設定、DI、Swagger）
  - サードパーティライブラリテスト（class-transformer、class-validator、RxJS）

### ドキュメント

- v1.1.0テナントコード変更のマイグレーションガイドを追加

---

## [1.0.26](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.26) (2026-01-26) {#v1026}

### 新機能

- **cli:** 環境変数によるローカルサービスポートの設定機能を追加 ([詳細を見る](/docs/installation#configuring-local-ports)) ([PR #300](https://github.com/mbc-net/mbc-cqrs-serverless/pull/300))
  - `LOCAL_HTTP_PORT`、`LOCAL_DYNAMODB_PORT`、`LOCAL_RDS_PORT`などのポート変数をサポート
  - 他のサービスとのポート競合を解決可能に
  - 設定はDocker Compose、Serverless Offline、トリガースクリプトに自動的に適用

### セキュリティ

- セキュリティ修正のため`diff`パッケージを4.0.2から4.0.4に更新 ([PR #297](https://github.com/mbc-net/mbc-cqrs-serverless/pull/297), [PR #299](https://github.com/mbc-net/mbc-cqrs-serverless/pull/299))
- プロトタイプ汚染修正のため`lodash`パッケージを4.17.21から4.17.23に更新 ([PR #298](https://github.com/mbc-net/mbc-cqrs-serverless/pull/298))

---

## [1.0.25](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.25) (2026-01-19) {#v1025}

### 新機能

- **core:** 高度な変数置換によるインラインテンプレートメールの機能強化 ([詳細を見る](/docs/notification-module#advanced-template-features))
  - ネストプロパティアクセスのサポート（例: `{{user.profile.name}}`）
  - テンプレート変数でのUnicode/日本語キーのサポート
  - プレースホルダー内の空白トリミング（例: `{{ name }}`は`{{name}}`と同等）
  - テンプレートコンパイルのローカル開発フォールバック機能の改善

---

## [1.0.24](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.24) (2026-01-17) {#v1024}

### 新機能

- **mcp-server:** ガイド付き開発支援のためのClaude Code Skillsを追加 ([詳細を見る](/docs/mcp-server#claude-code-skills))
  - `/mbc-generate`: ボイラープレートコードを生成（モジュール、サービス、コントローラー、DTO、ハンドラー）
  - `/mbc-review`: ベストプラクティスとアンチパターン（20パターン）のコードレビュー
  - `/mbc-migrate`: バージョン移行と破壊的変更のガイド
  - `/mbc-debug`: 一般的な問題のデバッグとトラブルシューティング
  - Skillsはnpmパッケージ経由で配布され、`~/.claude/skills/`または`.claude/skills/`にインストール可能
- **cli:** 簡単なskillsインストールのための`mbc install-skills`コマンドを追加 ([詳細を見る](/docs/cli#install-skills))
  - skillsを個人ディレクトリ（`~/.claude/skills/`）またはプロジェクトディレクトリ（`.claude/skills/`）にインストール
  - オプション: `--project`, `--force`, `--list`

### バグ修正

- **core:** パラメータ名のタイポを修正：`skExpession`を`skExpression`に
  - 影響するパッケージ: core, directory, master, task, ui-setting
  - これは古いパラメータ名を参照していたTypeScriptユーザーにとっては破壊的変更でした

---

## [1.0.23](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.23) (2026-01-16) {#v1023}

### 新機能

- **core:** インラインテンプレートメールサポートと`sendInlineTemplateEmail()`メソッドを追加 ([詳細を見る](/docs/notification-module#inline-template-emails))
  - EmailServiceに新しい`sendInlineTemplateEmail(msg: TemplatedEmailNotification)`メソッド
  - 動的データ置換によるインラインHTML/テキストテンプレートのサポート
  - SESが利用できない場合の手動テンプレートコンパイルによるローカル開発フォールバック
  - 新しいインターフェース: `InlineTemplateContent`, `TemplatedEmailNotification`

---

## [1.0.22](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.22) (2026-01-16) {#v1022}

### 新機能

- **mcp-server:** AI支援開発のためのコード分析ツールを追加 ([詳細を見る](./mcp-server#code-analysis-tools))
  - `mbc_check_anti_patterns`: 重大度レベル付きでコード内の一般的なアンチパターンを検出
  - `mbc_health_check`: プロジェクトヘルスチェック（依存関係、構造、設定）
  - `mbc_explain_code`: MBC CQRSコンテキストでコードを分析・説明

### バグ修正

- **mcp-server:** コード分析ツールの堅牢性を向上
  - アンチパターンを連番で再採番（AP001-AP010）
  - 誤検出を防ぐため正規表現のマッチ範囲を制限
  - ファイル読み取りとJSON解析のエラーハンドリングを追加
  - 分析ツールに18のユニットテストを追加

### セキュリティ

- 依存関係のセキュリティ脆弱性を修正: qs, express, body-parser

### 依存関係

- qsを6.13.0から6.14.1に更新
- @nestjs/platform-expressを10.4.20から10.4.22に更新
- expressを4.21.2から4.22.1に更新
- body-parserを1.20.3から1.20.4に更新

---

## [1.0.21](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.21) (2026-01-15) {#v1021}

### 新機能

- **import:** ImportModuleにZIPファイナライゼーションフックのサポートを追加
  - カスタムインポート後処理用の新しい`IZipFinalizationHook`インターフェース
  - `ImportModule.register()`の`zipFinalizationHooks`オプションでフックを登録
  - フックは結果、ステータス、実行入力を含む`ZipFinalizationContext`を受け取る

---

## [1.0.20](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.20) (2026-01-11) {#v1020}

### バグ修正

- **import:** Step Functions CSVハンドラーが子ジョブの失敗に関わらず常にCOMPLETEDステータスを設定する問題を修正
  - `CsvImportSfnEventHandler.finalizeParentJob()`を修正し、子ジョブが失敗した場合に正しくFAILEDステータスを設定
  - `csv_loader`ステートの`CsvImportSfnEventHandler`を修正し、失敗を伴う早期終了時に正しくステータスを設定
  - 以前は三項演算子が両方のケースでCOMPLETEDを返していました: `failedRows > 0 ? COMPLETED : COMPLETED`
  - failedRows > 0の場合、正しくFAILEDを返すように修正: `failedRows > 0 ? FAILED : COMPLETED`
  - このバグにより、子インポートジョブが失敗してもStep FunctionsがSUCCESSを報告していました
  - 詳細は[CsvImportSfnEventHandler](./import-export-patterns#csvimportsfneventhandler)を参照

---

## [1.0.19](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.19) (2026-01-11) {#v1019}

### バグ修正

- **import:** 子インポートジョブが失敗した際にマスタージョブのステータスがFAILEDに更新されない問題を修正
  - 以前は、子インポートジョブが`ConditionalCheckFailedException`などのエラーで失敗した場合、マスタージョブのステータスが無期限に`PROCESSING`のままでした
  - `incrementParentJobCounters`を修正し、子ジョブが失敗した場合にマスタージョブのステータスを正しく`FAILED`に設定（以前は常に`COMPLETED`を設定）
  - `ImportQueueEventHandler.handleImport`がエラー時に`incrementParentJobCounters`を呼び出すように修正し、親カウンターが更新されることを保証
  - エラーハンドラーから`throw error`を削除し、Lambdaのクラッシュを防ぎ、適切なステータス伝播を可能に
  - この修正はv1.0.18で開始したStep Functionsエラーハンドリングを完成させ、`SendTaskFailure`が適切にトリガーされることを保証
  - 詳細は[ImportQueueEventHandlerエラーハンドリング](./import-export-patterns#import-error-handling)を参照

---

## [1.0.18](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.18) (2026-01-10) {#v1018}

### バグ修正

- **import:** Step Functionsの適切なエラーハンドリングのため、`ImportStatusHandler`に`SendTaskFailure`サポートを追加
  - 以前は、インポートジョブが失敗した際、`SendTaskSuccess`のみ実装されていたため、Step Functionが無期限に待機していました
  - ジョブが失敗した際にハンドラーが適切に`SendTaskFailure`を送信し、Step Functionsがエラーを正しく処理できるようになりました
  - `SendTaskFailureCommand`を送信する`sendTaskFailure()`メソッドを追加
  - ハンドラーがCSVインポートジョブの`COMPLETED`と`FAILED`の両方のステータスを処理するようになりました
  - 詳細は[ImportStatusHandler API](./import-export-patterns#importstatushandler-api)を参照

---

## [1.0.17](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.17) (2026-01-08) {#v1017}

### バグ修正

- **master:** `MasterDataService.search()`の`masterTypeCode`比較を修正 - `settingCode`検索パラメータを部分一致（`contains`）から完全一致に変更 ([詳細を見る](./master#search-parameters))
- **cli:** setTimeoutを削除してAbstractRunnerテストを安定化し、CIの不安定なテスト失敗を修正

### セキュリティ

- 依存関係のセキュリティ脆弱性を修正: jws (HMAC署名検証の問題), nodemailer (DoS脆弱性)

### 依存関係

- validatorを13.15.20から13.15.26に更新
- @modelcontextprotocol/sdkを1.25.1から1.25.2に更新

### ドキュメント

- すべてのパッケージのREADMEファイルを包括的なAPIリファレンスと使用例で更新
- tenantパッケージのREADMEで`createTenantGroup`パラメータ名を修正
- 日本語ガイドのリンクを公式ドキュメントに更新

---

## [1.0.16](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.16) (2025-12-31)

### バグ修正

- **cli:** テスト生成ファイルのクリーンアップを追加し、.gitignoreを更新
- **master, directory, task, cli:** エラーメッセージを改善してわかりやすく

### 新機能

- インポート作成時のattributesに__s3Keyを含める
- Zipモードでテーブル名を提供
- CreateImportDtoにオプションのs3Keyを追加

---

## [1.0.15](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.15) (2025-12-31)

### バグ修正

- **ui-setting:** エラーメッセージを改善してわかりやすく
- **mcp-server:** ERROR_CATALOG.mdの検索にMBC_PROJECT_PATHを使用

---

## [1.0.14](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.14) (2025-12-29)

### 新機能

- **mcp-server:** AIツール統合用のMCPサーバーパッケージを追加

### ドキュメント

- 包括的なエラーメッセージカタログを追加
- コアインターフェースにJSDocコメントを追加
- 運用ドキュメント（FAQ、トラブルシューティング、セキュリティ）を追加
- AI対応ドキュメントファイルを追加

---

## [1.0.13](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.13) (2025-12-26)

### 新機能

- CreateZipImportDtoとZipImportQueueEventHandlerを強化

---

## [1.0.12](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.12) (2025-12-23)

### バグ修正

- TenantServiceでテナント属性をマージ

---

## [1.0.11](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.11) (2025-12-22)

### バグ修正

- SequencesServiceで不明なソースIPを処理

---

## [1.0.10](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.10) (2025-11-28)

### バグ修正

- TenantServiceのcreateTenantGroupメソッドを修正

---

## [1.0.9](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.9) (2025-11-26)

### バグ修正

- Node.js 24互換性のためLambdaハンドラーからコールバックパラメーターを削除

---

## [1.0.8](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.8) (2025-11-17)

### セキュリティ

- セキュリティ修正のためjws依存関係を更新

---

## [1.0.7](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.7) (2025-11-07)

### セキュリティ

- サンプルのvalidator依存関係を更新
- セキュリティ修正のためjs-yaml依存関係を更新

---

## [1.0.6](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.6) (2025-11-05) {#v106}

### 新機能

- **master:** MasterDataCreateDtoにtenantCodeサポートを追加し、サービスロジックを更新

---

## [1.0.5](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.5) (2025-11-04) {#v105}

### 新機能

- **master:** DTOとサービスロジックにtenantCodeサポートを追加してマスター設定を強化

---

## [1.0.4](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.4) (2025-10-29) {#v104}

### 新機能

- **core:** ブートストラップと環境検証に設定可能なリクエストボディサイズ制限を追加
- **master:** マスターデータと設定のバルク作成エンドポイントを追加

### 依存関係

- validatorを13.11.0/13.12.0から13.15.20に更新
- multerを1.4.4-lts.1から2.0.2に、@nestjs/platform-expressを10.4.4から10.4.20に更新
- CLIテンプレートでaxiosを1.7.7から1.13.1に更新

---

## [1.0.3](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.3) (2025-10-23) {#v103}

### 新機能

- **master:** マスターデータと設定のバルク作成エンドポイントを追加し、効率向上のためのバッチ操作を実現

---

## [1.0.2](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.2) (2025-10-16) {#v102}

### 新機能

- **survey:** サーベイテンプレート管理用のサーベイテンプレートAPIを追加

### 依存関係

- /examples/masterで@nestjs/commonを10.3.0から10.4.16に更新
- /examples/seqでmulterを1.4.4-lts.1から2.0.2に、@nestjs/platform-expressを10.4.15から10.4.20に更新
- @nestjs/cliを10.4.5から11.0.10に、inquirerを8.2.6から8.2.7に更新

---

## [1.0.1](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.1) (2025-09-19) {#v101}

### 新機能

- **import:** インポートモジュールにzipモードサポートを追加し、圧縮ファイルのインポートを実現

---

## [1.0.0](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.0) (2025-09-18) {#v100}

### ハイライト

- 初の安定版プロダクションリリース
- ベータ版0.1.74がベース

---

## ベータリリース (0.1.x)

## [0.1.75-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.74-beta.0...v0.1.75-beta.0)

### バグ修正

- **import:** Step Functionsの適切なエラーハンドリングのため、`ImportStatusHandler`に`SendTaskFailure`サポートを追加
  - 以前は、インポートジョブが失敗した際、`SendTaskSuccess`のみ実装されていたため、Step Functionが無期限に待機していました
  - ジョブが失敗した際にハンドラーが適切に`SendTaskFailure`を送信し、Step Functionsがエラーを正しく処理できるようになりました
  - `SendTaskFailureCommand`を送信する`sendTaskFailure()`メソッドを追加
  - ハンドラーがCSVインポートジョブの`COMPLETED`と`FAILED`の両方のステータスを処理するようになりました
  - 詳細は[ImportStatusHandler API](./import-export-patterns#importstatushandler-api)を参照

---

## [0.1.74-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.73-beta.0...v0.1.74-beta.0) (2025-08-25)

### 新機能

- インポートモジュールの実装
- インポートモジュール用のインフラ更新
- インポートモジュール用のローカルインフラ更新

---

## [0.1.73-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.72-beta.0...v0.1.73-beta.0) (2025-07-31)

### バグ修正

- **master:** パッケージインストールの問題を修正

---

## [0.1.72-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.71-beta.0...v0.1.72-beta.0) (2025-07-24)

### 新機能

- マスターデータと設定の大文字小文字を区別しない検索を追加

---

## [0.1.71-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.70-beta.0...v0.1.71-beta.0) (2025-07-18)

### バグ修正

- CIをブロックしていたコアパッケージのテスト失敗を修正
- GitHubワークフローの問題を修正
- Step Function名の長さ制限を処理
- StepFunctionServiceの実行名長さバリデーション

### 新機能

- CLIパッケージの包括的なテスト強化
- コアパッケージサービスのユニットテスト強化
- コントローラーの包括的なユニットテストを実装
- マスターパッケージサービスのユニットテスト強化
- シーケンスサービスのテスト強化
- タスクサービスのユニットテスト強化
- 不足していたサービスのユニットテストを実装
- 高優先度パッケージのユニットテストを実装

---

## [0.1.70-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.69-beta.0...v0.1.70-beta.0) (2025-07-14)

### バグ修正

- **master:** マスター設定のユニットテストを修正
- パッケージバージョンを更新

### 新機能

- **master:** テナントへのコピー機能を追加

---

## [0.1.69-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.68-beta.0...v0.1.69-beta.0) (2025-07-07)

### バグ修正

- **master:** ユニットテストを更新

### 新機能

- **master:** Prismaオプションを追加

---

## [0.1.68-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.67-beta.0...v0.1.68-beta.0) (2025-07-01)

### バグ修正

- ビルドライブラリCIを修正
- インポートテンプレートマスターデータモジュールを更新

### 新機能

- テンプレートマスターAPIを追加

---

## [0.1.67-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.66-beta.0...v0.1.67-beta.0) (2025-06-10)

### 新機能

- EmailServiceを添付ファイルサポートに拡張

---

## [0.1.65-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.64-beta.0...v0.1.65-beta.0) (2025-05-19)

### バグ修正

- 空のAppSync URL問題を修正
- テストAppSync URLを修正

### 新機能

- 2番目のAppSyncサポートを追加

---

## [0.1.58-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.57-beta.0...v0.1.58-beta.0) (2025-04-24)

### バグ修正

- マスターデータアイテムからのフォーマットシーケンス取得を修正

---

## [0.1.55-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.54-beta.0...v0.1.55-beta.0) (2025-02-14)

### 新機能

- Node 20ランタイムを使用するようテンプレートを更新

---

## [0.1.53-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.52-beta.0...v0.1.53-beta.0) (2025-02-12)

### 新機能

- タスク処理用のキューとStep Functionを追加
- Step Functionによるタスク処理

---

## [0.1.51-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.50-beta.0...v0.1.51-beta.0) (2025-01-17)

### バグ修正

- 説明テキストを修正

### 新機能

- ロガーを追加
- スキーマティック説明を追加
- コントローラー生成用スキーマティックを追加
- DTO、サービス、エンティティ生成用スキーマティックを追加
- モジュール生成用スキーマティックを追加

---

## [0.1.50-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.49-beta.0...v0.1.50-beta.0) (2025-01-14)

### バグ修正

- シリアライズヘルパーのエンティティフィールド処理を修正

### 新機能

- 内部/外部構造変換用のシリアライズヘルパー関数を追加

---

## 関連リンク

- [GitHub Releases](https://github.com/mbc-net/mbc-cqrs-serverless/releases)
- [npm Package](https://www.npmjs.com/package/@mbc-cqrs-serverless/core)
