"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[133],{2800:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>i,contentTitle:()=>o,default:()=>m,frontMatter:()=>l,metadata:()=>a,toc:()=>d});var r=n(4848),s=n(8453),c=n(5871);const l={description:"Handle event"},o="Handle event",a={id:"handle-event",title:"Handle event",description:"Handle event",source:"@site/i18n/ja/docusaurus-plugin-content-docs/current/handle-event.md",sourceDirName:".",slug:"/handle-event",permalink:"/mbc-cqrs-serverless-doc/ja/docs/handle-event",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/docs/handle-event.md",tags:[],version:"current",frontMatter:{description:"Handle event"},sidebar:"tutorialSidebar",previous:{title:"Modules",permalink:"/mbc-cqrs-serverless-doc/ja/docs/modules"},next:{title:"Custom event",permalink:"/mbc-cqrs-serverless-doc/ja/docs/custom-event"}},i={},d=[];function u(e){const t={a:"a",h1:"h1",header:"header",li:"li",p:"p",ul:"ul",...(0,s.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(t.header,{children:(0,r.jsx)(t.h1,{id:"handle-event",children:"Handle event"})}),"\n",(0,r.jsx)(t.p,{children:"Currently, we support customizing six types of events. There are:"}),"\n",(0,r.jsxs)(t.ul,{children:["\n",(0,r.jsx)(t.li,{children:(0,r.jsx)(t.a,{href:"https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html#sns-sample-event",children:"SNS event"})}),"\n",(0,r.jsx)(t.li,{children:(0,r.jsx)(t.a,{href:"https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#example-standard-queue-message-event",children:"SQS event"})}),"\n",(0,r.jsx)(t.li,{children:(0,r.jsx)(t.a,{href:"https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html#events-sample-dynamodb",children:"DynamoDB event"})}),"\n",(0,r.jsx)(t.li,{children:"Event Bridge event"}),"\n",(0,r.jsx)(t.li,{children:"Step function event"}),"\n",(0,r.jsx)(t.li,{children:(0,r.jsx)(t.a,{href:"https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html",children:"S3 event"})}),"\n"]}),"\n",(0,r.jsx)(t.p,{children:"This guide will help you create a custom event and register a handler for it."}),"\n","\n",(0,r.jsx)(c.A,{})]})}function m(e={}){const{wrapper:t}={...(0,s.R)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(u,{...e})}):u(e)}},5871:(e,t,n)=>{n.d(t,{A:()=>N});var r=n(6540),s=n(4164),c=n(4718),l=n(8774),o=n(4586);const a=["zero","one","two","few","many","other"];function i(e){return a.filter((t=>e.includes(t)))}const d={locale:"en",pluralForms:i(["one","other"]),select:e=>1===e?"one":"other"};function u(){const{i18n:{currentLocale:e}}=(0,o.A)();return(0,r.useMemo)((()=>{try{return function(e){const t=new Intl.PluralRules(e);return{locale:e,pluralForms:i(t.resolvedOptions().pluralCategories),select:e=>t.select(e)}}(e)}catch(t){return console.error(`Failed to use Intl.PluralRules for locale "${e}".\nDocusaurus will fallback to the default (English) implementation.\nError: ${t.message}\n`),d}}),[e])}function m(){const e=u();return{selectMessage:(t,n)=>function(e,t,n){const r=e.split("|");if(1===r.length)return r[0];r.length>n.pluralForms.length&&console.error(`For locale=${n.locale}, a maximum of ${n.pluralForms.length} plural forms are expected (${n.pluralForms.join(",")}), but the message contains ${r.length}: ${e}`);const s=n.select(t),c=n.pluralForms.indexOf(s);return r[Math.min(c,r.length-1)]}(n,t,e)}}var h=n(6654),p=n(1312),f=n(1107);const x={cardContainer:"cardContainer_fWXF",cardTitle:"cardTitle_rnsV",cardDescription:"cardDescription_PWke"};var v=n(4848);function g(e){let{href:t,children:n}=e;return(0,v.jsx)(l.A,{href:t,className:(0,s.A)("card padding--lg",x.cardContainer),children:n})}function j(e){let{href:t,icon:n,title:r,description:c}=e;return(0,v.jsxs)(g,{href:t,children:[(0,v.jsxs)(f.A,{as:"h2",className:(0,s.A)("text--truncate",x.cardTitle),title:r,children:[n," ",r]}),c&&(0,v.jsx)("p",{className:(0,s.A)("text--truncate",x.cardDescription),title:c,children:c})]})}function b(e){let{item:t}=e;const n=(0,c.Nr)(t),r=function(){const{selectMessage:e}=m();return t=>e(t,(0,p.T)({message:"1 item|{count} items",id:"theme.docs.DocCard.categoryDescription.plurals",description:"The default description for a category card in the generated index about how many items this category includes"},{count:t}))}();return n?(0,v.jsx)(j,{href:n,icon:"\ud83d\uddc3\ufe0f",title:t.label,description:t.description??r(t.items.length)}):null}function w(e){let{item:t}=e;const n=(0,h.A)(t.href)?"\ud83d\udcc4\ufe0f":"\ud83d\udd17",r=(0,c.cC)(t.docId??void 0);return(0,v.jsx)(j,{href:t.href,icon:n,title:t.label,description:t.description??r?.description})}function y(e){let{item:t}=e;switch(t.type){case"link":return(0,v.jsx)(w,{item:t});case"category":return(0,v.jsx)(b,{item:t});default:throw new Error(`unknown item type ${JSON.stringify(t)}`)}}function C(e){let{className:t}=e;const n=(0,c.$S)();return(0,v.jsx)(N,{items:n.items,className:t})}function N(e){const{items:t,className:n}=e;if(!t)return(0,v.jsx)(C,{...e});const r=(0,c.d1)(t);return(0,v.jsx)("section",{className:(0,s.A)("row",n),children:r.map(((e,t)=>(0,v.jsx)("article",{className:"col col--6 margin-bottom--lg",children:(0,v.jsx)(y,{item:e})},t)))})}},8453:(e,t,n)=>{n.d(t,{R:()=>l,x:()=>o});var r=n(6540);const s={},c=r.createContext(s);function l(e){const t=r.useContext(c);return r.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function o(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(s):e.components||s:l(e.components),r.createElement(c.Provider,{value:t},e.children)}}}]);