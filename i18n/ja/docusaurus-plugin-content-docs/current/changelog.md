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
