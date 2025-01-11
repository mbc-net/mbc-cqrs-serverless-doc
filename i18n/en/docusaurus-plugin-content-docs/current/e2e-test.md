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
import { removeSortKeyVersion } from "@mbc-cqrs-serverless/core";
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

## GitHub Actions Setup

To automate E2E testing in your CI/CD pipeline, you'll need to set up GitHub Actions. Here's a comprehensive guide on configuring GitHub Actions for E2E testing:

### Runner Configuration

Your workflow needs to be configured with appropriate runner settings based on your environment. The specific `runs-on` configuration should be added according to your infrastructure requirements.

Note: When using self-hosted runners, ensure proper configuration of labels and permissions based on your environment setup.

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
```yaml
services:
  dynamodb-local:
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "8000"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
```

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
    runs-on: self-hosted  # Adjust according to your infrastructure setup
    
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
