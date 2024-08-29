"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[188],{5779:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>i,contentTitle:()=>c,default:()=>m,frontMatter:()=>s,metadata:()=>a,toc:()=>d});var r=t(4848),o=t(8453);const s={description:"Learn how to create a custom event in your application and register a handler to respond to this event."},c="Custom event",a={id:"custom-event",title:"Custom event",description:"Learn how to create a custom event in your application and register a handler to respond to this event.",source:"@site/i18n/en/docusaurus-plugin-content-docs/current/custom-event.md",sourceDirName:".",slug:"/custom-event",permalink:"/mbc-cqrs-serverless-doc/docs/custom-event",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/docs/custom-event.md",tags:[],version:"current",frontMatter:{description:"Learn how to create a custom event in your application and register a handler to respond to this event."},sidebar:"tutorialSidebar",previous:{title:"Handle event",permalink:"/mbc-cqrs-serverless-doc/docs/handle-event"},next:{title:"Data sync event",permalink:"/mbc-cqrs-serverless-doc/docs/data-sync-event"}},i={},d=[];function l(e){const n={code:"code",h1:"h1",header:"header",p:"p",pre:"pre",...(0,o.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.header,{children:(0,r.jsx)(n.h1,{id:"custom-event",children:"Custom event"})}),"\n",(0,r.jsx)(n.p,{children:"This guide will walk you through the process of creating a custom event in your application and registering a handler to respond to this event. Events are a powerful way to decouple your application\u2019s logic, allowing different parts of your system to communicate without being tightly integrated."}),"\n",(0,r.jsxs)(n.p,{children:["First, you need to create a custom event that implements the ",(0,r.jsx)(n.code,{children:"IEvent"})," interface from ",(0,r.jsx)(n.code,{children:"@mbc-cqrs-serverless/core"}),". Depending on the event, you should typically implement a second interface from the ",(0,r.jsx)(n.code,{children:"aws-lambda"})," library, such as ",(0,r.jsx)(n.code,{children:"SNSEventRecord"}),", ",(0,r.jsx)(n.code,{children:"SQSRecord"}),", ",(0,r.jsx)(n.code,{children:"DynamoDBRecord"}),", ",(0,r.jsx)(n.code,{children:"EventBridgeEvent"}),", ",(0,r.jsx)(n.code,{children:"S3EventRecord"}),", etc."]}),"\n",(0,r.jsx)(n.p,{children:"In the following example, we will create a custom S3 event and register this event handler."}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-ts",children:'// custom-s3-import.event\nimport { IEvent } from "@mbc-cqrs-severless/core";\nimport { S3EventRecord, S3EventRecordGlacierEventData } from "aws-lambda";\n\nexport class CustomS3EventRecord implements IEvent, S3EventRecord {\n  source: string;\n  eventVersion: string;\n  eventSource: string;\n  awsRegion: string;\n  eventTime: string;\n  eventName: string;\n  userIdentity: { principalId: string };\n  requestParameters: { sourceIPAddress: string };\n  responseElements: { "x-amz-request-id": string; "x-amz-id-2": string };\n  glacierEventData?: S3EventRecordGlacierEventData;\n  s3: {\n    s3SchemaVersion: string;\n    configurationId: string;\n    bucket: {\n      name: string;\n      ownerIdentity: { principalId: string };\n      arn: string;\n    };\n    object: {\n      key: string;\n      size: number;\n      eTag: string;\n      versionId?: string | undefined;\n      sequencer: string;\n    };\n  };\n\n  fromS3Record(record: S3EventRecord): S3ImportEvent {\n    Object.assign(this, record, {\n      source: record.eventSource,\n    });\n    return this;\n  }\n}\n'})}),"\n",(0,r.jsxs)(n.p,{children:["With ",(0,r.jsx)(n.code,{children:"CustomS3EventRecord"})," in place, you can now create a handler for this event."]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-ts",children:'// custom-s3.event.handler.ts\nimport { EventHandler, IEventHandler } from "@mbc-cqrs-severless/core";\nimport { Logger } from "@nestjs/common";\nimport { CustomS3EventRecord } from "./custom-s3-import.event";\n@EventHandler(CustomS3EventRecord)\nexport class CustomS3EventHandler\n  implements IEventHandler<CustomS3EventRecord>\n{\n  private readonly logger: Logger = new Logger(S3ImportEventHandler.name);\n\n  constructor() {}\n  async execute(event: CustomS3EventRecord): Promise<any> {\n    this.logger.debug("executing::", JSON.stringify(event, null, 2));\n  }\n}\n'})}),"\n",(0,r.jsxs)(n.p,{children:["As you can see, ",(0,r.jsx)(n.code,{children:"CustomS3EventHandler"})," is a class annotated with the ",(0,r.jsx)(n.code,{children:"@EventHandler(T)"})," decorator and implements the ",(0,r.jsx)(n.code,{children:"IEventHandler<T>"})," interface."]}),"\n",(0,r.jsxs)(n.p,{children:["Finally, you need to create a CustomEventFactory that extends ",(0,r.jsx)(n.code,{children:"DefaultEventFactory"})," and is annotated with the ",(0,r.jsx)(n.code,{children:"@EventFactory()"})," decorator."]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-ts",children:'import {\n  DefaultEventFactory,\n  EventFactory,\n  IEvent,\n} from "@mbc-cqrs-severless/core";\nimport { Logger } from "@nestjs/common";\nimport { S3Event } from "aws-lambda";\n\nimport { S3ImportEvent } from "./quote-import/event/s3-import.event";\n\n@EventFactory()\nexport class CustomEventFactory extends DefaultEventFactory {\n  private readonly logger = new Logger(CustomEventFactory.name);\n\n  async transformS3(event: S3Event): Promise<IEvent[]> {\n    const s3Events = event.Records.map((record) => {\n      const isCustomEvent = true;\n      if (isCustomEvent) {\n        return new S3ImportEvent().fromS3Record(record);\n      }\n      return undefined;\n    }).filter((event) => !!event);\n\n    return s3Events;\n  }\n}\n'})}),"\n",(0,r.jsxs)(n.p,{children:["Similarly, you could override other methods of the ",(0,r.jsx)(n.code,{children:"DefaultEventFactory"})," class to create and handle custom events."]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-ts",children:"transformSqs(event: SQSEvent): Promise<IEvent[]>;\ntransformSns(event: SNSEvent): Promise<IEvent[]>;\ntransformDynamodbStream(event: DynamoDBStreamEvent): Promise<IEvent[]>;\ntransformEventBridge(event: EventBridgeEvent<any, any>): Promise<IEvent[]>;\ntransformStepFunction(event: StepFunctionsEvent<any>): Promise<IEvent[]>;\ntransformS3(event: S3Event): Promise<IEvent[]>;\n"})})]})}function m(e={}){const{wrapper:n}={...(0,o.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(l,{...e})}):l(e)}},8453:(e,n,t)=>{t.d(n,{R:()=>c,x:()=>a});var r=t(6540);const o={},s=r.createContext(o);function c(e){const n=r.useContext(s);return r.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function a(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(o):e.components||o:c(e.components),r.createElement(s.Provider,{value:n},e.children)}}}]);