"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[100],{9638:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>i,default:()=>m,frontMatter:()=>r,metadata:()=>s,toc:()=>c});var o=t(4848),a=t(8453);const r={description:"Learn how to add and validate your environment variables in your application."},i="Environment Variables",s={id:"environment-variables",title:"Environment Variables",description:"Learn how to add and validate your environment variables in your application.",source:"@site/i18n/ja/docusaurus-plugin-content-docs/current/environment-variables.md",sourceDirName:".",slug:"/environment-variables",permalink:"/mbc-cqrs-serverless/ja/docs/environment-variables",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/docs/environment-variables.md",tags:[],version:"current",frontMatter:{description:"Learn how to add and validate your environment variables in your application."},sidebar:"tutorialSidebar",previous:{title:"Configuring",permalink:"/mbc-cqrs-serverless/ja/docs/configuring"},next:{title:"Absolute Imports and Module Path Aliases",permalink:"/mbc-cqrs-serverless/ja/docs/absolute_imports_and_module_path_aliases"}},l={},c=[{value:"Loading Environment Variables",id:"loading-environment-variables",level:2},{value:"Validate Environment Variables",id:"validate-environment-variables",level:2}];function d(e){const n={code:"code",h1:"h1",h2:"h2",header:"header",li:"li",p:"p",pre:"pre",ul:"ul",...(0,a.R)(),...e.components};return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(n.header,{children:(0,o.jsx)(n.h1,{id:"environment-variables",children:"Environment Variables"})}),"\n",(0,o.jsx)(n.p,{children:"MBC CQRS serverless framework comes with built-in support for environment variables, which allows you to do the following:"}),"\n",(0,o.jsxs)(n.ul,{children:["\n",(0,o.jsxs)(n.li,{children:["Use ",(0,o.jsx)(n.code,{children:".env"})," to load environment variables"]}),"\n",(0,o.jsx)(n.li,{children:"Validate environment variables"}),"\n"]}),"\n",(0,o.jsx)(n.h2,{id:"loading-environment-variables",children:"Loading Environment Variables"}),"\n",(0,o.jsxs)(n.p,{children:["MBC CQRS serverless framework has built-in support for loading environment variables from ",(0,o.jsx)(n.code,{children:".env*"})," files into ",(0,o.jsx)(n.code,{children:"process.env."})]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{children:'TODO:\n# AWS_PROFILE\nAWS_ACCESS_KEY_ID=local\nAWS_SECRET_ACCESS_KEY=local\nAWS_DEFAULT_REGION=ap-northeast-1\n# running environment\n# local, dev, stg, prod\nNODE_ENV=local\n# NODE_ENV=dev\n# name of application\n# APP_NAME=suisss-recruit\nAPP_NAME=demo\n# APP_NAME=cqrs\n# set log levels\nLOG_LEVEL=info # debug, info, warn, error, verbose\n# disable event route for API GW integration\nEVENT_SOURCE_DISABLED=false\n# DynamoDB endpoint, useful for local development\nDYNAMODB_ENDPOINT=http://localhost:8000\nDYNAMODB_REGION=ap-northeast-1\n# set the limit size for `attributes` of object in DDB\nATTRIBUTE_LIMIT_SIZE=389120 # bytes, refer to https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html#limits-attributes\n# S3 endpoint, useful for local development\nS3_ENDPOINT=http://localhost:4566\nS3_REGION=ap-northeast-1\n# save DDB attributes\nS3_BUCKET_NAME=local-bucket\n# Step Function endpoint, useful for local development\nSFN_ENDPOINT=http://localhost:8083\nSFN_REGION=ap-northeast-1\nSFN_COMMAND_ARN=arn:aws:states:ap-northeast-1:101010101010:stateMachine:command\n# SNS endpoint, useful for local development\nSNS_ENDPOINT=http://localhost:4002\nSNS_REGION=ap-northeast-1\nSNS_TOPIC_ARN=arn:aws:sns:ap-northeast-1:101010101010:MySnsTopic\n# Cognito endpoint, useful for local development\nCOGNITO_URL=http://localhost:9229\nCOGNITO_USER_POOL_ID=local_2G7noHgW\nCOGNITO_USER_POLL_CLIENT_ID=dnk8y7ii3wled35p3lw0l2cd7\nCOGNITO_REGION=ap-northeast-1\n# AppSync endpoint, useful for local development\nAPPSYNC_ENDPOINT=http://localhost:4001/graphql\nAPPSYNC_API_KEY=da2-fakeApiId123456\n# SES email endpoint, useful for local development\nSES_ENDPOINT=http://localhost:8005\nSES_REGION=ap-northeast-1\nSES_FROM_EMAIL=email@example.com\n\n# This was inserted by `prisma init`:\n# Environment variables declared in this file are automatically made available to Prisma.\n# See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema\n\n# Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.\n# See the documentation for all the connection string options: https://pris.ly/d/connection-strings\n\nDATABASE_URL="mysql://root:RootCqrs@localhost:3306/cqrs?schema=public&connection_limit=1"\n'})}),"\n",(0,o.jsx)(n.h2,{id:"validate-environment-variables",children:"Validate Environment Variables"}),"\n",(0,o.jsxs)(n.p,{children:["It is standard practice to throw an exception during application startup if required environment variables haven't been provided or if they don't meet certain validation rules. The ",(0,o.jsx)(n.code,{children:"@mbc-cqrs-serverless/core"})," package makes this easy to do."]}),"\n",(0,o.jsx)(n.p,{children:"First, we have to define:"}),"\n",(0,o.jsxs)(n.ul,{children:["\n",(0,o.jsx)(n.li,{children:"a class with validation constraints,"}),"\n",(0,o.jsx)(n.li,{children:"extend the EnvironmentVariables class."}),"\n"]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-ts",children:'// env.validation.ts\nimport { EnvironmentVariables } from "@mbc-cqrs-severless/core";\nimport { IsUrl } from "class-validator";\n\nexport class EnvValidation extends EnvironmentVariables {\n  @IsUrl({\n    require_tld: false,\n  })\n  FRONT_BASE_URL: string;\n}\n'})}),"\n",(0,o.jsxs)(n.p,{children:["With this in place, you pass the ",(0,o.jsx)(n.code,{children:"EnvValidation"})," class as a configuration argument of the ",(0,o.jsx)(n.code,{children:"createHandler"})," function, as follows:"]}),"\n",(0,o.jsx)(n.pre,{children:(0,o.jsx)(n.code,{className:"language-ts",children:'import { createHandler } from "@mbc-cqrs-severless/core";\n\nimport { EnvValidation } from "./env.validation";\nimport { MainModule } from "./main.module";\n\nexport const handler = createHandler({\n  rootModule: MainModule,\n  envCls: EnvValidation,\n});\n'})})]})}function m(e={}){const{wrapper:n}={...(0,a.R)(),...e.components};return n?(0,o.jsx)(n,{...e,children:(0,o.jsx)(d,{...e})}):d(e)}},8453:(e,n,t)=>{t.d(n,{R:()=>i,x:()=>s});var o=t(6540);const a={},r=o.createContext(a);function i(e){const n=o.useContext(r);return o.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function s(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(a):e.components||a:i(e.components),o.createElement(r.Provider,{value:n},e.children)}}}]);