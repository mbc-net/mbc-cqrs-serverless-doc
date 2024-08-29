"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[273],{9317:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>c,contentTitle:()=>i,default:()=>p,frontMatter:()=>a,metadata:()=>o,toc:()=>d});var s=t(4848),r=t(8453);const a={description:"Prisma related recipes."},i="Prisma",o={id:"prisma",title:"Prisma",description:"Prisma related recipes.",source:"@site/i18n/en/docusaurus-plugin-content-docs/current/prisma.md",sourceDirName:".",slug:"/prisma",permalink:"/mbc-cqrs-serverless/docs/prisma",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/docs/prisma.md",tags:[],version:"current",frontMatter:{description:"Prisma related recipes."},sidebar:"tutorialSidebar",previous:{title:"Recipes",permalink:"/mbc-cqrs-serverless/docs/recipes"},next:{title:"DynamoDB",permalink:"/mbc-cqrs-serverless/docs/dynamodb"}},c={},d=[{value:"Design table convention",id:"design-table-convention",level:2}];function l(e){const n={a:"a",admonition:"admonition",blockquote:"blockquote",code:"code",h1:"h1",h2:"h2",header:"header",li:"li",ol:"ol",p:"p",pre:"pre",...(0,r.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(n.header,{children:(0,s.jsx)(n.h1,{id:"prisma",children:"Prisma"})}),"\n",(0,s.jsx)(n.p,{children:"In MBC CQRS serverless, we use prisma as an ORM. It helps developers more productive when working with databases."}),"\n",(0,s.jsx)(n.p,{children:"A common scenario when working with Prisma is needing to make changes to the database, such as creating tables, updating fields in tables, etc. Follow these steps:"}),"\n",(0,s.jsxs)(n.ol,{children:["\n",(0,s.jsx)(n.li,{children:"Update prisma/schema.prisma file."}),"\n",(0,s.jsxs)(n.li,{children:["For local development, create and apply migrations with command npm run migrate",":dev","."]}),"\n"]}),"\n",(0,s.jsxs)(n.admonition,{type:"warning",children:[(0,s.jsxs)(n.p,{children:["For local development, please make sure to set the correct ",(0,s.jsx)(n.code,{children:"DATABASE_URL"})," environment variable."]}),(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-bash",children:'# Example\nDATABASE_URL="postgresql://root:RootCqrs@localhost:5432/cqrs?schema=public"\n'})})]}),"\n",(0,s.jsxs)(n.blockquote,{children:["\n",(0,s.jsxs)(n.p,{children:["You could view ",(0,s.jsx)(n.a,{href:"https://www.prisma.io/docs/orm/prisma-client",children:"prisma-client documentation"})," for more information"]}),"\n"]}),"\n",(0,s.jsx)(n.h2,{id:"design-table-convention",children:"Design table convention"}),"\n",(0,s.jsx)(n.p,{children:"When creating an RDS table that maps to a DynamoDB table, ensure you add the necessary fields and indexes to the RDS table accordingly."}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:'id         String   @id\ncpk        String // \u30b3\u30de\u30f3\u30c9\u7528PK\ncsk        String // \u30b3\u30de\u30f3\u30c9\u7528SK\npk         String // \u30c7\u30fc\u30bf\u7528PK, MASTER#unigrab (\u30c6\u30ca\u30f3\u30c8\u30b3\u30fc\u30c9)\nsk         String // \u30c7\u30fc\u30bf\u7528SK, \u30de\u30b9\u30bf\u7a2e\u5225\u30b3\u30fc\u30c9#\u30de\u30b9\u30bf\u30b3\u30fc\u30c9\ntenantCode String   @map("tenant_code") // \u30c6\u30ca\u30f3\u30c8\u30b3\u30fc\u30c9, \u3010\u30c6\u30ca\u30f3\u30c8\u30b3\u30fc\u30c9\u30de\u30b9\u30bf\u3011\nseq        Int      @default(0) // \u4e26\u3073\u9806, \u63a1\u756a\u6a5f\u80fd\u3092\u4f7f\u7528\u3059\u308b\ncode       String // \u30ec\u30b3\u30fc\u30c9\u306e\u30b3\u30fc\u30c9, \u30de\u30b9\u30bf\u7a2e\u5225\u30b3\u30fc\u30c9#\u30de\u30b9\u30bf\u30b3\u30fc\u30c9\nname       String // \u30ec\u30b3\u30fc\u30c9\u540d, \u540d\u524d\nversion    Int // \u30d0\u30fc\u30b8\u30e7\u30f3\nisDeleted  Boolean  @default(false) @map("is_deleted") // \u524a\u9664\u30d5\u30e9\u30b0\ncreatedBy  String   @default("") @map("created_by") // \u4f5c\u6210\u8005\ncreatedIp  String   @default("") @map("created_ip") // \u4f5c\u6210IP, IPv6\u3082\u8003\u616e\u3059\u308b\ncreatedAt  DateTime @default(dbgenerated("CURRENT_TIMESTAMP(0)")) @map("created_at") @db.Timestamp(0) // \u4f5c\u6210\u65e5\u6642\nupdatedBy  String   @default("") @map("updated_by") // \u66f4\u65b0\u8005\nupdatedIp  String   @default("") @map("updated_ip") // \u66f4\u65b0IP, IPv6\u3082\u8003\u616e\u3059\u308b\nupdatedAt  DateTime @default(dbgenerated("CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0)")) @map("updated_at") @db.Timestamp(0) // \u66f4\u65b0\u65e5\u6642\n\n// properties\n\n// relations\n\n// index\n@@unique([cpk, csk])\n@@unique([pk, sk])\n'})})]})}function p(e={}){const{wrapper:n}={...(0,r.R)(),...e.components};return n?(0,s.jsx)(n,{...e,children:(0,s.jsx)(l,{...e})}):l(e)}},8453:(e,n,t)=>{t.d(n,{R:()=>i,x:()=>o});var s=t(6540);const r={},a=s.createContext(r);function i(e){const n=s.useContext(a);return s.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function o(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:i(e.components),s.createElement(a.Provider,{value:n},e.children)}}}]);