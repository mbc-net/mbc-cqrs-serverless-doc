"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[188],{879:(e,s,r)=>{r.r(s),r.d(s,{assets:()=>c,contentTitle:()=>i,default:()=>p,frontMatter:()=>a,metadata:()=>o,toc:()=>d});var t=r(4848),n=r(8453);const a={description:"Glossary"},i="Glossary",o={id:"glossary",title:"Glossary",description:"Glossary",source:"@site/i18n/ja/docusaurus-plugin-content-docs/current/glossary.md",sourceDirName:".",slug:"/glossary",permalink:"/mbc-cqrs-serverless/ja/docs/glossary",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/docs/glossary.md",tags:[],version:"current",frontMatter:{description:"Glossary"},sidebar:"tutorialSidebar",previous:{title:"Showcase",permalink:"/mbc-cqrs-serverless/ja/docs/showcase"}},c={},d=[{value:"Design patterns",id:"design-patterns",level:2},{value:"CQRS",id:"cqrs",level:3},{value:"Event souring",id:"event-souring",level:3},{value:"Tooling/Library/Framework",id:"toolinglibraryframework",level:2},{value:"NestJS",id:"nestjs",level:3},{value:"Serverless",id:"serverless",level:3},{value:"Prisma",id:"prisma",level:3}];function l(e){const s={a:"a",blockquote:"blockquote",h1:"h1",h2:"h2",h3:"h3",header:"header",img:"img",p:"p",...(0,n.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(s.header,{children:(0,t.jsx)(s.h1,{id:"glossary",children:"Glossary"})}),"\n",(0,t.jsx)(s.p,{children:"This is a glossary of the core terms in mbc-cqrs-serverless framework."}),"\n",(0,t.jsx)(s.h2,{id:"design-patterns",children:"Design patterns"}),"\n",(0,t.jsx)(s.h3,{id:"cqrs",children:"CQRS"}),"\n",(0,t.jsx)(s.p,{children:"The command query responsibility segregation (CQRS) pattern separates the data mutation, or the command part of a system, from the query part. You can use the CQRS pattern to separate updates and queries if they have different requirements for throughput, latency, or consistency. The CQRS pattern splits the application into two parts\u2014the command side and the query side. The command side handles create, update, and delete requests. The query side runs the query part by using the read replicas."}),"\n",(0,t.jsx)(s.p,{children:(0,t.jsx)(s.img,{alt:"CQRS flow",src:r(2575).A+"",width:"551",height:"351"})}),"\n",(0,t.jsxs)(s.blockquote,{children:["\n",(0,t.jsxs)(s.p,{children:["See: ",(0,t.jsx)(s.a,{href:"https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/cqrs-pattern.html",children:"CQRS pattern"})]}),"\n"]}),"\n",(0,t.jsx)(s.h3,{id:"event-souring",children:"Event souring"}),"\n",(0,t.jsx)(s.p,{children:"The event sourcing pattern is typically used with the CQRS pattern to decouple read from write workloads, and optimize for performance, scalability, and security. Data is stored as a series of events, instead of direct updates to data stores. Microservices replay events from an event store to compute the appropriate state of their own data stores. The pattern provides visibility for the current state of the application and additional context for how the application arrived at that state. The event sourcing pattern works effectively with the CQRS pattern because data can be reproduced for a specific event, even if the command and query data stores have different schemas."}),"\n",(0,t.jsxs)(s.blockquote,{children:["\n",(0,t.jsxs)(s.p,{children:["See: ",(0,t.jsx)(s.a,{href:"https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/service-per-team.html",children:"Event sourcing pattern"})]}),"\n"]}),"\n",(0,t.jsx)(s.h2,{id:"toolinglibraryframework",children:"Tooling/Library/Framework"}),"\n",(0,t.jsx)(s.h3,{id:"nestjs",children:"NestJS"}),"\n",(0,t.jsx)(s.p,{children:"Nest (NestJS) is a framework for building efficient, scalable Node.js server-side applications. It uses progressive JavaScript, is built with and fully supports TypeScript (yet still enables developers to code in pure JavaScript) and combines elements of OOP (Object Oriented Programming), FP (Functional Programming), and FRP (Functional Reactive Programming)."}),"\n",(0,t.jsxs)(s.blockquote,{children:["\n",(0,t.jsxs)(s.p,{children:["See: ",(0,t.jsx)(s.a,{href:"https://docs.nestjs.com/",children:"Introduction"})]}),"\n"]}),"\n",(0,t.jsx)(s.h3,{id:"serverless",children:"Serverless"}),"\n",(0,t.jsx)(s.p,{children:"The Serverless Framework consists of a Command Line Interface and an optional Dashboard, and helps you deploy code and infrastructure together on Amazon Web Services, while increasingly supporting other cloud providers. The Framework is a YAML-based experience that uses simplified syntax to help you deploy complex infrastructure patterns easily, without needing to be a cloud expert."}),"\n",(0,t.jsxs)(s.blockquote,{children:["\n",(0,t.jsxs)(s.p,{children:["See: ",(0,t.jsx)(s.a,{href:"https://www.serverless.com/framework/docs#serverless-framework---an-introduction",children:"Serverless Framework - An Introduction"})]}),"\n"]}),"\n",(0,t.jsx)(s.h3,{id:"prisma",children:"Prisma"}),"\n",(0,t.jsx)(s.p,{children:"Prisma is an ORM for Node.js and Typescript that serves as an alternative to writing plain SQL or using other database access tools, such as Knex or Sequelize. It simplifies database access and management by providing developers with a type-safe query builder and auto-generator."}),"\n",(0,t.jsxs)(s.blockquote,{children:["\n",(0,t.jsxs)(s.p,{children:["See: ",(0,t.jsx)(s.a,{href:"https://www.prisma.io/docs/orm/overview/introduction/what-is-prisma",children:"What is Prisma ORM?"})]}),"\n"]})]})}function p(e={}){const{wrapper:s}={...(0,n.R)(),...e.components};return s?(0,t.jsx)(s,{...e,children:(0,t.jsx)(l,{...e})}):l(e)}},2575:(e,s,r)=>{r.d(s,{A:()=>t});const t=r.p+"assets/images/CQRS-f72c29622a950ddf480c74876df8c315.png"},8453:(e,s,r)=>{r.d(s,{R:()=>i,x:()=>o});var t=r(6540);const n={},a=t.createContext(n);function i(e){const s=t.useContext(a);return t.useMemo((function(){return"function"==typeof e?e(s):{...s,...e}}),[s,e])}function o(e){let s;return s=e.disableParentContext?"function"==typeof e.components?e.components(n):e.components||n:i(e.components),t.createElement(a.Provider,{value:s},e.children)}}}]);