"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[765],{3328:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>c,default:()=>a,frontMatter:()=>r,metadata:()=>i,toc:()=>d});var s=t(4848),o=t(8453);const r={description:"Sequence setup and usage."},c="Sequence",i={id:"sequence",title:"Sequence",description:"Sequence setup and usage.",source:"@site/i18n/en/docusaurus-plugin-content-docs/current/sequence.md",sourceDirName:".",slug:"/sequence",permalink:"/mbc-cqrs-serverless/docs/sequence",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/docs/sequence.md",tags:[],version:"current",frontMatter:{description:"Sequence setup and usage."},sidebar:"tutorialSidebar",previous:{title:"DynamoDB",permalink:"/mbc-cqrs-serverless/docs/dynamodb"},next:{title:"API reference",permalink:"/mbc-cqrs-serverless/docs/api-reference"}},l={},d=[];function u(e){const n={code:"code",h1:"h1",header:"header",li:"li",p:"p",pre:"pre",strong:"strong",ul:"ul",...(0,o.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(n.header,{children:(0,s.jsx)(n.h1,{id:"sequence",children:"Sequence"})}),"\n",(0,s.jsxs)(n.p,{children:["Sequence is ",(0,s.jsx)(n.strong,{children:"dynamic modules"}),". It's used for generating sequence in your application."]}),"\n",(0,s.jsxs)(n.p,{children:["The solution for customizing the behavior of the ",(0,s.jsx)(n.code,{children:"SequenceModule"})," is to pass it an options ",(0,s.jsx)(n.code,{children:"object"})," in the static ",(0,s.jsx)(n.code,{children:"register()"})," method. The options object is only contain one property:"]}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.code,{children:"enableController"}),": enable or disable default sequence controller."]}),"\n"]}),"\n",(0,s.jsx)(n.p,{children:"We will create a simple example demonstrating how to use the sequence module and customize authentication for the sequence controller."}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:'// seq.controller.ts\nimport { SequencesController } from "@mbc-cqrs-severless/sequence";\nimport { Controller } from "@nestjs/common";\nimport { ApiTags } from "@nestjs/swagger";\nimport { Auth } from "src/auth/auth.decorator";\nimport { ROLE } from "src/auth/role.enum";\n\n@Controller("api/sequence")\n@ApiTags("sequence")\n@Auth(ROLE.JCCI_ADMIN)\nexport class SeqController extends SequencesController {}\n'})}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:'// seq.module.ts\nimport { SequencesModule } from "@mbc-cqrs-severless/sequence";\nimport { Module } from "@nestjs/common";\n\nimport { SeqController } from "./seq.controller";\n\n@Module({\n  imports: [SequencesModule.register({ enableController: false })],\n  controllers: [SeqController],\n  exports: [SequencesModule],\n})\nexport class SeqModule {}\n'})}),"\n",(0,s.jsxs)(n.p,{children:["Beside controller, we can directly use ",(0,s.jsx)(n.code,{children:"SequenceService"})," to generating sequence by injecting service."]}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"SequenceService"})," have only one public method:"]}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:"async genNewSequence(\n    dto: GenSequenceDto,\n    opts: {\n      invokeContext: IInvoke\n    },\n  )\n"})}),"\n",(0,s.jsxs)(n.p,{children:["You can modify the behavior of the function by providing a ",(0,s.jsx)(n.code,{children:"GenSequenceDto"})," object with certain properties:"]}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.code,{children:"date?: Date"}),": By default, the function uses the current date, but if a specific date is provided, it will generate the sequence for that date instead."]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.code,{children:"rotateBy?: RotateByEnum"}),": You can select one of five values from the RotateByEnum: fiscal_yearly, yearly, monthly, daily, and none. By default, the none type is used."]}),"\n",(0,s.jsxs)(n.li,{children:[(0,s.jsx)(n.code,{children:"tenantCode"})," and ",(0,s.jsx)(n.code,{children:"typeCode"}),": You must provide the tenant code to identify the tenant and the type code for the intended purpose of usage."]}),"\n"]})]})}function a(e={}){const{wrapper:n}={...(0,o.R)(),...e.components};return n?(0,s.jsx)(n,{...e,children:(0,s.jsx)(u,{...e})}):u(e)}},8453:(e,n,t)=>{t.d(n,{R:()=>c,x:()=>i});var s=t(6540);const o={},r=s.createContext(o);function c(e){const n=s.useContext(r);return s.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function i(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(o):e.components||o:c(e.components),s.createElement(r.Provider,{value:n},e.children)}}}]);