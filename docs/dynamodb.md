---
description: DynamoDB related recipes
---

# {{DynamoDB}}

{{In the MBC CQRS serverless, DynamoDB tables are organized into three classes based on their purpose.}}

- {{`tasks` table: store information about long-running tasks}}
- {{`sequences` table: holds sequence data}}
- {{other tables: can be divided into three types: command tables (with a `-command` postfix in name), data tables (with a `-data` postfix in name), and history tables (with `-history` posfix in name). You only need to specify the table name, add the name in `prisma/dynamodbs/cqrs.json`, and the command below will create the table for you.}}

{{The table definition is store in `prisma/dynamodbs` folder.}}

{{For local development, run `npm run migrate:ddb` to migrate dynamo table.}}

:::note

{{You can apply migrate both dynamoDB and RDS with singe command: `npm run migrate`.}}

:::

> {{For actions base on Dynamodb, please refer to the [Sequence](./sequence.md) and [CommandModule](./command-module.md) sections.}}
