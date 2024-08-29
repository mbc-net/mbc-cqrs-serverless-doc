"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[816],{975:(e,t,d)=>{d.r(t),d.d(t,{assets:()=>i,contentTitle:()=>o,default:()=>h,frontMatter:()=>r,metadata:()=>c,toc:()=>a});var n=d(4848),s=d(8453);const r={description:"Learn how to use CommandModule."},o="CommandModule",c={id:"command-module",title:"CommandModule",description:"Learn how to use CommandModule.",source:"@site/i18n/ja/docusaurus-plugin-content-docs/current/command-module.md",sourceDirName:".",slug:"/command-module",permalink:"/mbc-cqrs-serverless-doc/ja/docs/command-module",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/docs/command-module.md",tags:[],version:"current",frontMatter:{description:"Learn how to use CommandModule."},sidebar:"tutorialSidebar",previous:{title:"API reference",permalink:"/mbc-cqrs-serverless-doc/ja/docs/api-reference"},next:{title:"CommandService",permalink:"/mbc-cqrs-serverless-doc/ja/docs/command-service"}},i={},a=[{value:"Description",id:"description",level:2},{value:"Methods",id:"methods",level:2},{value:"<em>static</em> <code>register(option)</code>",id:"static-registeroption",level:3}];function l(e){const t={code:"code",em:"em",h1:"h1",h2:"h2",h3:"h3",header:"header",img:"img",p:"p",pre:"pre",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",...(0,s.R)(),...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(t.header,{children:(0,n.jsx)(t.h1,{id:"commandmodule",children:"CommandModule"})}),"\n",(0,n.jsx)(t.p,{children:(0,n.jsx)(t.img,{alt:"CommandModule structure",src:d(9927).A+"",width:"1477",height:"379"})}),"\n",(0,n.jsx)(t.h2,{id:"description",children:"Description"}),"\n",(0,n.jsxs)(t.p,{children:["The ",(0,n.jsx)(t.code,{children:"CommandModule"})," is a dynamic module used to register data sync handlers and provide some services associated with the table name."]}),"\n",(0,n.jsx)(t.h2,{id:"methods",children:"Methods"}),"\n",(0,n.jsxs)(t.h3,{id:"static-registeroption",children:[(0,n.jsx)(t.em,{children:"static"})," ",(0,n.jsx)(t.code,{children:"register(option)"})]}),"\n",(0,n.jsx)(t.p,{children:"When import this module, you must provide a specific option for use. The option has 4 properties that you can configure:"}),"\n",(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:"Properties"}),(0,n.jsx)(t.th,{children:"Description"})]})}),(0,n.jsxs)(t.tbody,{children:[(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:"tableName: string"})}),(0,n.jsx)(t.td,{children:"provide table name"})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:"skipError?: boolean"})}),(0,n.jsxs)(t.td,{children:["If set to ",(0,n.jsx)(t.code,{children:"true"}),", it will skip errors from previous commands."]})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:"dataSyncHandlers?: Type[]"})}),(0,n.jsx)(t.td,{children:"register data sync handler"})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:"disableDefaulHandler?: boolean"})}),(0,n.jsxs)(t.td,{children:["If set to ",(0,n.jsx)(t.code,{children:"true"}),", it will reset default data sync handlers"]})]})]})]}),"\n",(0,n.jsx)(t.p,{children:"For example:"}),"\n",(0,n.jsx)(t.pre,{children:(0,n.jsx)(t.code,{className:"language-ts",children:'CommandModule.register({\n  tableName: "cat",\n  dataSyncHandlers: [CatDataSyncRdsHandler],\n});\n'})}),"\n",(0,n.jsxs)(t.p,{children:["Here, the ",(0,n.jsx)(t.code,{children:"CommandModule"})," registers with the ",(0,n.jsx)(t.code,{children:"cat"})," table name and provides the ",(0,n.jsx)(t.code,{children:"CatDataSyncRdsHandler"})," to the data sync handlers."]})]})}function h(e={}){const{wrapper:t}={...(0,s.R)(),...e.components};return t?(0,n.jsx)(t,{...e,children:(0,n.jsx)(l,{...e})}):l(e)}},9927:(e,t,d)=>{d.d(t,{A:()=>n});const n=d.p+"assets/images/CommandModule-6794cea659ee358d3f3283eb83c53e78.png"},8453:(e,t,d)=>{d.d(t,{R:()=>o,x:()=>c});var n=d(6540);const s={},r=n.createContext(s);function o(e){const t=n.useContext(r);return n.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function c(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(s):e.components||s:o(e.components),n.createElement(r.Provider,{value:t},e.children)}}}]);