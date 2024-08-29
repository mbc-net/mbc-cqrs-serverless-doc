"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[630],{6349:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>a,contentTitle:()=>i,default:()=>m,frontMatter:()=>o,metadata:()=>l,toc:()=>u});var r=n(4848),c=n(8453),s=n(5871);const o={description:"API reference"},i="API reference",l={id:"api-reference",title:"API reference",description:"API reference",source:"@site/i18n/en/docusaurus-plugin-content-docs/current/api-reference.md",sourceDirName:".",slug:"/api-reference",permalink:"/mbc-cqrs-serverless-doc/docs/api-reference",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/docs/api-reference.md",tags:[],version:"current",frontMatter:{description:"API reference"},sidebar:"tutorialSidebar",previous:{title:"Sequence",permalink:"/mbc-cqrs-serverless-doc/docs/sequence"},next:{title:"CommandModule",permalink:"/mbc-cqrs-serverless-doc/docs/command-module"}},a={},u=[];function d(e){const t={h1:"h1",header:"header",p:"p",...(0,c.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(t.header,{children:(0,r.jsx)(t.h1,{id:"api-reference",children:"API reference"})}),"\n",(0,r.jsx)(t.p,{children:"The MBC CQRS framework API reference is divided into the following sections. This document will concentrate on the most commonly used APIs that are essential for building your application."}),"\n","\n",(0,r.jsx)(s.A,{})]})}function m(e={}){const{wrapper:t}={...(0,c.R)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(d,{...e})}):d(e)}},5871:(e,t,n)=>{n.d(t,{A:()=>C});var r=n(6540),c=n(4164),s=n(4718),o=n(8774),i=n(4586);const l=["zero","one","two","few","many","other"];function a(e){return l.filter((t=>e.includes(t)))}const u={locale:"en",pluralForms:a(["one","other"]),select:e=>1===e?"one":"other"};function d(){const{i18n:{currentLocale:e}}=(0,i.A)();return(0,r.useMemo)((()=>{try{return function(e){const t=new Intl.PluralRules(e);return{locale:e,pluralForms:a(t.resolvedOptions().pluralCategories),select:e=>t.select(e)}}(e)}catch(t){return console.error(`Failed to use Intl.PluralRules for locale "${e}".\nDocusaurus will fallback to the default (English) implementation.\nError: ${t.message}\n`),u}}),[e])}function m(){const e=d();return{selectMessage:(t,n)=>function(e,t,n){const r=e.split("|");if(1===r.length)return r[0];r.length>n.pluralForms.length&&console.error(`For locale=${n.locale}, a maximum of ${n.pluralForms.length} plural forms are expected (${n.pluralForms.join(",")}), but the message contains ${r.length}: ${e}`);const c=n.select(t),s=n.pluralForms.indexOf(c);return r[Math.min(s,r.length-1)]}(n,t,e)}}var f=n(6654),p=n(1312),h=n(1107);const g={cardContainer:"cardContainer_fWXF",cardTitle:"cardTitle_rnsV",cardDescription:"cardDescription_PWke"};var x=n(4848);function j(e){let{href:t,children:n}=e;return(0,x.jsx)(o.A,{href:t,className:(0,c.A)("card padding--lg",g.cardContainer),children:n})}function b(e){let{href:t,icon:n,title:r,description:s}=e;return(0,x.jsxs)(j,{href:t,children:[(0,x.jsxs)(h.A,{as:"h2",className:(0,c.A)("text--truncate",g.cardTitle),title:r,children:[n," ",r]}),s&&(0,x.jsx)("p",{className:(0,c.A)("text--truncate",g.cardDescription),title:s,children:s})]})}function A(e){let{item:t}=e;const n=(0,s.Nr)(t),r=function(){const{selectMessage:e}=m();return t=>e(t,(0,p.T)({message:"1 item|{count} items",id:"theme.docs.DocCard.categoryDescription.plurals",description:"The default description for a category card in the generated index about how many items this category includes"},{count:t}))}();return n?(0,x.jsx)(b,{href:n,icon:"\ud83d\uddc3\ufe0f",title:t.label,description:t.description??r(t.items.length)}):null}function v(e){let{item:t}=e;const n=(0,f.A)(t.href)?"\ud83d\udcc4\ufe0f":"\ud83d\udd17",r=(0,s.cC)(t.docId??void 0);return(0,x.jsx)(b,{href:t.href,icon:n,title:t.label,description:t.description??r?.description})}function w(e){let{item:t}=e;switch(t.type){case"link":return(0,x.jsx)(v,{item:t});case"category":return(0,x.jsx)(A,{item:t});default:throw new Error(`unknown item type ${JSON.stringify(t)}`)}}function y(e){let{className:t}=e;const n=(0,s.$S)();return(0,x.jsx)(C,{items:n.items,className:t})}function C(e){const{items:t,className:n}=e;if(!t)return(0,x.jsx)(y,{...e});const r=(0,s.d1)(t);return(0,x.jsx)("section",{className:(0,c.A)("row",n),children:r.map(((e,t)=>(0,x.jsx)("article",{className:"col col--6 margin-bottom--lg",children:(0,x.jsx)(w,{item:e})},t)))})}},8453:(e,t,n)=>{n.d(t,{R:()=>o,x:()=>i});var r=n(6540);const c={},s=r.createContext(c);function o(e){const t=r.useContext(s);return r.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function i(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(c):e.components||c:o(e.components),r.createElement(s.Provider,{value:t},e.children)}}}]);