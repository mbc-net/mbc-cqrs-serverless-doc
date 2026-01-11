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

## [1.0.20](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.20) (2026-01-11) {#v1020}

### バグ修正

- **import:** Step Functions CSVハンドラーが子ジョブ失敗に関わらず常にCOMPLETEDステータスを設定する問題を修正
  - `CsvImportSfnEventHandler.finalizeParentJob()`で子ジョブ失敗時に正しくFAILEDステータスを設定するよう修正
  - `csv_loader`状態での`CsvImportSfnEventHandler`で、失敗がある早期終了時に正しくステータスを設定するよう修正
  - 以前は三項演算子が誤って両方のケースでCOMPLETEDを返していた: `failedRows > 0 ? COMPLETED : COMPLETED`
  - failedRows > 0の場合、正しくFAILEDを返すよう修正: `failedRows > 0 ? FAILED : COMPLETED`
  - このバグにより、子インポートジョブが失敗してもStep FunctionsがSUCCESSを報告していた
  - 詳細は[CsvImportSfnEventHandler](./import-export-patterns#csvimportsfneventhandler)を参照

---

## [1.0.19](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.19) (2026-01-11) {#v1019}

### バグ修正

- **import:** 子インポートジョブ失敗時にマスタージョブステータスがFAILEDに更新されない問題を修正
  - 以前は、`ConditionalCheckFailedException`などのエラーで子インポートジョブが失敗した場合、マスタージョブのステータスが`PROCESSING`のまま無期限に留まっていた
  - `incrementParentJobCounters`で子ジョブ失敗時に正しく`FAILED`ステータスを設定するよう修正（以前は常に`COMPLETED`を設定していた）
  - `ImportQueueEventHandler.handleImport`でエラー時に`incrementParentJobCounters`を呼び出すよう修正し、親カウンターが更新されることを保証
  - Lambdaクラッシュを防ぎ適切なステータス伝播を可能にするため、エラーハンドラーから`throw error`を削除
  - この修正はv1.0.18で開始されたStep Functionsエラーハンドリングを完成させ、`SendTaskFailure`が適切にトリガーされることを保証
  - 詳細は[ImportQueueEventHandler エラーハンドリング](./import-export-patterns#import-error-handling)を参照

---

## [1.0.18](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.18) (2026-01-10) {#v1018}

### バグ修正

- **import:** Step Functionsエラーハンドリングのため`ImportStatusHandler`に`SendTaskFailure`サポートを追加
  - 以前は、インポートジョブが失敗した場合、`SendTaskSuccess`のみが実装されていたためStep Functionが無期限に待機していた
  - ジョブ失敗時にハンドラーが適切に`SendTaskFailure`を送信するようになり、Step Functionsがエラーを正しく処理可能に
  - `SendTaskFailureCommand`を送信する`sendTaskFailure()`メソッドを追加
  - CSVインポートジョブで`COMPLETED`と`FAILED`の両方のステータスを処理するよう対応
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

## [1.0.0](https://github.com/mbc-net/mbc-cqrs-serverless/releases/tag/v1.0.0) (2025-09-18)

### ハイライト

- 初の安定版プロダクションリリース
- ベータ版0.1.74がベース

---

## ベータリリース (0.1.x)

## [0.1.75-beta.0](https://github.com/mbc-net/mbc-cqrs-serverless/compare/v0.1.74-beta.0...v0.1.75-beta.0)

### バグ修正

- **import:** Step Functionsエラーハンドリングのため`ImportStatusHandler`に`SendTaskFailure`サポートを追加
  - 以前は、インポートジョブが失敗した場合、`SendTaskSuccess`のみが実装されていたためStep Functionが無期限に待機していた
  - ジョブ失敗時にハンドラーが適切に`SendTaskFailure`を送信するようになり、Step Functionsがエラーを正しく処理可能に
  - `SendTaskFailureCommand`を送信する`sendTaskFailure()`メソッドを追加
  - CSVインポートジョブで`COMPLETED`と`FAILED`の両方のステータスを処理するよう対応
  - 詳細は[ImportStatusHandler API](#importstatushandler-api)を参照

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
