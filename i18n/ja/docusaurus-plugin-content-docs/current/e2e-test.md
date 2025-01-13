---
description: e2e(エンドツーエンド)の方法を学びましょう。
---

# e2e(エンドツーエンド)テスト

個々のモジュールやクラスに焦点を当てた単体テストとは異なり、エンドツーエンド (e2e) テストは、クラスとモジュールの相互作用をより集合的なレベルでカバーします。これは、エンドユーザーが本番環境と行う相互作用に近いものです。システム。アプリケーションが成長するにつれて、各 API エンドポイントのエンドツーエンドの動作を手動でテストすることが困難になります。自動化されたエンドツーエンド テストは、システムの全体的な動作が正しく、プロジェクトの要件を満たしていることを確認するのに役立ちます。

e2e(エンドツーエンド) テストでは実際の環境で API をテストするため、サービスをモックする必要はありません。要約すると、e2e(エンドツーエンド) テストを作成するには 5 つの主な手順があります。

- 必要なデータを作成します。
- Supertest ライブラリを使用して API 呼び出しを行い、HTTP リクエストをシミュレートします。
- データが正しいかどうかを確認してください
- データをクリアする

これはアプリケーションのスキャフォールドのデフォルトの e2e(エンドツーエンド) テストです

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

## GitHub Actions のセットアップ

CI/CD パイプラインで E2E テストを自動化するには、GitHub Actions のセットアップが必要です。以下は、E2E テスト用の GitHub Actions を設定するための包括的なガイドです。

### ランナーの設定

ワークフローは、環境に応じて適切なランナー設定を行う必要があります。MBC-NET のリポジトリでは、ランナーの設定は以下のように正確に指定する必要があります：

```yaml
runs-on: [self-hosted, linux, ARM64]
```

重要な注意点：
- 大文字・小文字の区別が重要：'ARM64' は大文字でなければなりません
- 'linux' は小文字でなければなりません
- 3つのラベルすべてが必要です
- ラベルの順序は重要です

セルフホストランナーを使用する場合は、環境のセットアップに基づいて、ラベルと権限の適切な設定を確認してください。

### 環境のセットアップ

ワークフローには以下のサービスと設定が必要です：

1. Docker サービス：
   - DynamoDB Local
   - Cognito Local
   - LocalStack
   - ElasticMQ

2. ディレクトリの権限設定：
```yaml
- name: Set up permissions
  run: |
    sudo mkdir -p /var/lib/docker/volumes
    sudo chmod -R 777 /var/lib/docker/volumes
    
    # 必要なディレクトリの作成
    sudo mkdir -p infra-local/docker-data/{.cognito,.dynamodb,.mysql,.localstack,.elasticmq}
    sudo chown -R $USER:$USER infra-local
    sudo chmod -R 777 infra-local/docker-data
```

3. Docker コンテナのヘルスチェック：

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

### サービスの設定

各サービスは以下の設定が必要です：

1. Dockerfile での適切なユーザー権限：
```dockerfile
RUN adduser -D -u 1001 serviceuser && \
    mkdir -p /app/data && \
    chown -R serviceuser:serviceuser /app
USER serviceuser
```

2. ボリューム管理：
```yaml
volumes:
  service-data:
    driver: local
```

3. ヘルスチェックの仕組み：
```yaml
healthcheck:
  test: ["CMD", "nc", "-z", "localhost", "PORT"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 15s
```

### ワークフローの例

以下は E2E テスト用の GitHub Actions ワークフローの完全な例です：

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
    # 環境要件に基づいてruns-onを設定
    runs-on: self-hosted  # インフラストラクチャのセットアップに応じて調整
    
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
          
          # 必要なディレクトリの作成
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
