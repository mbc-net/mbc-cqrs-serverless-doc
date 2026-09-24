---
description: {{Install and set up MBC CQRS Serverless framework with system requirements, CLI scaffolding, and local development environment.}}
---

# {{Installation}}

{{System Requirements}}:

- [{{Node.js}}](https://nodejs.org/en/download/package-manager) (20.x or later)
- [{{JQ cli}}](https://jqlang.github.io/jq/download/)
- [{{AWS cli}}](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [{{Docker}}](https://docs.docker.com/engine/install/)
- {{Windows, macOS and Linux are supported.}}

## {{Automatic Installation}} {#automatic-installation}

{{To get started, scaffold the project with the [mbc-cqrs-serverless CLI](/docs/cli). Run the following commands. This will create a new project directory, and populate the directory with the initial core mbc-cqrs-serverless files and supporting modules, creating a conventional base structure for your project.}}

```bash
npm i -g @mbc-cqrs-serverless/cli
mbc new project-name
```

{{If you're new to mbc-cqrs-serverless, see the [project structure](/docs/project-structure) docs for an overview of all the possible files and folders in your application.}}

## {{Run the Development Server}} {#run-dev-server}

1. {{Run `npm run build` to build the project in watch mode.}}
2. {{Open another terminal session and run `npm run offline:docker` to start Docker services (DynamoDB Local, MySQL, Floci for S3, and more).}}
3. {{Wait ~30 seconds for MySQL to fully start, then open another terminal and run `npm run migrate` to migrate RDS and DynamoDB tables.}}
4. {{Finally, run `npm run offline:sls` to start serverless offline mode.}}

:::info {{AWS Credentials for Local Development}}
{{Local development runs local emulators (DynamoDB Local, Floci for S3, ElasticMQ, and others) instead of AWS. You do not need real AWS credentials — set dummy values in your `.env` file:}}

```bash
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```
:::

{{After the server runs successfully, you can see:}}

```bash
DEBUG[serverless-offline-sns][adapter]: successfully subscribed queue "http://localhost:9324/101010101010/notification-queue" to topic: "arn:aws:sns:ap-northeast-1:101010101010:MySnsTopic"
Offline Lambda Server listening on http://localhost:4000
serverless-offline-aws-eventbridge :: Plugin ready
serverless-offline-aws-eventbridge :: Mock server running at port: 4010
Starting Offline SQS at stage dev (ap-northeast-1)
Starting Offline Dynamodb Streams at stage dev (ap-northeast-1)

Starting Offline at stage dev (ap-northeast-1)

Offline [http for lambda] listening on http://localhost:3002
Function names exposed for local invocation by aws-sdk:
           * main: serverless-example-dev-main
Configuring JWT Authorization: ANY /{proxy+}

   ┌────────────────────────────────────────────────────────────────────────┐
   │                                                                        │
   │   ANY | http://localhost:3000/api/public                               │
   │   POST | http://localhost:3000/2015-03-31/functions/main/invocations   │
   │   ANY | http://localhost:3000/swagger-ui/{proxy*}                      │
   │   POST | http://localhost:3000/2015-03-31/functions/main/invocations   │
   │   ANY | http://localhost:3000/{proxy*}                                 │
   │   POST | http://localhost:3000/2015-03-31/functions/main/invocations   │
   │                                                                        │
   └────────────────────────────────────────────────────────────────────────┘

Server ready: http://localhost:3000 🚀
```

{{You can also use several endpoints}}:

- {{API gateway: http://localhost:3000}}
- {{Swagger UI: http://localhost:3000/swagger-ui}}
- {{Offline Lambda Server: http://localhost:4000}}
- {{HTTP for lambda: http://localhost:3002}}
- {{Step Functions: http://localhost:8083}}
- {{DynamoDB: http://localhost:8000}}
- {{DynamoDB admin: http://localhost:8001}}
- {{SNS: http://localhost:4002}}
- {{SQS: http://localhost:9324}}
- {{SQS admin: http://localhost:9325}}
- {{Floci (S3): http://localhost:4566}}
- {{AppSync: http://localhost:4001}}
- {{Cognito: http://localhost:9229}}
- {{EventBridge: http://localhost:4010}}
- {{Simple Email Service: http://localhost:8005}}
- {{Run `npx prisma studio` to open studio web: http://localhost:5000}}

:::tip {{Verify Your Setup}}
{{Open the [Swagger UI](http://localhost:3000/swagger-ui) in your browser to confirm the API server is running. You should see the interactive API documentation with all available endpoints.}}
:::

## {{Local S3 Emulator (Floci)}} {#local-s3-floci}

{{The local stack emulates S3 with [Floci](https://github.com/floci-io/floci) (`floci/floci:1.6.0`) on port `4566` (`LOCAL_S3_PORT`), using path-style addressing. Buckets are stored in the `floci-data` Docker volume, which is scoped to your project by `COMPOSE_PROJECT_NAME` in `.env`.}}

{{`infra-local/scripts/resources.sh` (`resources.ps1` on Windows) creates the bucket and applies a CORS rule to it. Floci rejects browser preflight requests with `403` until the bucket has a CORS rule, so presigned upload/view URLs from `DirectoryFileService` depend on this rule. Production configures CORS on the bucket in the CDK stack; the script is the local equivalent.}}

:::danger {{Breaking Change (v1.5.0)}}
{{Projects created before [version 1.5.0](/docs/changelog#v150) use LocalStack for S3. LocalStack Community Edition reached end of life in March 2026, so migrate the local stack to Floci. Application code and `.env` values do not change.}}

1. {{In `infra-local/docker-compose.yml`, replace the `localstack` service and declare the named volume:}}

```yaml
  floci:
    image: floci/floci:1.6.0
    ports:
      - '${LOCAL_S3_PORT:-4566}:4566'
    environment:
      - FLOCI_DEFAULT_REGION=ap-northeast-1
      - FLOCI_STORAGE_MODE=persistent
    volumes:
      - floci-data:/app/data

volumes:
  floci-data:
```

2. {{Remove `serverless-localstack` from `package.json` and run `npm install`.}}
3. {{Copy the `configure S3 bucket CORS` block from the latest template's `infra-local/scripts/resources.sh` / `resources.ps1` into your scripts. On Windows, write the JSON file without a BOM — Windows PowerShell 5.1 adds one for `Set-Content -Encoding utf8`, and the AWS CLI rejects it.}}
4. {{Start the stack with `npm run offline:docker` (it keeps running), then from a second terminal recreate the bucket with `bash infra-local/scripts/resources.sh` (`npm run resources:win32` on Windows). Objects stored in LocalStack are not migrated.}}

{{`FLOCI_STORAGE_MODE=persistent` is required: the default is `memory`, which discards every bucket on `docker compose down`. If you did not update the scripts, apply the CORS rule once by hand after the bucket exists:}}

```bash
set -a; . ./.env; set +a
aws --endpoint-url="$S3_ENDPOINT" s3api put-bucket-cors \
  --bucket "$S3_BUCKET_NAME" \
  --cors-configuration '{"CORSRules":[{"AllowedOrigins":["*"],"AllowedMethods":["GET","PUT","POST","DELETE","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"]}]}'
```

{{See also:}} [{{Changelog v1.5.0}}](/docs/changelog#v150)
:::

## {{Configuring Local Service Ports}} {#configuring-local-ports}

:::info {{Version Note}}
{{Local port configuration feature was added in [version 1.0.26](/docs/changelog#v1026).}}
:::

{{If you have port conflicts with other services (e.g., another MySQL instance, another application using port 3000), you can configure the local service ports via environment variables in your `.env` file.}}

### {{Available Port Variables}}

| {{Variable}} | {{Default}} | {{Service}} |
|-------------|-------------|-------------|
| `LOCAL_HTTP_PORT` | `3000` | {{API Gateway (Serverless Offline)}} |
| `LOCAL_LAMBDA_PORT` | `3002` | {{Lambda HTTP endpoint}} |
| `LOCAL_DYNAMODB_PORT` | `8000` | {{DynamoDB Local}} |
| `LOCAL_RDS_PORT` | `3306` | {{MySQL (RDS)}} |
| `LOCAL_S3_PORT` | `4566` | {{Floci (S3)}} |
| `LOCAL_SNS_PORT` | `4002` | {{SNS}} |
| `LOCAL_SQS_PORT` | `9324` | {{SQS (ElasticMQ)}} |
| `LOCAL_SQS_UI_PORT` | `9325` | {{SQS Admin UI}} |
| `LOCAL_SFN_PORT` | `8083` | {{Step Functions Local}} |
| `LOCAL_COGNITO_PORT` | `9229` | {{Cognito Local}} |
| `LOCAL_APPSYNC_PORT` | `4001` | {{AppSync Simulator}} |
| `LOCAL_EVENTBRIDGE_PORT` | `4010` | {{EventBridge}} |
| `LOCAL_SES_PORT` | `8005` | {{Simple Email Service}} |
| `LOCAL_DDB_ADMIN_PORT` | `8001` | {{DynamoDB Admin UI}} |

### {{Example: Changing Ports}}

{{To change the API Gateway port from 3000 to 3010 and MySQL port from 3306 to 3307, add the following to your `.env` file:}}

```bash
# {{Change API Gateway port to 3010}}
LOCAL_HTTP_PORT=3010

# {{Change MySQL port to 3307}}
LOCAL_RDS_PORT=3307

# {{Change DynamoDB port to 9000}}
LOCAL_DYNAMODB_PORT=9000
```

{{After changing the ports, restart all services:}}

1. {{Stop all running services (Docker and Serverless Offline)}}
2. {{Run `npm run offline:docker` to restart Docker services}}
3. {{Run `npm run offline:sls` to restart Serverless Offline}}

:::tip
{{The port configuration is automatically applied to all related services including Docker Compose, Serverless Offline, and the DynamoDB stream trigger script. You only need to set the environment variables once in your `.env` file.}}
:::

:::note

{{In the local environment, if you have trouble with the `npm run migrate` command or cannot log in with local Cognito, you will need to add more permissions to files and folders using the command below:}}

```bash
sudo chmod -R 777 ./infra-local/cognito-local
sudo chmod -R 777 ./infra-local/cognito-local/db/clients.json
sudo chmod -R 777 ./infra-local
sudo chmod -R 777 ./infra-local/docker-data/
sudo chmod -R 777 ./infra-local/docker-data/dynamodb-local
```

:::


## {{Next Steps}} {#next-steps}

{{Your local environment is ready. Here's the recommended path forward:}}

1. **[{{Quickstart Tutorial}}](/docs/quickstart-tutorial)** — {{Build your first API endpoint in 15 minutes}}
2. **[{{Project Structure}}](/docs/project-structure)** — {{Understand what each generated file and folder does}}
3. **[{{Architecture}}](/docs/architecture)** — {{Learn the CQRS and Event Sourcing concepts behind the framework}}
4. **[{{Backend Development}}](/docs/backend-development)** — {{Start implementing real features}}

## {{Related Documentation}}

- [{{Getting Started}}](/docs/getting-started) - {{Introduction to MBC CQRS Serverless}}
- [{{Project Structure}}](/docs/project-structure) - {{Understanding the generated project layout}}
- [{{Configuring}}](/docs/configuring) - {{Configure modules for your application}}
- [{{CLI}}](/docs/cli) - {{CLI commands for scaffolding}}
- [{{Glossary}}](/docs/glossary) - {{Framework terminology and concepts}}
- [{{Building Your Application}}](/docs/build-your-application) - {{Application development guides after setup}}
- [{{CodePipeline CI/CD}}](/docs/codepipeline-cicd) - {{Automated deployment with AWS CodePipeline}}
