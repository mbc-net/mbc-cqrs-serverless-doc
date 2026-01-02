---
description: {{Build your first MBC CQRS Serverless application in 15 minutes.}}
---

# {{Quickstart Tutorial}}

{{This tutorial will guide you through creating your first MBC CQRS Serverless application. By the end, you'll have a working API running locally.}}

## {{Prerequisites}}

{{Before you begin, ensure you have the following installed:}}

- {{Node.js 18.x or later}}
- {{Docker and Docker Compose}}
- {{AWS CLI (configured with credentials)}}
- {{Git}}

## {{Step 1: Create a New Project}}

{{Use the MBC CQRS CLI to scaffold a new project:}}

```bash
npx @mbc-cqrs-serverless/cli new my-app
cd my-app
```

{{The CLI will create a project with the following structure:}}

```
my-app/
├── src/
│   ├── main.ts
│   ├── main.module.ts
│   └── ...
├── infra-local/
│   ├── docker-compose.yml
│   └── serverless.yml
├── prisma/
│   └── schema.prisma
├── package.json
└── ...
```

## {{Step 2: Install Dependencies}}

```bash
npm install
```

## {{Step 3: Start Local Infrastructure}}

{{Start the local development environment using Docker Compose:}}

```bash
npm run offline:docker
```

{{This starts the following services:}}

- {{DynamoDB Local (port 8000)}}
- {{PostgreSQL (port 5432)}}
- {{LocalStack for AWS services}}

## {{Step 4: Initialize the Database}}

{{Run Prisma migrations to set up your database schema:}}

```bash
npm run migrate
```

## {{Step 5: Start the Development Server}}

{{In a new terminal, start the Serverless Offline server:}}

```bash
npm run offline:sls
```

{{Your API is now running at `http://localhost:3000`.}}

## {{Step 6: Test Your API}}

{{Test the health endpoint:}}

```bash
curl http://localhost:3000/health
```

{{You should see a response indicating the service is healthy.}}

## {{Creating Your First Endpoint}}

{{Let's create a simple "Hello World" endpoint.}}

### {{Create a Controller}}

{{Create a new file `src/hello/hello.controller.ts`:}}

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('hello')
export class HelloController {
  @Get()
  getHello(): string {
    return 'Hello, MBC CQRS Serverless!';
  }
}
```

### {{Create a Module}}

{{Create a new file `src/hello/hello.module.ts`:}}

```typescript
import { Module } from '@nestjs/common';
import { HelloController } from './hello.controller';

@Module({
  controllers: [HelloController],
})
export class HelloModule {}
```

### {{Register the Module}}

{{Add the HelloModule to your main module in `src/main.module.ts`:}}

```typescript
import { Module } from '@nestjs/common';
import { HelloModule } from './hello/hello.module';

@Module({
  imports: [
    // ... existing imports
    HelloModule,
  ],
})
export class MainModule {}
```

### {{Test the New Endpoint}}

{{Restart the server and test your new endpoint:}}

```bash
curl http://localhost:3000/hello
```

{{You should see: `Hello, MBC CQRS Serverless!`}}

## {{Next Steps}}

{{Congratulations! You've created your first MBC CQRS Serverless application. Here's what to explore next:}}

- {{[Build a Todo App](./build-todo-app) - Learn CQRS patterns by building a complete application}}
- {{[Core Concepts](./architecture) - Understand the CQRS and Event Sourcing architecture}}
- {{[Deployment Guide](./deployment-guide) - Deploy your application to AWS}}

## {{Common Commands}}

| {{Command}} | {{Description}} |
|-------------|-----------------|
| `npm run offline:docker` | {{Start local Docker services}} |
| `npm run offline:sls` | {{Start Serverless Offline}} |
| `npm run migrate` | {{Run database migrations}} |
| `npm run build` | {{Build the application}} |
| `npm run test` | {{Run unit tests}} |
| `npm run test:e2e` | {{Run end-to-end tests}} |

## {{Troubleshooting}}

### {{Docker services won't start}}

{{Ensure Docker is running and you have sufficient resources allocated. Try:}}

```bash
docker-compose -f infra-local/docker-compose.yml down
docker-compose -f infra-local/docker-compose.yml up -d
```

### {{Database connection errors}}

{{Wait a few seconds for PostgreSQL to fully start, then run migrations again:}}

```bash
npm run migrate
```

### {{Port conflicts}}

{{If ports 3000, 5432, or 8000 are in use, stop the conflicting services or modify the port configuration in `docker-compose.yml`.}}
