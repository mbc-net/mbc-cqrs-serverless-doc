---
description: Learn how to write e2e test
---

# End-to-end test

Unlike unit testing, which focuses on individual modules and classes, end-to-end (e2e) testing covers the interaction of classes and modules at a more aggregate level -- closer to the kind of interaction that end-users will have with the production system. As an application grows, it becomes hard to manually test the end-to-end behavior of each API endpoint. Automated end-to-end tests help us ensure that the overall behavior of the system is correct and meets project requirements.

e2e testing tests the API in a real environment so you do not need to mock any services. The main steps for writing an e2e test are:

- Create necessary data.
- Make API calls using the Supertest library to simulate HTTP requests.
- Check data is correct or not
- Clean data

:::warning Test Execution Order
E2E tests that share database state should run sequentially to avoid race conditions. Use the `--runInBand` flag to disable parallel execution:

```bash
# Run E2E tests sequentially
jest --runInBand test/e2e

# Or in package.json
"test:e2e": "jest --runInBand --config ./test/jest-e2e.json"
```

Without `--runInBand`, Jest runs tests in parallel across multiple workers, which can cause:
- Data conflicts when tests modify the same records
- Flaky tests due to timing issues
- Cleanup operations affecting other running tests
:::

Here is a basic structure for e2e tests:

```ts
import request from "supertest";
import { config } from "./config";
import {
  deleteItem,
  getItem,
  getTableName,
  putItem,
  TableType,
} from "./dynamo-client";
import { syncDataFinished } from "./utils";

const API_PATH = "/api/cat";

describe("Cat", () => {
  it("should create a new cat", async () => {
    // Arrange - define test data inline
    const payload = {
      pk: "CAT#TENANT1",
      sk: "cat#001",
      id: "CAT#TENANT1#cat#001",
      name: "Whiskers",
      version: 0,
      code: "cat#001",
      type: "CAT",
    };

    // Action - make API call
    const res = await request(config.apiBaseUrl).post(API_PATH).send(payload);

    // Assert - verify response and data
    expect(res.statusCode).toEqual(201);

    // Wait for async processing to complete
    await syncDataFinished("cat_table", {
      pk: payload.pk,
      sk: `${payload.sk}@1`,
    });

    // Verify data in DynamoDB
    const data = await getItem(getTableName("cat_table", TableType.DATA), {
      pk: payload.pk,
      sk: payload.sk,
    });

    expect(data).toMatchObject({
      ...payload,
      version: 1,
    });
  }, 40000);

  // Clean up test data if needed
  afterAll(async () => {
    await deleteItem(getTableName("cat_table", TableType.DATA), {
      pk: "CAT#TENANT1",
      sk: "cat#001",
    });
  });
});
```

### Test Helper Utilities

The framework provides helper utilities for e2e testing:

#### config.ts - Environment Configuration

```ts
import dotenv from "dotenv";

dotenv.config();

const config = {
  nodeEnv: process.env.NODE_ENV,
  appName: process.env.APP_NAME,
  dynamoEndpoint: process.env.DYNAMODB_ENDPOINT,
  dynamoRegion: process.env.DYNAMODB_REGION,
  apiBaseUrl: process.env.API_BASE_URL || "http://0.0.0.0:3000",
};

export { config };
```

#### dynamo-client.ts - DynamoDB Operations

```ts
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { config } from "./config";

const tablePrefix = `${config.nodeEnv}-${config.appName}-`;

enum TableType {
  COMMAND = "command",
  DATA = "data",
  HISTORY = "history",
}

const dynamoClient = new DynamoDBClient({
  endpoint: config.dynamoEndpoint,
  region: config.dynamoRegion,
});

const getTableName = (tableName: string, tableType: TableType) => {
  return `${tablePrefix}${tableName}-${tableType}`;
};

const getItem = async (tableName: string, key: { pk: string; sk: string }) => {
  const { Item } = await dynamoClient.send(
    new GetItemCommand({
      TableName: tableName,
      Key: marshall(key),
    })
  );
  return Item ? unmarshall(Item) : undefined;
};

export { getItem, getTableName, TableType, dynamoClient };
```

#### utils.ts - Test Utilities

```ts
import { getItem, getTableName, TableType } from "./dynamo-client";

const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

const retry = async <T>(
  fn: () => Promise<T>,
  options: { retries: number; retryIntervalMs: number }
): Promise<T> => {
  try {
    await sleep(options.retryIntervalMs);
    return await fn();
  } catch (error) {
    if (options.retries <= 0) throw error;
    return retry(fn, {
      retries: options.retries - 1,
      retryIntervalMs: options.retryIntervalMs,
    });
  }
};

// Wait for async command processing to finish
const syncDataFinished = async (
  tableName: string,
  key: { pk: string; sk: string }
) => {
  await retry(
    async () => {
      const res = await getItem(getTableName(tableName, TableType.COMMAND), key);
      if (res?.status === "finish:FINISHED") return;
      throw new Error("Not finished yet");
    },
    { retries: 10, retryIntervalMs: 3000 }
  );
};

export { retry, sleep, syncDataFinished };
```

