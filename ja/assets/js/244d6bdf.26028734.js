"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[951],{3514:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>o,default:()=>d,frontMatter:()=>i,metadata:()=>a,toc:()=>l});var s=n(4848),r=n(8453);const i={description:"Learn how to write unit test"},o="Unit test",a={id:"unit-test",title:"Unit test",description:"Learn how to write unit test",source:"@site/i18n/ja/docusaurus-plugin-content-docs/current/unit-test.md",sourceDirName:".",slug:"/unit-test",permalink:"/mbc-cqrs-serverless/ja/docs/unit-test",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/docs/unit-test.md",tags:[],version:"current",frontMatter:{description:"Learn how to write unit test"},sidebar:"tutorialSidebar",previous:{title:"Testing",permalink:"/mbc-cqrs-serverless/ja/docs/testing"},next:{title:"End-to-end test",permalink:"/mbc-cqrs-serverless/ja/docs/e2e-test"}},c={},l=[];function p(e){const t={code:"code",h1:"h1",header:"header",li:"li",p:"p",pre:"pre",ul:"ul",...(0,r.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(t.header,{children:(0,s.jsx)(t.h1,{id:"unit-test",children:"Unit test"})}),"\n",(0,s.jsx)(t.p,{children:"To summarize the steps for writing a unit test, there are five main steps:"}),"\n",(0,s.jsxs)(t.ul,{children:["\n",(0,s.jsx)(t.li,{children:"Create an event (API gateway event, S3 event, etc.)."}),"\n",(0,s.jsx)(t.li,{children:"Mock/init necessary data/service."}),"\n",(0,s.jsxs)(t.li,{children:["Pass the event to ",(0,s.jsx)(t.code,{children:"serverlessExpressInstance"}),"."]}),"\n",(0,s.jsx)(t.li,{children:"Check data is correct or not"}),"\n",(0,s.jsx)(t.li,{children:"Clean data"}),"\n"]}),"\n",(0,s.jsx)(t.p,{children:"Here is the scaffolds default unit tests for applications:"}),"\n",(0,s.jsxs)(t.ul,{children:["\n",(0,s.jsx)(t.li,{children:"Line 1-16: import dependencies"}),"\n",(0,s.jsx)(t.li,{children:"Line 19-60: before each test, mock serverlessExpressInstance/necessary dependencies and create table."}),"\n",(0,s.jsx)(t.li,{children:"Line 62-71: write test"}),"\n",(0,s.jsx)(t.li,{children:"Line 73-76: after each test, close app, clean up data"}),"\n"]}),"\n",(0,s.jsx)(t.pre,{children:(0,s.jsx)(t.code,{className:"language-ts",children:"import 'aws-sdk-client-mock-jest'\nimport serverlessExpress from '@codegenie/serverless-express'\nimport { AppModule } from '@mbc-cqrs-severless/core'\nimport { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common'\nimport { Test } from '@nestjs/testing'\nimport { PrismockClient } from 'prismock'\nimport { EnvValidation } from 'src/env.validation'\nimport { MainModule } from 'src/main.module'\nimport { PrismaService } from 'src/prisma'\nimport { readEventData } from 'test/lib/utils'\nimport { TableName } from 'test/step/unit/ddbTableName'\nimport { deleteDdbTable } from 'test/step/unit/delete-ddb-table'\nimport { createDdbTable } from 'test/step/unit/init-ddb-table'\nimport { mockClient } from 'aws-sdk-client-mock'\nimport { SESv2Client } from '@aws-sdk/client-sesv2'\nimport { SNSClient } from '@aws-sdk/client-sns'\n\ndescribe('Register tentative company - STEP 1', () => {\n  const prismock = new PrismockClient()\n  let app: INestApplication\n  let serverlessExpressInstance\n\n  beforeEach(async () => {\n    const moduleRef = await Test.createTestingModule({\n      imports: [\n        AppModule.forRoot({\n          rootModule: MainModule,\n          envCls: EnvValidation,\n        }),\n      ],\n    })\n      .overrideProvider(PrismaService)\n      .useValue(prismock)\n      .compile()\n\n    app = moduleRef.createNestApplication()\n    app.useGlobalPipes(\n      new ValidationPipe({\n        transform: true,\n        whitelist: true,\n      }),\n    )\n    await app.init()\n\n    const expressApp = app.getHttpAdapter().getInstance()\n    serverlessExpressInstance = serverlessExpress({\n      app: expressApp,\n      eventSourceRoutes: {\n        AWS_SNS: '/event/sns',\n        AWS_SQS: '/event/sqs',\n        AWS_DYNAMODB: '/event/dynamodb',\n        AWS_EVENTBRIDGE: '/event/event-bridge',\n        AWS_STEP_FUNCTIONS: '/event/step-functions',\n        AWS_S3: '/event/s3',\n        AWS_KINESIS_DATA_STREAM: '/event/kinesis-data-stream',\n      },\n    })\n\n    // TODO: 1. create data/table\n  })\n\n  test('', async () => {\n    // Arrange\n    // TODO: 2. read event\n\n    // Action\n    const response = await serverlessExpressInstance(event)\n\n    // Assert\n    // TODO: 3. assert result\n  })\n\n  afterEach(async () => {\n    await app.close()\n    // TODO: 4. clean data/table\n  })\n})\n"})})]})}function d(e={}){const{wrapper:t}={...(0,r.R)(),...e.components};return t?(0,s.jsx)(t,{...e,children:(0,s.jsx)(p,{...e})}):p(e)}},8453:(e,t,n)=>{n.d(t,{R:()=>o,x:()=>a});var s=n(6540);const r={},i=s.createContext(r);function o(e){const t=s.useContext(i);return s.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function a(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:o(e.components),s.createElement(i.Provider,{value:t},e.children)}}}]);