---
description: { { description } }
---

# {{title}}

{{system_requirements_title}}:

- {{requirement_1}}
- {{requirement_2}}
- {{requirement_3}}
- {{requirement_4}}
- {{requirement_5}}

## {{automatic_installation_title}}

{{automatic_installation_description}}

```bash
npm i -g @mbc-cqrs-severless/cli
mbc new project-name
```

{{new_user_suggestion}}

## {{development_server_title}}

1. {{dev_step_1}}
2. {{dev_step_2}}
3. {{dev_step_3}}
4. {{dev_step_4}}
5. {{dev_step_5}}
6. {{dev_step_6}}

{{server_start_output}}

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

{{endpoints_suggestion}}:

- {{endpoint_1}}
- {{endpoint_2}}
- {{endpoint_3}}
- {{endpoint_4}}
- {{endpoint_5}}
- {{endpoint_6}}
- {{endpoint_7}}
- {{endpoint_8}}
- {{endpoint_9}}
- {{endpoint_10}}
- {{endpoint_11}}
- {{endpoint_12}}
- {{endpoint_13}}
- {{endpoint_14}}
- {{endpoint_15}}

:::note

{{setup_note}}

```bash
sudo chmod -R 777 ./infra-local/cognito-local
sudo chmod -R 777 ./infra-local/cognito-local/db/clients.json
sudo chmod -R 777 ./infra-local
sudo chmod -R 777 ./infra-local/docker-data/
sudo chmod -R 777 ./infra-local/docker-data/dynamodb-local
```

:::