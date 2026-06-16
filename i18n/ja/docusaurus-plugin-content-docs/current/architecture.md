---
sidebar_position: 2
description: システム概要、CQRSパターンフロー、イベントソーシング、Step Functions、CDKインフラストラクチャを含むMBC CQRS Serverlessフレームワークアーキテクチャの包括的な概要。
---

# アーキテクチャ

このセクションでは、MBC CQRS Serverlessフレームワークのアーキテクチャの概要を説明します。

## 概要 {#overview}

このフレームワークはAWSサーバーレスサービス上に構築され、スケーラブルでイベント駆動型のアプリケーションのためにCQRSパターンとイベントソーシングを実装しています。

## アーキテクチャセクション {#architecture-sections}

- [システム概要](/docs/architecture/system-overview) - AWSインフラストラクチャコンポーネントとその相互作用。
- [CQRSパターンフロー](/docs/architecture/cqrs-flow) - コマンドとクエリがどのように分離され処理されるか。
- [イベントソーシング](/docs/architecture/event-sourcing) - イベントの保存、リプレイ、プロジェクションメカニズム。
- [Step Functions](/docs/architecture/step-functions) - 非同期タスク処理のためのワークフローオーケストレーション。
- [CDKインフラストラクチャ](/docs/architecture/cdk-infrastructure) - AWS CDKインフラストラクチャのプロビジョニングと設定。

## 主要概念 {#key-concepts}

### CQRS

最適化されたデータ処理のために読み取りと書き込み操作を分離します。

### イベントソーシング

すべての変更をイベントのシーケンスとして保存します。

### サーバーレス

AWS Lambda、DynamoDB、その他のマネージドサービスを活用します。


## 関連ドキュメント

- [はじめに](/docs/getting-started) - フレームワークの紹介
- [インストール](/docs/installation) - ローカル環境をセットアップする
- [バックエンド開発](/docs/backend-development) - これらのパターンを使用して機能を実装する
- [キーパターン](/docs/key-patterns) - DynamoDBのPK/SK設計
- [用語集](/docs/glossary) - フレームワーク用語リファレンス
