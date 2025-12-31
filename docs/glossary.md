---
description: {{Glossary}}
---

# {{Glossary}}

{{This is a glossary of the core terms in mbc-cqrs-serverless framework.}}

## {{Design patterns}}

### {{CQRS}}

{{The command query responsibility segregation (CQRS) pattern separates the data mutation, or the command part of a system, from the query part. You can use the CQRS pattern to separate updates and queries if they have different requirements for throughput, latency, or consistency. The CQRS pattern splits the application into two parts—the command side and the query side. The command side handles create, update, and delete requests. The query side runs the query part by using the read replicas.}}

![{{CQRS flow}}](./images/CQRS.png)

> See: {{[CQRS pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/cqrs-pattern.html)}}

### {{Event souring}}

{{The event sourcing pattern is typically used with the CQRS pattern to decouple read from write workloads, and optimize for performance, scalability, and security. Data is stored as a series of events, instead of direct updates to data stores. Microservices replay events from an event store to compute the appropriate state of their own data stores. The pattern provides visibility for the current state of the application and additional context for how the application arrived at that state. The event sourcing pattern works effectively with the CQRS pattern because data can be reproduced for a specific event, even if the command and query data stores have different schemas.}}

> See: {{[Event sourcing pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/service-per-team.html)}}

## {{Tooling/Library/Framework}}

### {{NestJS}}

{{Nest (NestJS) is a framework for building efficient, scalable Node.js server-side applications. It uses progressive JavaScript, is built with and fully supports TypeScript (yet still enables developers to code in pure JavaScript) and combines elements of OOP (Object Oriented Programming), FP (Functional Programming), and FRP (Functional Reactive Programming).}}

> See: {{[Introduction](https://docs.nestjs.com/)}}

### {{Serverless}}

{{The Serverless Framework consists of a Command Line Interface and an optional Dashboard, and helps you deploy code and infrastructure together on Amazon Web Services, while increasingly supporting other cloud providers. The Framework is a YAML-based experience that uses simplified syntax to help you deploy complex infrastructure patterns easily, without needing to be a cloud expert.}}

> See: {{[Serverless Framework - An Introduction](https://www.serverless.com/framework/docs#serverless-framework---an-introduction)}}

### {{Prisma}}

{{Prisma is an ORM for Node.js and Typescript that serves as an alternative to writing plain SQL or using other database access tools, such as Knex or Sequelize. It simplifies database access and management by providing developers with a type-safe query builder and auto-generator.}}

> See: {{[What is Prisma ORM?](https://www.prisma.io/docs/orm/overview/introduction/what-is-prisma)}}
