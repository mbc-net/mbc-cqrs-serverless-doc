---
description: 用語集
---

# 用語集

これは、MBC CQRS サーバーレスフレームワークの中心となる用語の用語集です。

## デザインパターン

### CQRS

コマンド クエリ責任分離 (CQRS) パターンは、データの変更、つまりシステムのコマンド部分をクエリ部分から分離します。スループット、レイテンシ、一貫性などの要件が異なる場合は、CQRS パターンを使用して更新とクエリを分離できます。 CQRS パターンは、アプリケーションをコマンド側とクエリ側の 2 つの部分に分割します。コマンド側は、作成、更新、削除のリクエストを処理します。クエリ側はリードレプリカを使用してクエリ部分を実行します。

![CQRS flow](./images/CQRS.png)

> See: [CQRS パターン](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/cqrs-pattern.html)

### イベントソーシング

イベント ソーシング パターンは通常、読み取りワークロードと書き込みワークロードを分離し、パフォーマンス、スケーラビリティ、セキュリティを最適化するために CQRS パターンとともに使用されます。データは、データ ストアへの直接更新ではなく、一連のイベントとして保存されます。マイクロサービスは、イベント ストアからイベントを再生して、独自のデータ ストアの適切な状態を計算します。このパターンは、アプリケーションの現在の状態を可視化し、アプリケーションがその状態にどのように到達したかについての追加のコンテキストを提供します。コマンド データ ストアとクエリ データ ストアのスキーマが異なる場合でも、特定のイベントのデータを再現できるため、イベント ソーシング パターンは CQRS パターンと効果的に連携します。

> See: [イベントソーシングパターン](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/service-per-team.html)

## ツール/ライブラリ/フレームワーク

### NestJS

Nest (NestJS) は、効率的でスケーラブルな Node.js サーバー側アプリケーションを構築するためのフレームワークです。プログレッシブ JavaScript を使用し、TypeScript で構築され完全にサポートされており (それでも開発者は純粋な JavaScript でコードを作成できます)、OOP (オブジェクト指向プログラミング)、FP (関数型プログラミング)、および FRP (関数型リアクティブ プログラミング) の要素を組み合わせています。

> See: [Introduction](https://docs.nestjs.com/)

### Serverless

サーバーレス フレームワークは、コマンド ライン インターフェイスとオプションのダッシュボードで構成されており、他のクラウド プロバイダーのサポートを強化しながら、コードとインフラストラクチャをアマゾン ウェブ サービスに一緒にデプロイするのに役立ちます。このフレームワークは、簡素化された構文を使用する YAML ベースのエクスペリエンスであり、クラウドの専門家でなくても、複雑なインフラストラクチャ パターンを簡単に展開できます。

> See: [Serverless Framework - An Introduction](https://www.serverless.com/framework/docs#serverless-framework---an-introduction)

### Prisma

Prisma is an ORM for Node.js and Typescript that serves as an alternative to writing plain SQL or using other database access tools, such as Knex or Sequelize. It simplifies database access and management by providing developers with a type-safe query builder and auto-generator.

> See: Prisma は、Node.js および Typescript 用の ORM であり、プレーンな SQL を記述したり、Knex や Sequelize などの他のデータベース アクセス ツールを使用したりする代わりに機能します。タイプセーフなクエリ ビルダーと自動生成機能を開発者に提供することで、データベースのアクセスと管理を簡素化します。
