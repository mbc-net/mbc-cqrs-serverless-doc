"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[103],{9987:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>a,contentTitle:()=>r,default:()=>d,frontMatter:()=>o,metadata:()=>i,toc:()=>c});var s=t(4848),l=t(8453);const o={description:"Installation"},r="Installation",i={id:"installation",title:"Installation",description:"Installation",source:"@site/i18n/ja/docusaurus-plugin-content-docs/current/installation.md",sourceDirName:".",slug:"/installation",permalink:"/mbc-cqrs-serverless-doc/ja/docs/installation",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/docs/installation.md",tags:[],version:"current",frontMatter:{description:"Installation"},sidebar:"tutorialSidebar",previous:{title:"Introduction",permalink:"/mbc-cqrs-serverless-doc/ja/docs/getting-started"},next:{title:"Project structure",permalink:"/mbc-cqrs-serverless-doc/ja/docs/project-structure"}},a={},c=[{value:"Automatic Installation",id:"automatic-installation",level:2},{value:"Run the Development Server",id:"run-the-development-server",level:2}];function h(e){const n={a:"a",admonition:"admonition",code:"code",h1:"h1",h2:"h2",header:"header",li:"li",ol:"ol",p:"p",pre:"pre",ul:"ul",...(0,l.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(n.header,{children:(0,s.jsx)(n.h1,{id:"installation",children:"Installation"})}),"\n",(0,s.jsx)(n.p,{children:"System Requirements:"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.a,{href:"https://nodejs.org/en/download/package-manager",children:"Node.js"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.a,{href:"https://jqlang.github.io/jq/download/",children:"JQ cli"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.a,{href:"https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html",children:"AWS cli"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.a,{href:"https://docs.docker.com/engine/install/",children:"Docker"})}),"\n",(0,s.jsx)(n.li,{children:"macOS and Linux are supported."}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"automatic-installation",children:"Automatic Installation"}),"\n",(0,s.jsxs)(n.p,{children:["To get started, you can scaffold the project with the ",(0,s.jsx)(n.a,{href:"/mbc-cqrs-serverless-doc/ja/docs/cli",children:"mbc-cqrs-severless CLI"}),". To scaffold the project with the mbc-cqrs-severless CLI, run the following commands. This will create a new project directory, and populate the directory with the initial core mbc-cqrs-severless files and supporting modules, creating a conventional base structure for your project."]}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-bash",children:"npm i -g @mbc-cqrs-severless/cli\nmbc new project-name\n"})}),"\n",(0,s.jsxs)(n.p,{children:["If you're new to mbc-cqrs-serverless, see the ",(0,s.jsx)(n.a,{href:"/mbc-cqrs-serverless-doc/ja/docs/project-structure",children:"project structure"})," docs for an overview of all the possible files and folders in your application."]}),"\n",(0,s.jsx)(n.h2,{id:"run-the-development-server",children:"Run the Development Server"}),"\n",(0,s.jsxs)(n.ol,{children:["\n",(0,s.jsxs)(n.li,{children:["Run ",(0,s.jsx)(n.code,{children:"cp .env.local .env"})," to create the environment variables file."]}),"\n",(0,s.jsxs)(n.li,{children:["Run ",(0,s.jsx)(n.code,{children:"npm install"})," to install the required dependencies."]}),"\n",(0,s.jsxs)(n.li,{children:["Run ",(0,s.jsx)(n.code,{children:"npm run build"})," to the build project using development mode."]}),"\n",(0,s.jsxs)(n.li,{children:["Open in other terminal session and run ",(0,s.jsx)(n.code,{children:"npm run offline:docker"})]}),"\n",(0,s.jsxs)(n.li,{children:["Open in other terminal session and run ",(0,s.jsx)(n.code,{children:"npm run migrate"})," to migrate RDS and dynamoDB table"]}),"\n",(0,s.jsxs)(n.li,{children:["Finally, run ",(0,s.jsx)(n.code,{children:"npm run offline:sls"})," to start serverless offline mode."]}),"\n"]}),"\n",(0,s.jsx)(n.p,{children:"After the server runs successfully, you can see:"}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-bash",children:'DEBUG[serverless-offline-sns][adapter]: successfully subscribed queue "http://localhost:9324/101010101010/notification-queue" to topic: "arn:aws:sns:ap-northeast-1:101010101010:MySnsTopic"\nOffline Lambda Server listening on http://localhost:4000\nserverless-offline-aws-eventbridge :: Plugin ready\nserverless-offline-aws-eventbridge :: Mock server running at port: 4010\nStarting Offline SQS at stage dev (ap-northeast-1)\nStarting Offline Dynamodb Streams at stage dev (ap-northeast-1)\n\nStarting Offline at stage dev (ap-northeast-1)\n\nOffline [http for lambda] listening on http://localhost:3002\nFunction names exposed for local invocation by aws-sdk:\n           * main: serverless-example-dev-main\nConfiguring JWT Authorization: ANY /{proxy+}\n\n   \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n   \u2502                                                                        \u2502\n   \u2502   ANY | http://localhost:3000/api/public                               \u2502\n   \u2502   POST | http://localhost:3000/2015-03-31/functions/main/invocations   \u2502\n   \u2502   ANY | http://localhost:3000/swagger-ui/{proxy*}                      \u2502\n   \u2502   POST | http://localhost:3000/2015-03-31/functions/main/invocations   \u2502\n   \u2502   ANY | http://localhost:3000/{proxy*}                                 \u2502\n   \u2502   POST | http://localhost:3000/2015-03-31/functions/main/invocations   \u2502\n   \u2502                                                                        \u2502\n   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n\nServer ready: http://localhost:3000 \ud83d\ude80\n'})}),"\n",(0,s.jsx)(n.p,{children:"You can also use several endpoints:"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:["API gateway: ",(0,s.jsx)(n.a,{href:"http://localhost:3000",children:"http://localhost:3000"})]}),"\n",(0,s.jsxs)(n.li,{children:["Offline Lambda Server: ",(0,s.jsx)(n.a,{href:"http://localhost:4000",children:"http://localhost:4000"})]}),"\n",(0,s.jsxs)(n.li,{children:["HTTP for lambda: ",(0,s.jsx)(n.a,{href:"http://localhost:3002",children:"http://localhost:3002"})]}),"\n",(0,s.jsxs)(n.li,{children:["Step functions: ",(0,s.jsx)(n.a,{href:"http://localhost:8083",children:"http://localhost:8083"})]}),"\n",(0,s.jsxs)(n.li,{children:["DynamoDB: ",(0,s.jsx)(n.a,{href:"http://localhost:8000",children:"http://localhost:8000"})]}),"\n",(0,s.jsxs)(n.li,{children:["DynamoDB admin: ",(0,s.jsx)(n.a,{href:"http://localhost:8001",children:"http://localhost:8001"})]}),"\n",(0,s.jsxs)(n.li,{children:["SNS: ",(0,s.jsx)(n.a,{href:"http://localhost:4002",children:"http://localhost:4002"})]}),"\n",(0,s.jsxs)(n.li,{children:["SQS: ",(0,s.jsx)(n.a,{href:"http://localhost:9324",children:"http://localhost:9324"})]}),"\n",(0,s.jsxs)(n.li,{children:["SQS admin: ",(0,s.jsx)(n.a,{href:"http://localhost:9325",children:"http://localhost:9325"})]}),"\n",(0,s.jsxs)(n.li,{children:["Localstack: ",(0,s.jsx)(n.a,{href:"http://localhost:4566",children:"http://localhost:4566"})]}),"\n",(0,s.jsxs)(n.li,{children:["AppSync: ",(0,s.jsx)(n.a,{href:"http://localhost:4001",children:"http://localhost:4001"})]}),"\n",(0,s.jsxs)(n.li,{children:["Cognito: ",(0,s.jsx)(n.a,{href:"http://localhost:9229",children:"http://localhost:9229"})]}),"\n",(0,s.jsxs)(n.li,{children:["EventBridge: ",(0,s.jsx)(n.a,{href:"http://localhost:4010",children:"http://localhost:4010"})]}),"\n",(0,s.jsxs)(n.li,{children:["Simple Email Service: ",(0,s.jsx)(n.a,{href:"http://localhost:8005",children:"http://localhost:8005"})]}),"\n",(0,s.jsxs)(n.li,{children:["Run ",(0,s.jsx)(n.code,{children:"npx prisma studio"})," to open studio web: ",(0,s.jsx)(n.a,{href:"http://localhost:5000",children:"http://localhost:5000"})]}),"\n"]}),"\n",(0,s.jsxs)(n.admonition,{type:"note",children:[(0,s.jsxs)(n.p,{children:["In the local environment, if you have trouble with the ",(0,s.jsx)(n.code,{children:"npm run migrate"})," command or cannot log in with local Cognito, you will need to add more permissions to files and folders using the command below:"]}),(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-bash",children:"sudo chmod -R 777 ./infra-local/cognito-local\nsudo chmod -R 777 ./infra-local/cognito-local/db/clients.json\nsudo chmod -R 777 ./infra-local\nsudo chmod -R 777 ./infra-local/docker-data/\nsudo chmod -R 777 ./infra-local/docker-data/dynamodb-local\n"})})]})]})}function d(e={}){const{wrapper:n}={...(0,l.R)(),...e.components};return n?(0,s.jsx)(n,{...e,children:(0,s.jsx)(h,{...e})}):h(e)}},8453:(e,n,t)=>{t.d(n,{R:()=>r,x:()=>i});var s=t(6540);const l={},o=s.createContext(l);function r(e){const n=s.useContext(o);return s.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function i(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(l):e.components||l:r(e.components),s.createElement(o.Provider,{value:n},e.children)}}}]);