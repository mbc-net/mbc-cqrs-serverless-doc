---
sidebar_position: 2
description: システム概要、CQRSパターンフロー、イベントソーシングを含むMBC CQRS Serverlessフレームワークアーキテクチャの包括的な概要。
---

# アーキテクチャ

このセクションでは、MBC CQRS Serverlessフレームワークのアーキテクチャの概要を説明します。

## 概要

このフレームワークはAWSサーバーレスサービス上に構築され、スケーラブルでイベント駆動型のアプリケーションのためにCQRSパターンとイベントソーシングを実装しています。

## アーキテクチャセクション

- [システム概要](/docs/architecture/system-overview) - AWSインフラストラクチャコンポーネントとその相互作用。
- [CQRSパターンフロー](/docs/architecture/cqrs-flow) - コマンドとクエリがどのように分離され処理されるか。
- [イベントソーシング](/docs/architecture/event-sourcing) - イベントの保存、リプレイ、プロジェクションメカニズム。

## 主要概念

### CQRS

最適化されたデータ処理のために読み取りと書き込み操作を分離します。

### イベントソーシング

すべての変更をイベントのシーケンスとして保存します。

### サーバーレス

AWS Lambda、DynamoDB、その他のマネージドサービスを活用します。


## Related Documentation

- [システム概要](/docs/architecture/system-overview) - AWSインフラストラクチャ
- [CQRS Flow](/docs/architecture/cqrs-flow) - Command and query flow
- [イベントソーシング](/docs/architecture/event-sourcing) - Event sourcing details
- [Getting Started](/docs/getting-started) - Start building with these concepts
