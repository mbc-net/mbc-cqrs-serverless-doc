---
description: Learn how to write e2e test
---

# End-to-end test

Unlike unit testing, which focuses on individual modules and classes, end-to-end (e2e) testing covers the interaction of classes and modules at a more aggregate level -- closer to the kind of interaction that end-users will have with the production system. As an application grows, it becomes hard to manually test the end-to-end behavior of each API endpoint. Automated end-to-end tests help us ensure that the overall behavior of the system is correct and meets project requirements.

e2e testing tests the API in a real environment, so there’s no need to mock any services. To summarize, there are five main steps for writing an e2e test:

- Create necessary data.
- Make API calls using the Supertest library to simulate HTTP requests.
- Check data is correct or not
- Clean data

Here is the scaffolds default e2e tests for applications:

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
