---
sidebar_position: 100
sidebar_label: "Backend (Framework)"
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

## [1.2.2](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.2.2) (2026-04-08) {#v122}

### バグ修正

- **import:** `CsvBatchProcessor`にSmart Retryパターンを実装してHead-of-Line Blocking（Poison Pill）を修正 ([詳細を見る](/docs/import#csv-batch-error-handling)) ([PR #394](https://github.com/mbc-net/mbc-cqrs-serverless/pull/394))
  - 以前は、先頭行に永続的なバリデーションエラーがあるとバッチ全体が即座にクラッシュしていた
  - 各行を独立して処理し、エラーを蓄積してバッチ終了後に集約エラーをスローするよう修正
  - 有効な行は正常に保存、失敗行はSQSリトライをトリガー、成功済み行はEQUAL比較でスキップ（冪等性維持）
- **import:** `ImportQueueEventHandler`が`SingleImportProcessor`に生のSQSペイロードを渡していた問題を修正 ([PR #394](https://github.com/mbc-net/mbc-cqrs-serverless/pull/394))
  - `singleImportProcessor.process()`に`event.payload`（生のSQSペイロード）ではなく`event.importEvent`（パース済みオブジェクト）を渡すよう修正

---

## [1.2.1](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.2.1) (2026-04-06) {#v121}

### 新機能

- **core:** SQSメッセージ操作のための`SqsService`と`SqsClientFactory`を追加 ([詳細を見る](/docs/queue#sqs-service)) ([PR #383](https://github.com/mbc-net/mbc-cqrs-serverless/pull/383))
  - `sendMessage()` — SQSキューへ単一メッセージを送信
  - `sendMessageBatch()` — 1回のAPIコールで最大10件のメッセージを送信
  - `receiveMessages()` — `MaxNumberOfMessages`（デフォルト: 10）と`WaitTimeSeconds`（デフォルト: 0）を設定可能なメッセージ受信
  - `deleteMessage()` — 処理済み単一メッセージの確認・削除
  - `deleteMessageBatch()` — 1回のAPIコールで最大10件のメッセージを削除
  - `SqsService`は`QueueModule`（グローバル）に登録され、アプリケーション全体でインジェクション可能
  - システム属性受信のための`MessageSystemAttributeNames`をサポート（廃止済みの`AttributeNames`は非公開）
- **core:** `SnsClientFactory`をシングルトン`SNSClient`インスタンス方式にリファクタリング ([PR #383](https://github.com/mbc-net/mbc-cqrs-serverless/pull/383))
  - 以前はトピックARNごとに個別クライアントをキャッシュしていたが、全publishコールでシングルインスタンスを共有するように変更
  - `getClient()`のシグネチャが`getClient(topicArn: string)`から`getClient()`に変更

---

## [1.2.0](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.2.0) (2026-04-02) {#v120}

### 破壊的変更

- **core:** `publishSync()`と`publishPartialUpdateSync()`がコマンドに変更がない場合（no-op）に`null`を返すように変更 ([詳細を見る](/docs/command-service#publishsync-null-return)) ([PR #375](https://github.com/mbc-net/mbc-cqrs-serverless/pull/375))
  - 戻り値の型が`Promise<CommandModel>`から`Promise<CommandModel | null>`に変更
  - `publishAsync()`および`publishPartialUpdateAsync()`の既存の挙動に統一
  - 移行方法: 戻り値のプロパティにアクセスする前にnullチェックを追加
- **sequence:** `SequenceService.genNewSequence()`が削除 ([詳細を見る](/docs/sequence#gen-new-sequence-removed)) ([PR #375](https://github.com/mbc-net/mbc-cqrs-serverless/pull/375))
  - 代わりに`generateSequenceItem()`または`generateSequenceItemWithProvideSetting()`を使用

### 新機能

- **core:** `SessionService`と`Repository`によるRead-Your-Writes（RYW）一貫性を追加 ([詳細を見る](/docs/command-service#read-your-writes)) ([PR #375](https://github.com/mbc-net/mbc-cqrs-serverless/pull/375))
  - `publishAsync`後、DynamoDB Streamの同期が完了する前でも同一ユーザーの後続読み取りがペンディングコマンドデータを返すように
  - オプトイン: `RYW_SESSION_TTL_MINUTES`環境変数を設定して有効化（例: `5`）
  - `CommandModule` / `@mbc-cqrs-serverless/core`から`Repository`クラスをエクスポート — `getItem`・`listItemsByPk`・`listItems`でRYWマージを提供
  - セッションテーブル`{NODE_ENV}-{APP_NAME}-session`を作成する必要あり（`dynamodbs/session.json`参照）
  - `RYW_SESSION_TTL_MINUTES`未設定時は無効 — 既存プロジェクトへの影響なし
- **mcp-server:** v1.2.0破壊的変更向けのAP013・AP014アンチパターン検出を追加 ([PR #377](https://github.com/mbc-net/mbc-cqrs-serverless/pull/377))
  - AP013: nullチェックなしで`publishSync`/`publishPartialUpdateSync`の戻り値を使用するパターンを検出
  - AP014: 廃止された`genNewSequence()`の使用を検出
  - `migration_guide`プロンプトにv1.2.0セクションを追加

### バグ修正

- **import:** ZIPオーケストレーターのインポートステータス処理を修正 ([PR #370](https://github.com/mbc-net/mbc-cqrs-serverless/pull/370))
  - `ImportStatusHandler`がジョブ失敗時に`importJobStatus`を含むタスク成功を送信するように修正
  - `ZipImportSfnEventHandler`がCSVタスクの失敗数を集計し最終ジョブステータスを調整

---

## [1.1.5](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.1.5) (2026-03-28) {#v115}

### 新機能

- **import:** 大規模CSVインポート向けv2バッチ処理アーキテクチャを実装 ([詳細を見る](/docs/import-export-patterns#v2-batch-processing)) ([PR #366](https://github.com/mbc-net/mbc-cqrs-serverless/pull/366))
  - 行ごとの`import_tmp`書き込みをLambda内直接コマンドパブリッシュに置き換え、Hot Partitionボトルネックを解消
  - Distributed Mapを`MaxItemsPerBatch: 100`・`MaxConcurrency: 50`に設定し、スループットを大幅向上
  - 新しい`finalize_parent_job`ステートがバッチサマリーを集約し、DynamoDB `UpdateItem`を1回だけ呼び出して最終ステータスを書き込む
  - `CommandFinishedHandler`から行ごとのアトミックカウンター更新を削除し、大規模時のDynamoDBスロットリングを解消
  - `ImportEntityProfile`に`ImportPublishMode`enum（`SYNC` / `ASYNC`）を追加し、エンティティごとのパブリッシュモード設定を可能に
  - 空の`processingResults`ガードを追加: バッチ結果が受信されない場合はジョブを`FAILED`としてマーク

### 破壊的変更

- **import:** CSVインポートでリアルタイムの行レベル進捗追跡が廃止 ([詳細を見る](/docs/import-export-patterns#v2-batch-processing-breaking-changes))
  - `processedRows`・`succeededRows`・`failedRows`カウンターはStep Functions実行完了時に一括集計されるように変更
  - 個別のCSV行は`import_tmp` DynamoDBテーブルに書き込まれなくなった
  - `import-csv`ステートマシンに新しい`finalize_parent_job`ステートと`resultPath: '$.processingResults'`が必要 — CDKと`serverless.yml`をこのパッケージと同時に更新すること

### テスト

- `ImportQueueEventHandler`のSYNC/ASYNCルーティングテストを追加（EQUAL/NOT_EXIST/CHANGED × SYNC/ASYNC + フォールバックの6テストケース）
- `CsvImportSfnEventHandler`の空`processingResults`ガードテストを追加
- バッチ集計テストを追加（1,000 + 500行、COMPLETEDおよびFAILEDシナリオ）

---

## [1.1.4](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.1.4) (2026-03-27) {#v114}

### 新機能

- **core:** `publishSync`の監査証跡とHistoryテーブルの一致を復元 ([詳細を見る](/docs/command-service#publishsync-audit-trail)) ([PR #363](https://github.com/mbc-net/mbc-cqrs-serverless/pull/363))
  - `publishSync`が`status: 'publish_sync:STARTED'`と`syncMode: 'SYNC'`でCommandテーブルに不変イベントを書き込むように
  - `publishSync`がHistoryテーブルに書き込むようになり、非同期Step Functionsパイプラインと一致
  - コマンドライフサイクルが`publish_sync:STARTED` → `finish:FINISHED`（エラー時は`publish_sync:FAILED`）に
  - `publishAsync`から`isNotCommandDirty`早期リターン最適化を移植 — 変更なしの場合は`null`を返す
  - DynamoDB Streamフィルターを更新し`syncMode=SYNC`レコードを除外、Step Functionsの二重実行を防止
  - `DefaultEventFactory`もローカル開発環境向けに`syncMode=SYNC`レコードをフィルタリング

### テスト

- `publishSync`の監査証跡とHistory一致の包括的なテストを追加

---

## [1.1.3](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.1.3) (2026-03-24) {#v113}

### バグ修正

- **import:** CSVインポートのDistributed Mapステート結果が256KB制限を超える問題を修正 ([詳細を見る](/docs/import-export-patterns#csv-total-row-counting)) ([PR #348](https://github.com/mbc-net/mbc-cqrs-serverless/pull/348))
  - Distributed Mapに`resultPath: DISCARD`を設定し、子実行結果がステートデータに集約されることを防止
  - `CsvImportSfnEventHandler`から`MapResult`依存を削除し、代わりにS3から`countCsvRows()`を使用
  - S3ストリームが読み取れない場合のエラーハンドリングを追加

### CI/CD

- npm OIDC trusted publishingに切り替え、`NPM_TOKEN`シークレットへの依存を排除 ([PR #357](https://github.com/mbc-net/mbc-cqrs-serverless/pull/357))
  - 組み込みOIDCサポートのためlernaをv8からv9にアップグレード
  - publishジョブに`id-token: write`パーミッションを追加
  - Node 22+互換性のためlockfile同期ステップを追加

### テスト

- `CsvImportSfnEventHandler`のfinalize_parent_jobロジックの包括的なテストを追加
  - failedRows > 0の場合のFAILEDステータスをテスト
  - 全行成功時のCOMPLETEDステータスをテスト
  - 処理が未完了の場合にステータスが更新されないことをテスト
  - S3ストリームが読み取れない場合のエラーハンドリングをテスト

---

## [1.1.2](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.1.2) (2026-02-25) {#v112}

### 新機能

- **master:** マスター設定とデータのビルトインupsertメソッドを追加 ([詳細を見る](/docs/master#upsert-pattern))
  - MasterSettingService用の`upsertTenantSetting()`、`upsertSetting()`、`upsertBulk()`
  - MasterDataService用の`upsert()`、`upsertSetting()`、`upsertBulk()`
  - 新規レコードの作成、変更レコードの更新、未変更レコードのスキップを自動的に行う
  - ソフト削除されたレコードの再作成をサポート
- **master:** 統合バルクupsert API（`/api/master-bulk/`）を追加 ([詳細を見る](/docs/master#unified-bulk-upsert))
  - 設定とデータの両方を処理する単一エンドポイント
  - `settingCode`フィールドの有無でアイテムをルーティング
  - レスポンスで元の入力順序を保持
  - テナントコードバリデーションを適用
- **master:** すべてのバルクDTOに`@ArrayMaxSize(100)`バリデーションを追加
- **master:** 個別のバルクエンドポイント（`/api/master-setting/bulk`、`/api/master-data/bulk`）にテナントコードバリデーションを追加

### バグ修正

- **core:** `checkVersion`のエラーメッセージが実際の`commandVersion`ではなくハードコードされた値を使用していた問題を修正 ([PR #331](https://github.com/mbc-net/mbc-cqrs-serverless/pull/331))
- **master:** `createSetting`で`seq === 0`がfalsyとして扱われる問題をnullチェック（`seq == null`）に変更して修正
- **master:** `createSetting`でseq変更前にattributesをクローンしてDTOミューテーションを修正

### テスト

- MasterBulkControllerの包括的なユニットテストを追加（8テストケース）
- MasterDataServiceのupsertおよびupsertBulkメソッドのユニットテストを追加
- MasterSettingServiceのupsertTenantSettingおよびupsertBulkメソッドのユニットテストを追加
- マスターデータと設定のupsertシナリオの統合テストを追加

---

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
