# MBC CQRS Serverless - Demo Video Script

## Video Overview

**Title:** "Build a Production-Ready Serverless API in 5 Minutes"
**Duration:** 5-7 minutes
**Target Audience:** Backend developers, AWS developers, NestJS developers

---

## Scene 1: Hook (0:00 - 0:30)

### Visual
- Split screen: Left shows complex AWS architecture diagram, Right shows simple code

### Script
> "Building enterprise serverless applications on AWS usually means weeks of setup,
> complex event sourcing patterns, and a lot of boilerplate code.
>
> What if you could get all of that... in 5 minutes?
>
> Let me show you MBC CQRS Serverless."

---

## Scene 2: Installation (0:30 - 1:00)

### Visual
- Terminal screen, clean dark theme

### Commands
```bash
# Install the CLI
npm install -g @mbc-cqrs-serverless/cli

# Verify installation
mbc --version
```

### Script
> "First, install the CLI globally. It's a single npm command."

---

## Scene 3: Project Creation (1:00 - 2:00)

### Visual
- Terminal showing project creation

### Commands
```bash
# Create a new project
mbc new todo-api

# Show generated structure
cd todo-api
tree -L 2
```

### Script
> "Now let's create a new project called 'todo-api'.
>
> The CLI generates a complete project structure with:
> - NestJS application setup
> - DynamoDB table configurations
> - Prisma schema for RDS
> - Docker compose for local development
> - Serverless framework configuration
>
> All best practices are baked in from day one."

---

## Scene 4: Local Development (2:00 - 3:00)

### Visual
- Split terminal: Docker logs on left, API server on right

### Commands
```bash
# Terminal 1: Start Docker services
npm run offline:docker

# Terminal 2: Start the API server
npm run offline:sls
```

### Script
> "Local development is a first-class citizen.
>
> Start Docker to run DynamoDB Local and other AWS services.
> Then start the serverless offline server.
>
> No AWS account needed. No cloud costs during development.
> Everything runs on your machine."

---

## Scene 5: Creating a Todo Endpoint (3:00 - 4:30)

### Visual
- VS Code with code editing

### Code to Show
```typescript
// src/todo/todo.controller.ts
@Controller('api/todo')
export class TodoController {
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
  ) {}

  @Post()
  async create(@Body() dto: CreateTodoDto, @IInvoke() ctx: IInvoke) {
    const command = new TodoCommandDto({
      pk: `TODO#${ctx.tenantCode}`,
      sk: `TODO#${Date.now()}`,
      name: dto.title,
      attributes: { completed: false },
    });
    return this.commandService.publishSync(command, { invokeContext: ctx });
  }

  @Get()
  async findAll(@IInvoke() ctx: IInvoke) {
    return this.dataService.listItems({
      pk: `TODO#${ctx.tenantCode}`,
    });
  }
}
```

### Script
> "Let's create a Todo API endpoint.
>
> We inject CommandService for writes and DataService for reads.
> This is the CQRS pattern in action.
>
> The create method builds a command and publishes it.
> Behind the scenes, the framework:
> - Validates the command
> - Persists it to DynamoDB
> - Emits events via DynamoDB Streams
> - Syncs to RDS for complex queries
>
> All with one line of code: publishSync."

---

## Scene 6: Testing the API (4:30 - 5:30)

### Visual
- HTTP client (Postman, Insomnia, or curl)

### Commands
```bash
# Create a todo
curl -X POST http://localhost:4000/api/todo \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn MBC CQRS Serverless"}'

# List todos
curl http://localhost:4000/api/todo
```

### Script
> "Let's test our API.
>
> Create a todo with a POST request.
> The response includes:
> - Unique identifiers (pk, sk)
> - Version for optimistic locking
> - Timestamps
> - Tenant code for multi-tenancy
>
> List all todos with a GET request.
> Data is automatically available from DynamoDB."

---

## Scene 7: What You Get For Free (5:30 - 6:30)

### Visual
- Animated diagram showing data flow

### Script
> "With MBC CQRS Serverless, you get:
>
> **Event Sourcing** - Every change is recorded as an immutable event.
> Perfect for audit logs and debugging.
>
> **Multi-tenancy** - Data isolation is built-in.
> Each tenant sees only their data.
>
> **DynamoDB to RDS Sync** - Use DynamoDB for writes,
> but query with SQL when you need complex joins.
>
> **Sequence Generation** - Auto-incrementing IDs
> with support for date-based rotation.
>
> **Async Tasks** - Long-running processes
> handled by Step Functions automatically."

---

## Scene 8: Call to Action (6:30 - 7:00)

### Visual
- Documentation site, GitHub repo

### Script
> "Ready to build your next serverless application?
>
> Visit our documentation at mbc-cqrs-serverless.mbc-net.com
> or check out the examples on GitHub.
>
> Star the repo if you find it useful,
> and join our community to share your feedback.
>
> Happy coding!"

---

## Production Notes

### Recording Tools
- **Terminal Recording:** asciinema or terminalizer
- **Screen Recording:** OBS Studio or ScreenFlow
- **Code Editor:** VS Code with dark theme
- **Terminal:** iTerm2 or Windows Terminal with dark theme

### Visual Guidelines
- Use large font size (18-20pt) for terminal
- Clean, minimal desktop background
- Consistent color scheme throughout
- Add subtle zoom on key moments

### Audio Guidelines
- Clear, calm narration
- Background music (optional, very low)
- No keyboard sounds during typing

### Post-Production
- Add chapter markers
- Include captions/subtitles
- Add animated transitions between scenes
- Include subscribe/like reminder at end

---

## Short Version (2 minutes)

For social media, create a condensed version:
1. Hook (10 sec)
2. Install + Create (30 sec)
3. Show code (30 sec)
4. Demo API (30 sec)
5. CTA (20 sec)