## GitHub Actions Setup

To automate E2E testing in your CI/CD pipeline, you'll need to set up GitHub Actions. Here's a comprehensive guide on configuring GitHub Actions for E2E testing:

### Environment Setup

The workflow requires several services and configurations:

1. Docker Services:
   - DynamoDB Local
   - Cognito Local
   - LocalStack
   - ElasticMQ

2. Directory Permissions:
```yaml
- name: Set up permissions
  run: |
    sudo mkdir -p /var/lib/docker/volumes
    sudo chmod -R 777 /var/lib/docker/volumes
    
    # Create required directories
    sudo mkdir -p infra-local/docker-data/{.cognito,.dynamodb,.mysql,.localstack,.elasticmq}
    sudo chown -R $USER:$USER infra-local
    sudo chmod -R 777 infra-local/docker-data
```

3. Docker Container Health Checks:

Docker コンテナのヘルスチェックは、コンテナの状態を監視するために重要です。ヘルスチェックの設定には、以下の2つのコンテキストを考慮する必要があります：

a) Docker コンテナ内部からのヘルスチェック:
```yaml
services:
  dynamodb-local:
    healthcheck:
      test: ["CMD-SHELL", "curl -f -X POST -H 'Content-Type: application/x-amz-json-1.0' -H 'X-Amz-Target: DynamoDB_20120810.ListTables' -d '{}' http://dynamodb-local:8000 || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
```

b) GitHub Actions ワークフローからのヘルスチェック:
```yaml
steps:
  - name: Wait for DynamoDB
    run: |
      attempt=1
      max_attempts=20
      until curl -s -f -X POST \
        -H "Content-Type: application/x-amz-json-1.0" \
        -H "X-Amz-Target: DynamoDB_20120810.ListTables" \
        -d "{}" \
        http://localhost:8000 > /dev/null; do
        if [ $attempt -eq $max_attempts ]; then
          echo "DynamoDB failed to start after $max_attempts attempts"
          exit 1
        fi
        echo "Waiting for DynamoDB... (attempt $attempt/$max_attempts)"
        sleep 15
        attempt=$((attempt + 1))
      done
```

注意：
- Docker コンテナ内部では、サービス名（例：dynamodb-local）を使用してサービスにアクセスします
- GitHub Actions のワークフローステップでは localhost を使用します（ポートフォワーディングにより）
- より堅牢なヘルスチェックのために、単純な接続チェック（nc コマンド）ではなく、実際の API コールを使用することを推奨します
- ネットワークの問題が発生した場合は、以下を確認してください：
  - Docker Compose のネットワーク設定
  - ポートマッピングの設定
  - コンテナ間の名前解決
  - GitHub Actions ランナーの環境変数

### Service Configuration

Each service should be configured with:

1. Proper user permissions in Dockerfile:
```dockerfile
RUN adduser -D -u 1001 serviceuser && \
    mkdir -p /app/data && \
    chown -R serviceuser:serviceuser /app
USER serviceuser
```

2. Volume management:
```yaml
volumes:
  service-data:
    driver: local
```

3. Health check mechanisms:
```yaml
healthcheck:
  test: ["CMD", "nc", "-z", "localhost", "PORT"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 15s
```

### Workflow Example

Here's a complete example of a GitHub Actions workflow for E2E testing:

```yaml
name: E2E Tests
on:
  push:
    paths:
      - 'src/**'
      - 'test/**'
      - 'infra/**'
      - '.github/workflows/**'
      - 'package.json'

jobs:
  e2e-tests:
    # Configure runs-on based on your environment requirements
    # runs-on: self-hosted  # Adjust according to your infrastructure setup
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          
      - name: Set up environment
        run: |
          sudo mkdir -p /var/lib/docker/volumes
          sudo chmod -R 777 /var/lib/docker/volumes
          
          # Create required directories
          sudo mkdir -p infra-local/docker-data/{.cognito,.dynamodb,.mysql,.localstack,.elasticmq}
          sudo chown -R $USER:$USER infra-local
          sudo chmod -R 777 infra-local/docker-data
          
      - name: Start services
        run: |
          docker-compose down -v
          docker-compose build --no-cache
          docker-compose up -d
          
      - name: Run tests
        run: npm run test:e2e
```
