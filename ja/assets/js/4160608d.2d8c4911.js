"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[630],{6223:(e,n,s)=>{s.r(n),s.d(n,{assets:()=>a,contentTitle:()=>d,default:()=>m,frontMatter:()=>r,metadata:()=>c,toc:()=>i});var o=s(4848),t=s(8453);const r={description:"DynamoDB related recipes"},d="DynamoDB",c={id:"dynamodb",title:"DynamoDB",description:"DynamoDB related recipes",source:"@site/i18n/ja/docusaurus-plugin-content-docs/current/dynamodb.md",sourceDirName:".",slug:"/dynamodb",permalink:"/mbc-cqrs-serverless-doc/ja/docs/dynamodb",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/docs/dynamodb.md",tags:[],version:"current",frontMatter:{description:"DynamoDB related recipes"},sidebar:"tutorialSidebar",previous:{title:"Prisma",permalink:"/mbc-cqrs-serverless-doc/ja/docs/prisma"},next:{title:"Sequence",permalink:"/mbc-cqrs-serverless-doc/ja/docs/sequence"}},a={},i=[];function l(e){const n={a:"a",admonition:"admonition",blockquote:"blockquote",code:"code",h1:"h1",header:"header",li:"li",p:"p",ul:"ul",...(0,t.R)(),...e.components};return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(n.header,{children:(0,o.jsx)(n.h1,{id:"dynamodb",children:"DynamoDB"})}),"\n",(0,o.jsx)(n.p,{children:"In the MBC CQRS serverless, DynamoDB tables are organized into three classes based on their purpose."}),"\n",(0,o.jsxs)(n.ul,{children:["\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.code,{children:"tasks"})," table: store information about long-running tasks"]}),"\n",(0,o.jsxs)(n.li,{children:[(0,o.jsx)(n.code,{children:"sequences"})," table: holds sequence data"]}),"\n",(0,o.jsxs)(n.li,{children:["other tables: can be divided into three types: command tables (with a ",(0,o.jsx)(n.code,{children:"-command"})," postfix in name), data tables (with a ",(0,o.jsx)(n.code,{children:"-data"})," postfix in name), and history tables (with ",(0,o.jsx)(n.code,{children:"-history"})," posfix in name). You only need to specify the table name, add the name in ",(0,o.jsx)(n.code,{children:"prisma/dynamodbs/cqrs.json"}),", and the command below will create the table for you."]}),"\n"]}),"\n",(0,o.jsxs)(n.p,{children:["The table definition is store in ",(0,o.jsx)(n.code,{children:"prisma/dynamodbs"})," folder."]}),"\n",(0,o.jsxs)(n.p,{children:["For local development, run ",(0,o.jsx)(n.code,{children:"npm run migrate:ddb"})," to migrate dynamo table."]}),"\n",(0,o.jsx)(n.admonition,{type:"note",children:(0,o.jsxs)(n.p,{children:["You can apply migrate both dynamoDB and RDS with singe command: ",(0,o.jsx)(n.code,{children:"npm run migrate"}),"."]})}),"\n",(0,o.jsxs)(n.blockquote,{children:["\n",(0,o.jsxs)(n.p,{children:["For actions base on Dynamodb, please refer to the ",(0,o.jsx)(n.a,{href:"/mbc-cqrs-serverless-doc/ja/docs/sequence",children:"Sequence"})," and ",(0,o.jsx)(n.a,{href:"/mbc-cqrs-serverless-doc/ja/docs/command-module",children:"CommandModule"})," sections."]}),"\n"]})]})}function m(e={}){const{wrapper:n}={...(0,t.R)(),...e.components};return n?(0,o.jsx)(n,{...e,children:(0,o.jsx)(l,{...e})}):l(e)}},8453:(e,n,s)=>{s.d(n,{R:()=>d,x:()=>c});var o=s(6540);const t={},r=o.createContext(t);function d(e){const n=o.useContext(r);return o.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function c(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(t):e.components||t:d(e.components),o.createElement(r.Provider,{value:n},e.children)}}}]);