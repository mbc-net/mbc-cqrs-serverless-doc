---
sidebar_position: 101
sidebar_label: "フロントエンド（Web）"
description: MBC CQRS Serverless Webパッケージのすべての注目すべき変更、新機能、バグ修正を追跡します。
---

# Webパッケージ変更履歴

Webパッケージ（`@mbc-cqrs-serverless/master-web`、`@mbc-cqrs-serverless/survey-web`）のすべての注目すべき変更はここに記載されています。

バックエンドフレームワークの変更については、[変更履歴](/docs/changelog)を参照してください。

---

## [0.0.42](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.41...v0.0.42) (2026-02-11) {#v0042}

### master-web

#### バグ修正

- React/Next.jsをpeer dependencyに外部化してContext分離問題を解消 ([詳細を見る](/docs/master-web#nextjs-app-router-integration)) ([PR #23](https://github.com/mbc-net/mbc-cqrs-serverless-web/pull/23))
  - React、React DOM、Next.jsがバンドル依存関係ではなく`peerDependencies`として設定されるようになりました
  - これにより、ホストアプリケーションのReactインスタンスが共有され、重複するReactコンテキストが防止されます
  - npmパッケージでのコンテキスト分離に起因する`httpClient.get is not a function`エラーを解消します
- `useSubscribeBulkCommandStatus`の無限再レンダリングループを修正
  - 一括コマンドステータス更新のリスニング時に不要な再レンダリングを防止するためにフックの依存関係を安定化
- DragResizeModalとAddJsonDataのレイアウト問題を修正
  - モーダルリサイズハンドルとJSONデータインポートフォームのレイアウトレンダリングを修正

#### テスト

- テストフレームワークをVitestからJestに移行（87テスト）
  - 既存のすべてのテストをJest構文に変換し、通過を確認
  - フックとコンポーネントの包括的なテストカバレッジを追加

### survey-web

#### バグ修正

- ReactとReact DOMをpeer dependencyに外部化してContext分離問題を解消 ([PR #23](https://github.com/mbc-net/mbc-cqrs-serverless-web/pull/23))
  - master-webと同じ修正：ホストアプリケーションとのReactインスタンス共有を保証

#### テスト

- テストフレームワークをVitestからJestに移行
  - 一貫性のためにmaster-webとテストインフラを統一

---

## [0.0.41](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.40...v0.0.41) (2026-02-10) {#v0041}

### 機能

- **master-web:** RichTextEditorとfield-editorのツールバーオプションとカラーパレットを強化

---

## [0.0.40](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.39...v0.0.40) (2026-01-27) {#v0040}

### 機能

- **master-web:** カスタムブロック登録によるReactQuill統合の強化

---

## [0.0.39](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.38...v0.0.39) (2025-12-18) {#v0039}

### バグ修正

- **survey-web:** 日本語テキスト表示の問題を修正

### 機能

- **survey-web:** アンケート質問の正規表現バリデーションロジックを追加

---

## [0.0.38](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.37...v0.0.38) (2025-12-18) {#v0038}

### 機能

- **survey-web:** 未保存のスキーマ変更がある場合にナビゲーション時に確認モーダルを表示

---

## [0.0.37](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.36...v0.0.37) (2025-12-17) {#v0037}

### 機能

- **survey-web:** QuestionCreatorでタイプ固有のフィールドクリアを実装
- **survey-web:** 日本語テキストのローカライズ、「その他」オプションのサポート、CSSの改善を追加

---

## [0.0.36](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.35...v0.0.36) (2025-12-15) {#v0036}

### バグ修正

- **survey-web:** 短いテキストと長いテキストの質問クリエーターにデフォルトバリデーションルールを設定

---

## [0.0.35](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.34...v0.0.35) (2025-12-14) {#v0035}

### 機能

- **survey-web:** 短いテキスト質問に数値バリデーションルールを追加

---

## [0.0.34](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.33...v0.0.34) (2025-12-12) {#v0034}

### バグ修正

- **survey-web:** 値の数値処理とアンケートクリエーターのエクスポートを修正

### 機能

- **survey-web:** 外部使用のためにアンケートクリエーターコンポーネントをエクスポート

---

## [0.0.33](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.32...v0.0.33) (2025-12-08) {#v0033}

### 機能

- **survey-web:** 長いテキスト、短いテキスト、日付、リニアスケールのバリデーションオプションとプレースホルダーを日本語にローカライズ

---

## [0.0.32](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.31...v0.0.32) (2025-11-25) {#v0032}

### 機能

- **survey-web:** 質問IDとラベルの同期、および管理セクションへのルーティングパスの更新

---

## [0.0.31](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.30...v0.0.31) (2025-11-19) {#v0031}

### バグ修正

- **master-web:** EditMasterDataコンポーネントの正規表現バリデーションのエラーメッセージをより使いやすく更新

---

## [0.0.30](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.29...v0.0.30) (2025-11-14) {#v0030}

### 機能

- **master-web:** マスターデータフォーム用のattributesオブジェクトを構築するヘルパー関数を実装

---

## [0.0.29](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.28...v0.0.29) (2025-11-12) {#v0029}

### 機能

- **master-web:** MasterDataとMasterSettingコンポーネントにクリアボタン機能を追加

---

## [0.0.28](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.27...v0.0.28) (2025-11-11) {#v0028}

### 機能

- **master-web:** AddFieldsFormの文字列データ型に正規表現パターンバリデーションと入力フィールドを追加

---

## [0.0.27](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.26...v0.0.27) (2025-11-10) {#v0027}

### 機能

- **master-web:** AddJsonDataコンポーネントにAPIレスポンスのエラーハンドリングを追加
- **master-web:** ImportJSONButtonのファイル読み取りエラー処理と同じファイルの再選択を改善

---

## [0.0.26](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.25...v0.0.26) (2025-11-10) {#v0026}

### 機能

- **survey-web:** SurveyFormコンポーネントのchildren対応と無効状態処理を強化

---

## [0.0.25](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.24...v0.0.25) (2025-11-06) {#v0025}

### 機能

- **survey-web:** ドロップダウンとlong-textコンポーネントの日本語プレースホルダーテキストを更新

---

## [0.0.24](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.23...v0.0.24) (2025-11-06) {#v0024}

### 機能

- **survey-web:** OptionsCreatorのオプション処理を更新してラベルと値フィールドを同期

---

## [0.0.23](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.22...v0.0.23) (2025-11-04) {#v0023}

### 機能

- **master-web:** AddJsonDataコンポーネントに一括データインポート用のマッピング機能とバリデーションを強化

---

## [0.0.22](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.21...v0.0.22) (2025-10-31) {#v0022}

### 機能

- **master-web:** マスター設定のインポートデータと設定機能を強化

---

## [0.0.21](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.20...v0.0.21) (2025-10-29) {#v0021}

### 機能

- **master-web:** 一括インポート対応のマスター設定の強化
- **master-web:** 一括データインポート用の一括コマンドステータスフックの実装とコンポーネントの更新

---

## [0.0.17](https://github.com/mbc-net/mbc-cqrs-serverless-web/compare/v0.0.15...v0.0.17) (2025-10-16) {#v0017}

### 機能

- master-webとsurvey-webパッケージによる初期モノレポセットアップ
- **master-web:** 新しいモノレポファイル構造に移行
- **survey-web:** 初期サーベイライブラリの実装

### バグ修正

- package-lock.jsonの依存関係の競合を解消
- npm overridesを使用してpicomatchの依存関係の競合を解消
- バージョン番号の修正とLernaワークフローの改善

---

## 関連リンク

- [GitHub Repository](https://github.com/mbc-net/mbc-cqrs-serverless-web)
- [master-web npm Package](https://www.npmjs.com/package/@mbc-cqrs-serverless/master-web)
- [survey-web npm Package](https://www.npmjs.com/package/@mbc-cqrs-serverless/survey-web)
- [マスターWebドキュメント](/docs/master-web)
- [サーベイWebドキュメント](/docs/survey-web)
