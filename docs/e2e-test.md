---
description: {{Learn how to write and run end-to-end tests for MBC CQRS Serverless applications using Jest and LocalStack.}}
---

# {{End-to-end Tests}}

{{Unlike unit testing, which focuses on individual modules and classes, end-to-end (e2e) testing covers the interaction of classes and modules at a more aggregate level — closer to the kind of interaction that end-users will have with the production system. As an application grows, it becomes hard to manually test the end-to-end behavior of each API endpoint. Automated end-to-end tests help us ensure that the overall behavior of the system is correct and meets project requirements.}}

{{E2E tests run against the API in a real local environment so you do not need to mock any services. The main steps for writing an e2e test are:}}

- {{Create necessary data.}}
- {{Make API calls using the Supertest library to simulate HTTP requests.}}
- {{Verify the response data is correct.}}
- {{Clean up test data.}}

:::warning {{Test Execution Order}}
{{E2E tests that share database state should run sequentially to avoid race conditions. Use the `--runInBand` flag to disable parallel execution:}}

```bash
# {{Run E2E tests sequentially}}
jest --runInBand test/e2e

# {{Update the test:e2e script in package.json (the generated default does not include --runInBand)}}
"test:e2e": "jest --runInBand --config ./test/jest-e2e.json"
```

{{Without `--runInBand`, Jest runs tests in parallel across multiple workers, which can cause:}}
- {{Data conflicts when tests modify the same records}}
- {{Flaky tests due to timing issues}}
- {{Cleanup operations affecting other running tests}}
:::

{{Here is a basic structure for e2e tests:}}

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
  it("{{should create a new cat}}", async () => {
    // {{Arrange - define test data inline}}
    const payload = {
      pk: "CAT#tenant1",
      sk: "CAT#001",
      id: "CAT#tenant1#CAT#001",
      name: "Whiskers",
      version: 0,
      code: "001",
      type: "CAT",
    };

    // {{Action - make API call}}
    const res = await request(config.apiBaseUrl).post(API_PATH).send(payload);

    // {{Assert - verify response and data}}
    expect(res.statusCode).toEqual(201);

    // {{Wait for async processing to complete}}
    await syncDataFinished("cat_table", {
      pk: payload.pk,
      sk: `${payload.sk}@1`,
    });

    // {{Verify data in DynamoDB}}
    const data = await getItem(getTableName("cat_table", TableType.DATA), {
      pk: payload.pk,
      sk: payload.sk,
    });

    expect(data).toMatchObject({
      ...payload,
      version: 1,
    });
  }, 40000);

  // {{Clean up test data if needed}}
  afterAll(async () => {
    await deleteItem(getTableName("cat_table", TableType.DATA), {
      pk: "CAT#tenant1",
      sk: "CAT#001",
    });
  });
});
```

### {{Test Helper Utilities}}

{{The framework provides helper utilities for e2e testing:}}

#### {{config.ts - Environment Configuration}}

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

#### {{dynamo-client.ts - DynamoDB Operations}}

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

const putItem = async (tableName: string, item: Record<string, unknown>) => {
  await dynamoClient.send(
    new PutItemCommand({
      TableName: tableName,
      Item: marshall(item),
    })
  );
};

const deleteItem = async (tableName: string, key: { pk: string; sk: string }) => {
  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: tableName,
      Key: marshall(key),
    })
  );
};

export { getItem, putItem, deleteItem, getTableName, TableType, dynamoClient };
```

#### {{utils.ts - Test Utilities}}

```ts
import { getItem, getTableName, TableType } from "./dynamo-client";

const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

const retry = async <T>(
  fn: () => Promise<T> | T,
  { retries, retryIntervalMs }: { retries: number; retryIntervalMs: number }
): Promise<T> => {
  try {
    await sleep(retryIntervalMs);
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await sleep(retryIntervalMs);
    return retry(fn, { retries: retries - 1, retryIntervalMs });
  }
};

// {{Wait for async command processing to finish}}
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

## {{GitHub Actions Setup}} {#github-actions-setup}

{{To automate E2E testing in your CI/CD pipeline, you'll need to set up GitHub Actions. Here's a comprehensive guide on configuring GitHub Actions for E2E testing:}}

### {{Environment Setup}}

{{The workflow requires several services and configurations:}}

1. {{Docker Services}}:
   - DynamoDB Local
   - Cognito Local
   - LocalStack
   - ElasticMQ

2. {{Directory Permissions}}:
```yaml
- name: Set up permissions
  run: |
    sudo mkdir -p /var/lib/docker/volumes
    sudo chmod -R 777 /var/lib/docker/volumes
    
    # {{Create required directories}}
    sudo mkdir -p infra-local/docker-data/{.cognito,.dynamodb,.mysql,.localstack,.elasticmq}
    sudo chown -R $USER:$USER infra-local
    sudo chmod -R 777 infra-local/docker-data
```

3. {{Docker Container Health Checks}}:

{{Docker container health checks are important for monitoring container status. When configuring health checks, consider the following two contexts:}}

a) {{Health check from inside Docker container}}:
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

b) {{Health check from GitHub Actions workflow}}:
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

{{Notes:}}
- {{Inside Docker containers, use service names (e.g., dynamodb-local) to access services}}
- {{In GitHub Actions workflow steps, use localhost (via port forwarding)}}
- {{For more robust health checks, use actual API calls instead of simple connection checks (nc command)}}
- {{If network issues occur, check the following:}}
  - {{Docker Compose network settings}}
  - {{Port mapping configuration}}
  - {{Container name resolution}}
  - {{GitHub Actions runner environment variables}}

### {{Service Configuration}}

{{Each service should be configured with:}}

1. {{Proper user permissions in Dockerfile}}:
```dockerfile
RUN adduser -D -u 1001 serviceuser && \
    mkdir -p /app/data && \
    chown -R serviceuser:serviceuser /app
USER serviceuser
```

2. {{Volume management}}:
```yaml
volumes:
  service-data:
    driver: local
```

3. {{Health check mechanisms}}:
```yaml
healthcheck:
  test: ["CMD", "nc", "-z", "localhost", "PORT"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 15s
```

### {{Workflow Example}}

{{Here's a complete example of a GitHub Actions workflow for E2E testing:}}

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
    runs-on: ubuntu-latest # {{Adjust to self-hosted if your environment requires access to private VPC resources}}

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
          
          # {{Create required directories}}
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


## {{Related Documentation}}

- [{{Unit Testing}}](/docs/unit-test) - {{Unit testing with Jest}}
- [{{Testing}}](/docs/testing) - {{Testing overview}}
- [{{Deployment Guide}}](/docs/deployment-guide) - {{Deploy for integration testing}}
