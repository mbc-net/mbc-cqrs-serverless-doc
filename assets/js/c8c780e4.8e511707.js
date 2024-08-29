"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[363],{9132:(e,n,s)=>{s.r(n),s.d(n,{assets:()=>a,contentTitle:()=>d,default:()=>u,frontMatter:()=>o,metadata:()=>c,toc:()=>l});var r=s(4848),t=s(8453);const o={description:"Learn how to create modules."},d="Modules",c={id:"modules",title:"Modules",description:"Learn how to create modules.",source:"@site/i18n/en/docusaurus-plugin-content-docs/current/modules.md",sourceDirName:".",slug:"/modules",permalink:"/mbc-cqrs-serverless/docs/modules",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/docs/modules.md",tags:[],version:"current",frontMatter:{description:"Learn how to create modules."},sidebar:"tutorialSidebar",previous:{title:"Controllers",permalink:"/mbc-cqrs-serverless/docs/controllers"},next:{title:"Handle event",permalink:"/mbc-cqrs-serverless/docs/handle-event"}},a={},l=[];function i(e){const n={a:"a",code:"code",h1:"h1",header:"header",p:"p",pre:"pre",...(0,t.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.header,{children:(0,r.jsx)(n.h1,{id:"modules",children:"Modules"})}),"\n",(0,r.jsxs)(n.p,{children:["A module is a class annotated with a ",(0,r.jsx)(n.code,{children:"@Module()"})," decorator. The ",(0,r.jsx)(n.code,{children:"@Module()"})," decorator provides metadata that organize the application structure."]}),"\n",(0,r.jsxs)(n.p,{children:["Defining a module in the MBC Serverless Framework is the same as in Nest.js, so please refer to this section using ",(0,r.jsx)(n.a,{href:"https://docs.nestjs.com/modules",children:"the provided link"}),"."]}),"\n",(0,r.jsxs)(n.p,{children:["In the example below, the ",(0,r.jsx)(n.code,{children:"CatModule"})," defines the ",(0,r.jsx)(n.code,{children:"CatController"}),", provides and exports the ",(0,r.jsx)(n.code,{children:"CatService"}),", and imports ",(0,r.jsx)(n.code,{children:"CommandModule"}),". The ",(0,r.jsx)(n.code,{children:"CommandModule"})," is a dynamic module that allows registering ",(0,r.jsx)(n.code,{children:"tableName"})," and ",(0,r.jsx)(n.code,{children:"dataSyncHandlers"}),", with options to enable or disable ",(0,r.jsx)(n.code,{children:"skipError"})," and ",(0,r.jsx)(n.code,{children:"disableDefaultHandler"}),"."]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-ts",children:'@Module({\n  imports: [\n    CommandModule.register({\n      tableName: "cat",\n      dataSyncHandlers: [CatDataSyncRdsHandler],\n    }),\n  ],\n  controllers: [CatController],\n  providers: [CatService],\n  exports: [CatService],\n})\nexport class CatModule {}\n'})}),"\n",(0,r.jsxs)(n.p,{children:["For more details about the ",(0,r.jsx)(n.code,{children:"CommandModule"}),", please refer to the ",(0,r.jsx)(n.a,{href:"/mbc-cqrs-serverless/docs/command-module",children:"API reference"})," section."]})]})}function u(e={}){const{wrapper:n}={...(0,t.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(i,{...e})}):i(e)}},8453:(e,n,s)=>{s.d(n,{R:()=>d,x:()=>c});var r=s(6540);const t={},o=r.createContext(t);function d(e){const n=r.useContext(o);return r.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function c(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(t):e.components||t:d(e.components),r.createElement(o.Provider,{value:n},e.children)}}}]);