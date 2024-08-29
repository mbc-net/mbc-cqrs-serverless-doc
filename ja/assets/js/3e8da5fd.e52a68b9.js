"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[15],{7469:(e,i,s)=>{s.r(i),s.d(i,{assets:()=>a,contentTitle:()=>r,default:()=>m,frontMatter:()=>t,metadata:()=>o,toc:()=>d});var n=s(4848),c=s(8453);const t={description:"EmailService"},r="EmailService",o={id:"email-service",title:"EmailService",description:"EmailService",source:"@site/i18n/ja/docusaurus-plugin-content-docs/current/email-service.md",sourceDirName:".",slug:"/email-service",permalink:"/mbc-cqrs-serverless-doc/ja/docs/email-service",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/edit/master/docs/email-service.md",tags:[],version:"current",frontMatter:{description:"EmailService"},sidebar:"tutorialSidebar",previous:{title:"NotificationModule",permalink:"/mbc-cqrs-serverless-doc/ja/docs/notification-module"},next:{title:"Interfaces",permalink:"/mbc-cqrs-serverless-doc/ja/docs/interfaces"}},a={},d=[{value:"Description",id:"description",level:2},{value:"Methods",id:"methods",level:2},{value:"<em>async</em> <code>sendEmail(msg: EmailNotification)</code>",id:"async-sendemailmsg-emailnotification",level:3}];function l(e){const i={a:"a",code:"code",em:"em",h1:"h1",h2:"h2",h3:"h3",header:"header",p:"p",pre:"pre",...(0,c.R)(),...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(i.header,{children:(0,n.jsx)(i.h1,{id:"emailservice",children:"EmailService"})}),"\n",(0,n.jsx)(i.h2,{id:"description",children:"Description"}),"\n",(0,n.jsxs)(i.p,{children:["This service is designed to send emails using ",(0,n.jsx)(i.a,{href:"https://aws.amazon.com/ses/",children:"AWS SES (Simple Email Service)"}),"."]}),"\n",(0,n.jsx)(i.h2,{id:"methods",children:"Methods"}),"\n",(0,n.jsxs)(i.h3,{id:"async-sendemailmsg-emailnotification",children:[(0,n.jsx)(i.em,{children:"async"})," ",(0,n.jsx)(i.code,{children:"sendEmail(msg: EmailNotification)"})]}),"\n",(0,n.jsx)(i.p,{children:"Composes an email message and immediately queues it for sending."}),"\n",(0,n.jsx)(i.p,{children:"For example:"}),"\n",(0,n.jsx)(i.pre,{children:(0,n.jsx)(i.code,{className:"language-ts",children:'const email = "cat@example.com";\nconst subject = "Welcome to MBC CQRS serverless framework!";\nconst body = "<p>Enjoy</p>";\n\nawait this.mailService.sendEmail({\n  toAddrs: [email],\n  subject,\n  body,\n});\n'})})]})}function m(e={}){const{wrapper:i}={...(0,c.R)(),...e.components};return i?(0,n.jsx)(i,{...e,children:(0,n.jsx)(l,{...e})}):l(e)}},8453:(e,i,s)=>{s.d(i,{R:()=>r,x:()=>o});var n=s(6540);const c={},t=n.createContext(c);function r(e){const i=n.useContext(t);return n.useMemo((function(){return"function"==typeof e?e(i):{...i,...e}}),[i,e])}function o(e){let i;return i=e.disableParentContext?"function"==typeof e.components?e.components(c):e.components||c:r(e.components),n.createElement(t.Provider,{value:i},e.children)}}}]);