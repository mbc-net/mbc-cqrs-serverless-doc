"use strict";(self.webpackChunkdoc=self.webpackChunkdoc||[]).push([[203],{6703:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>r,default:()=>l,frontMatter:()=>a,metadata:()=>i,toc:()=>u});var o=n(4848),s=n(8453);const a={description:"Learn how to use and customize authentication and authorization."},r="Authentication",i={id:"authentication",title:"Authentication",description:"Learn how to use and customize authentication and authorization.",source:"@site/i18n/ja/docusaurus-plugin-content-docs/current/authentication.md",sourceDirName:".",slug:"/authentication",permalink:"/mbc-cqrs-serverless-doc/ja/docs/authentication",draft:!1,unlisted:!1,editUrl:"https://github.com/mbc-net/mbc-cqrs-serverless-doc/docs/authentication.md",tags:[],version:"current",frontMatter:{description:"Learn how to use and customize authentication and authorization."},sidebar:"tutorialSidebar",previous:{title:"Building your application",permalink:"/mbc-cqrs-serverless-doc/ja/docs/build-your-application"},next:{title:"Controllers",permalink:"/mbc-cqrs-serverless-doc/ja/docs/controllers"}},c={},u=[{value:"Authentication",id:"authentication-1",level:2},{value:"Authorization",id:"authorization",level:2}];function h(e){const t={a:"a",admonition:"admonition",code:"code",h1:"h1",h2:"h2",header:"header",li:"li",ol:"ol",p:"p",pre:"pre",strong:"strong",...(0,s.R)(),...e.components};return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(t.header,{children:(0,o.jsx)(t.h1,{id:"authentication",children:"Authentication"})}),"\n",(0,o.jsx)(t.p,{children:"Understanding authentication is crucial for protecting your application's data. This page will guide you through what mbc-cqrs-serverless features to use to implement auth."}),"\n",(0,o.jsx)(t.p,{children:"Before starting, it helps to break down the process into three concepts:"}),"\n",(0,o.jsxs)(t.ol,{children:["\n",(0,o.jsxs)(t.li,{children:["\n",(0,o.jsxs)(t.p,{children:[(0,o.jsx)(t.strong,{children:"Authentication"}),": Verifies if the user is who they say they are. It requires the user to prove their identity with something they have, such as a username and password."]}),"\n"]}),"\n",(0,o.jsxs)(t.li,{children:["\n",(0,o.jsxs)(t.p,{children:[(0,o.jsx)(t.strong,{children:"Session Management"}),": Tracks the user's auth state across requests."]}),"\n"]}),"\n",(0,o.jsxs)(t.li,{children:["\n",(0,o.jsxs)(t.p,{children:[(0,o.jsx)(t.strong,{children:"Authorization"}),": Decides what routes and data the user can access."]}),"\n"]}),"\n"]}),"\n",(0,o.jsxs)(t.p,{children:["The examples on this page walk through an ",(0,o.jsx)(t.a,{href:"https://aws.amazon.com/cognito/",children:"Amazon Cognito"})," app client, you can invoke API operations for authentication and authorization of your users."]}),"\n",(0,o.jsx)(t.h2,{id:"authentication-1",children:"Authentication"}),"\n",(0,o.jsxs)(t.p,{children:["We recommend you use ",(0,o.jsx)(t.a,{href:"https://docs.amplify.aws/nextjs/",children:"AWS Amplify"})," to integrate Amazon Cognito with your web and mobile apps. ",(0,o.jsx)("br",{})," Once authenticated, the server will issue a JWT that can be sent as a ",(0,o.jsx)(t.a,{href:"https://datatracker.ietf.org/doc/html/rfc6750",children:"bearer token"})," in an authorization header on subsequent requests to prove authentication."]}),"\n",(0,o.jsx)(t.h2,{id:"authorization",children:"Authorization"}),"\n",(0,o.jsxs)(t.p,{children:["Once a user is authenticated, you can implement authorization to control what the user can access and do within your application. Authorization is orthogonal and independent from authentication. However, authorization requires an authentication mechanism. ",(0,o.jsx)("br",{})," We use optimistic types of authorization check: Checks if the user is authorized to access a route or perform an action using the session data stored in the cookie. Specifically, we implement Role-Based Access Control (RBAC)."]}),"\n",(0,o.jsx)(t.p,{children:"First, let's create a Role enum representing roles in the system:"}),"\n",(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-ts",children:'// role.enum.ts\nimport { ROLE_SYSTEM_ADMIN } from "@mbc-cqrs-severless/core";\n\nexport enum Role {\n  SYSTEM_ADMIN = ROLE_SYSTEM_ADMIN,\n  USER = "user",\n  ADMIN = "admin",\n}\n'})}),"\n",(0,o.jsx)(t.admonition,{type:"tip",children:(0,o.jsx)(t.p,{children:"In more sophisticated systems, you may store roles within a database, or pull them from the external authentication provider."})}),"\n",(0,o.jsx)(t.p,{children:"Now that we have a custom Roles enum, we can use it to any route handler."}),"\n",(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-ts",children:"@Post()\n@Auth(Role.SYSTEM_ADMIN)\nasync create(\n  @INVOKE_CONTEXT() invokeContext: IInvoke,\n  @Body() createCatDto: CreateCatDto,\n) {\n  return this.catsService.create(createCatDto, { invokeContext })\n}\n"})}),"\n",(0,o.jsx)(t.p,{children:"Then, we create a helper function that extracts information from the context."}),"\n",(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-ts",children:'// Event body example\n// {\n//     "claims": {\n//       "cognito:username": "9999#admin",\n//       "auth_time": 1717576015,\n//       "email_verified": false,\n//       "event_id": "b6642f6e-baf7-4a83-a912-ad559a87c327",\n//       "iat": 1717576015,\n//       "jti": "ee7bef16-0ea5-451a-a715-7e8baf1e6cdc",\n//       "sub": "92ca4f68-9ac6-4080-9ae2-2f02a86206a4",\n//       "token_use": "id",\n//       "custom:cci_code": "9999",\n//       "custom:company_code": "999900000",\n//       "custom:member_id": "MEMBER#9999#9999000000#99999",\n//       "custom:user_type": "admin",\n//       "exp": 1717662415,\n//       "aud": "dnk8y7ii3wled35p3lw0l2cd7",\n//       "iss": "http://localhost:9229/local_2G7noHgW"\n//     }\n//   }\nimport {\n  extractInvokeContext,\n  getAuthorizerClaims,\n  HEADER_TENANT_CODE,\n  IInvoke,\n  UserContext,\n} from "@mbc-cqrs-severless/core";\nimport { ExecutionContext } from "@nestjs/common";\n\nexport const getUserContext = (\n  ctx: IInvoke | ExecutionContext\n): UserContext => {\n  if ("getHandler" in ctx) {\n    ctx = extractInvokeContext(ctx);\n  }\n  const claims = getAuthorizerClaims(ctx);\n\n  const userId = claims.sub;\n  const tenantCode =\n    claims["custom:cci_code"] ||\n    (ctx?.event?.headers || {})[HEADER_TENANT_CODE];\n  const tenantRole = claims["custom:user_type"];\n  return {\n    userId,\n    tenantRole,\n    tenantCode,\n  };\n};\n'})}),"\n",(0,o.jsx)(t.p,{children:"Finally, we create a CustomRoleGuard class which will compare the roles assigned to the current user to the actual roles required by the current route being processed."}),"\n",(0,o.jsx)(t.pre,{children:(0,o.jsx)(t.code,{className:"language-ts",children:'import { RolesGuard } from "@mbc-cqrs-severless/core";\nimport { ExecutionContext, Injectable } from "@nestjs/common";\n\nimport { getUserContext } from "./user.context";\n\n@Injectable()\nexport class CustomRoleGuard extends RolesGuard {\n  protected async getUserRole(context: ExecutionContext): Promise<string> {\n    const userContext = getUserContext(context);\n\n    return userContext.tenantRole;\n  }\n\n  protected async verifyTenant(context: ExecutionContext): Promise<boolean> {\n    const userContext = getUserContext(context);\n\n    return !!userContext.tenantCode;\n  }\n}\n'})})]})}function l(e={}){const{wrapper:t}={...(0,s.R)(),...e.components};return t?(0,o.jsx)(t,{...e,children:(0,o.jsx)(h,{...e})}):h(e)}},8453:(e,t,n)=>{n.d(t,{R:()=>r,x:()=>i});var o=n(6540);const s={},a=o.createContext(s);function r(e){const t=o.useContext(a);return o.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function i(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(s):e.components||s:r(e.components),o.createElement(a.Provider,{value:t},e.children)}}}]);