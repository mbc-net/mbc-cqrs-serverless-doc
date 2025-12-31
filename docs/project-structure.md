---
description: {{Project structure}}
---

# {{Project structure}}

## {{MBC CQRS serverless Project Structure}}

{{This page provides an overview of the project structure of a mbc-cqrs-serverless application. It covers top-level files and folders, configuration files.}}

### {{Top-level folders}}

{{Top-level folders are used to organize your application's code, infrastructure for local development, data migration, and testing.}}

| <!-- -->    | <!-- -->                    |
| ----------- | --------------------------- |
| infra-local | {{Infrastructure runs in a local environment}} |
| prisma      | {{Configuration for your Prisma ORM and dynamoDB table}}      |
| src         | {{Application source folder}}         |
| test        | {{Configuration for e2e Jest testing and manual API tests}}        |

### {{Top-level files}}

{{Top-level files are used to configure your application, manage dependencies, and define environment variables.}}

| <!-- -->            | <!-- -->                       |
| ------------------- | ------------------------------ |
| .env                | {{Environment variables}}            |
| .env.local          | {{Local environment variables}}      |
| .eslintrc.js        | {{Configuration file for ESLint}}       |
| .gitignore          | {{Specifies files and directories that Git should ignore}}      |
| .prettierrc         | {{Configure Prettier's code formatting rules}}     |
| jest.config.js      | {{Configuration for Jest testing}}    |
| nest-cli.json       | {{Nest.js plugins configuration}}       |
| package-lock.json   | {{Lockfile that holds information on the dependencies installed}}   |
| package.json        | {{Project dependencies and scripts}}        |
| README.md           | {{Information about a project, including its description, installation instruction, and usage guidelines}}         |
| tsconfig.build.json | {{Configuration TypeScript compiler options}} |
| tsconfig.json       | {{Configuration file for TypeScript}}       |

## {{Application module conventions}}

{{The following file conventions are used to define new module in src folder.}}

| <!-- -->             | folder | <!-- -->                        |
| -------------------- | ------ | ------------------------------- |
| dto                  | folder | {{Define the DTO (Data Transfer Object) schema. A DTO is an object that defines how the data will be sent over the network.}}      |
| entities             | folder | {{Define the business object.}} |
| handler              | folder | {{Define the data sync handler classes.}}  |
| [name].service.ts    | file   | {{Define business logics.}}    |
| [name].controller.ts | file   | {{Define a controller.}} |
| [name].module.ts     | file   | {{Organizes code relevant for a specific feature, keeping code organized and establishing clear boundaries.}}     |
