"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[54],{5044:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>i,default:()=>m,frontMatter:()=>o,metadata:()=>a,toc:()=>l});var s=n(4848),r=n(8453);const o={description:"Learn how to write e2e test"},i="End-to-end test",a={id:"e2e-test",title:"End-to-end test",description:"Learn how to write e2e test",source:"@site/i18n/en/docusaurus-plugin-content-docs/current/e2e-test.md",sourceDirName:".",slug:"/e2e-test",permalink:"/mbc-cqrs-serverless-doc/docs/e2e-test",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/docs/e2e-test.md",tags:[],version:"current",frontMatter:{description:"Learn how to write e2e test"},sidebar:"tutorialSidebar",previous:{title:"Unit test",permalink:"/mbc-cqrs-serverless-doc/docs/unit-test"},next:{title:"CLI",permalink:"/mbc-cqrs-serverless-doc/docs/cli"}},c={},l=[];function d(e){const t={code:"code",h1:"h1",header:"header",li:"li",p:"p",pre:"pre",ul:"ul",...(0,r.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(t.header,{children:(0,s.jsx)(t.h1,{id:"end-to-end-test",children:"End-to-end test"})}),"\n",(0,s.jsx)(t.p,{children:"Unlike unit testing, which focuses on individual modules and classes, end-to-end (e2e) testing covers the interaction of classes and modules at a more aggregate level -- closer to the kind of interaction that end-users will have with the production system. As an application grows, it becomes hard to manually test the end-to-end behavior of each API endpoint. Automated end-to-end tests help us ensure that the overall behavior of the system is correct and meets project requirements."}),"\n",(0,s.jsx)(t.p,{children:"e2e testing tests the API in a real environment, so there\u2019s no need to mock any services. To summarize, there are five main steps for writing an e2e test:"}),"\n",(0,s.jsxs)(t.ul,{children:["\n",(0,s.jsx)(t.li,{children:"Create necessary data."}),"\n",(0,s.jsx)(t.li,{children:"Make API calls using the Supertest library to simulate HTTP requests."}),"\n",(0,s.jsx)(t.li,{children:"Check data is correct or not"}),"\n",(0,s.jsx)(t.li,{children:"Clean data"}),"\n"]}),"\n",(0,s.jsx)(t.p,{children:"Here is the scaffolds default e2e tests for applications:"}),"\n",(0,s.jsx)(t.pre,{children:(0,s.jsx)(t.code,{className:"language-ts",children:'import { removeSortKeyVersion } from "@mbc-cqrs-severless/core";\nimport request from "supertest";\nimport config from "test/lib/config";\nimport { getItem, getTableName, TableType } from "test/lib/dynamo-client";\nimport prismaClient from "test/lib/prisma-client";\nimport { readMockData, syncDataFinished } from "test/lib/utils";\n\nconst createApplicationData = readMockData("cat-create.json");\nconst BASE_API_PATH = "/api/cat";\n\njest.setTimeout(90000);\n\ndescribe("Cat", () => {\n  beforeAll(async () => {\n    // TODO: 1 create necessary data\n  });\n\n  it("", async () => {\n    // TODO: 2,3 make API calls and assert\n  });\n\n  afterAll(async () => {\n    // TODO: 4 clean data\n  });\n});\n'})})]})}function m(e={}){const{wrapper:t}={...(0,r.R)(),...e.components};return t?(0,s.jsx)(t,{...e,children:(0,s.jsx)(d,{...e})}):d(e)}},8453:(e,t,n)=>{n.d(t,{R:()=>i,x:()=>a});var s=n(6540);const r={},o=s.createContext(r);function i(e){const t=s.useContext(o);return s.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function a(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:i(e.components),s.createElement(o.Provider,{value:t},e.children)}}}]);