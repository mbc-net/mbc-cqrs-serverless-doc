---
description: DynamoDB関連のレシピ。
---

# DynamoDB

MBC CQRS サーバーレスでは、DynamoDB テーブルは目的に基づいて 3 つのクラスに編成されます。

- `tasks` テーブル: 長時間実行されるタスクに関する情報を保存します。
- `sequences` テーブル: シーケンス データを保持します。
- その他のテーブル: コマンド テーブル (名前に `-command` 接尾辞が付いている)、データ テーブル (名前に `-data` 接尾辞が付いている)、および履歴テーブル (名前に `-history` 接尾辞が付いている) の 3 つのタイプに分類できます。 ）。テーブル名を指定し、`prisma/dynamodbs/cqrs.json` に名前を追加するだけで、以下のコマンドでテーブルが作成されます。

テーブル定義は `prisma/dynamodbs` ディレクトリに保存されます。

ローカル開発の場合は、「npm run merge:ddb」を実行してDynamoDBテーブルを移行します。

:::note

`npm run merge` の1 つのコマンドで、DynamoDB と RDS の両方の移行を適用できます。

:::

> DynamoDB に基づくアクションについては、[Sequence](./sequence.md) および [CommandModule](./command-module.md) セクションを参照してください。
