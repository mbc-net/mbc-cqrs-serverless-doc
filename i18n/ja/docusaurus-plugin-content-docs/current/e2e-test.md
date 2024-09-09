---
description: e2e(エンドツーエンド)の方法を学びましょう。
---

# e2e(エンドツーエンド)テスト

個々のモジュールやクラスに焦点を当てた単体テストとは異なり、エンドツーエンド (e2e) テストは、クラスとモジュールの相互作用をより集合的なレベルでカバーします。これは、エンドユーザーが本番環境と行う相互作用に近いものです。システム。アプリケーションが成長するにつれて、各 API エンドポイントのエンドツーエンドの動作を手動でテストすることが困難になります。自動化されたエンドツーエンド テストは、システムの全体的な動作が正しく、プロジェクトの要件を満たしていることを確認するのに役立ちます。

e2e testing tests the API in a real environment, so there’s no need to mock any services. To summarize, there are five main steps for writing an e2e test:

- 必要なデータを作成します。
- Supertest ライブラリを使用して API 呼び出しを行い、HTTP リクエストをシミュレートします。
- データが正しいかどうかを確認してください
- データをクリアする

これはアプリケーションのスキャフォールドのデフォルトの e2e テストです

```ts
import { removeSortKeyVersion } from "@mbc-cqrs-severless/core";
import request from "supertest";
import config from "test/lib/config";
import { getItem, getTableName, TableType } from "test/lib/dynamo-client";
import prismaClient from "test/lib/prisma-client";
import { readMockData, syncDataFinished } from "test/lib/utils";

const createApplicationData = readMockData("cat-create.json");
const BASE_API_PATH = "/api/cat";

jest.setTimeout(90000);

describe("Cat", () => {
  beforeAll(async () => {
    // TODO: 1 create necessary data
  });

  it("", async () => {
    // TODO: 2,3 make API calls and assert
  });

  afterAll(async () => {
    // TODO: 4 clean data
  });
});
```
