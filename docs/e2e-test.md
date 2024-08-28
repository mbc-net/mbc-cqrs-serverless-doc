---
description: { { description } }
---

# {{title}}

{{intro_text}}

{{e2e_testing_intro}}

- {{step_1}}
- {{step_2}}
- {{step_3}}
- {{step_4}}

{{scaffolds_intro}}

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
