---
description: Installation
---

# Installation

System Requirements:

- [Node.js](https://nodejs.org/en/download/package-manager)
- [JQ cli](https://jqlang.github.io/jq/download/)
- [AWS cli](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [Docker](https://docs.docker.com/engine/install/)
- windows, macOS and Linux are supported.

## Automatic Installation

To get started, you can scaffold the project with the [mbc-cqrs-serverless CLI](./cli.md). To scaffold the project with the mbc-cqrs-serverless CLI, run the following commands. This will create a new project directory, and populate the directory with the initial core mbc-cqrs-serverless files and supporting modules, creating a conventional base structure for your project.

```bash
npm i -g @mbc-cqrs-serverless/cli
mbc new project-name
```

If you're new to mbc-cqrs-serverless, see the [project structure](./project-structure.md) docs for an overview of all the possible files and folders in your application.

## Run the Development Server

1. Run `npm run build` to the build project using development mode.
2. Open in other terminal session and run `npm run offline:docker`
3. Open in other terminal session and run `npm run migrate` to migrate RDS and dynamoDB table
4. Finally, run `npm run offline:sls` to start serverless offline mode.

After the server runs successfully, you can see:

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

You can also use several endpoints:

- API gateway: http://localhost:3000
- Offline Lambda Server: http://localhost:4000
- HTTP for lambda: http://localhost:3002
- Step functions: http://localhost:8083
- DynamoDB: http://localhost:8000
- DynamoDB admin: http://localhost:8001
- SNS: http://localhost:4002
- SQS: http://localhost:9324
- SQS admin: http://localhost:9325
- Localstack: http://localhost:4566
- AppSync: http://localhost:4001
- Cognito: http://localhost:9229
- EventBridge: http://localhost:4010
- Simple Email Service: http://localhost:8005
- Run `npx prisma studio` to open studio web: http://localhost:5000

:::note

In the local environment, if you have trouble with the `npm run migrate` command or cannot log in with local Cognito, you will need to add more permissions to files and folders using the command below:

```bash
sudo chmod -R 777 ./infra-local/cognito-local
sudo chmod -R 777 ./infra-local/cognito-local/db/clients.json
sudo chmod -R 777 ./infra-local
sudo chmod -R 777 ./infra-local/docker-data/
sudo chmod -R 777 ./infra-local/docker-data/dynamodb-local
```

:::
