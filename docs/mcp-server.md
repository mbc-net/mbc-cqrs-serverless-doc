---
sidebar_position: 1
description: {{MCP Server for AI tool integration with MBC CQRS Serverless.}}
---

# {{MCP Server}}

{{MCP (Model Context Protocol) Server for the MBC CQRS Serverless framework. This package enables interaction with the framework through tools like Claude Code and Cursor.}}

## {{What is MCP?}}

{{Model Context Protocol (MCP) is a protocol for AI tools to interact with applications and frameworks in a standardized way. It provides three main concepts: Resources, Tools, and Prompts.}}

## {{Features}}

### {{Resources}}

{{Access framework documentation and project information.}}

| {{Resource URI}} | {{Description}} |
|--------------|-------------|
| `mbc://docs/overview` | {{Complete framework documentation}} |
| `mbc://docs/llms-short` | {{Concise framework overview}} |
| `mbc://docs/architecture` | {{CQRS architecture guide}} |
| `mbc://docs/errors` | {{Error catalog with solutions}} |
| `mbc://docs/faq` | {{Frequently asked questions}} |
| `mbc://docs/troubleshooting` | {{Troubleshooting guide}} |
| `mbc://docs/security` | {{Security best practices}} |
| `mbc://project/entities` | {{List of project entities}} |
| `mbc://project/modules` | {{List of project modules}} |
| `mbc://project/structure` | {{Project directory structure}} |

### {{Tools}}

{{Provides code generation and project analysis tools.}}

| {{Tool}} | {{Description}} |
|------|-------------|
| `mbc_generate_module` | {{Generate a complete CQRS module}} |
| `mbc_generate_controller` | {{Generate a controller}} |
| `mbc_generate_service` | {{Generate a service}} |
| `mbc_generate_entity` | {{Generate an entity}} |
| `mbc_generate_dto` | {{Generate a DTO}} |
| `mbc_validate_cqrs` | {{Validate CQRS pattern implementation}} |
| `mbc_analyze_project` | {{Analyze project structure}} |
| `mbc_lookup_error` | {{Look up error solutions}} |
| `mbc_check_anti_patterns` | {{Check code for common anti-patterns}} |
| `mbc_health_check` | {{Perform project health check}} |
| `mbc_explain_code` | {{Explain code in MBC context}} |

### {{Prompts}}

{{Provides guided assistance.}}

| {{Prompt}} | {{Description}} |
|--------|-------------|
| `cqrs_implementation_guide` | {{Step-by-step CQRS implementation}} |
| `debug_command_error` | {{Debug command-related errors}} |
| `migration_guide` | {{Version migration guidance}} |

## {{Installation}}

```bash
npm install @mbc-cqrs-serverless/mcp-server
```

{{Or use directly with npx}}:

```bash
npx @mbc-cqrs-serverless/mcp-server
```

## {{Configuration}}

### {{Claude Code}}

{{Add the following configuration to}} `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mbc-cqrs-serverless": {
      "command": "npx",
      "args": ["@mbc-cqrs-serverless/mcp-server"],
      "env": {
        "MBC_PROJECT_PATH": "/path/to/your/project"
      }
    }
  }
}
```

### {{Cursor}}

{{Add to Cursor MCP configuration}}:

```json
{
  "mbc-cqrs-serverless": {
    "command": "npx",
    "args": ["@mbc-cqrs-serverless/mcp-server"],
    "env": {
      "MBC_PROJECT_PATH": "/path/to/your/project"
    }
  }
}
```

### {{Environment Variables}}

| {{Variable}} | {{Description}} | {{Default}} |
|----------|-------------|---------|
| `MBC_PROJECT_PATH` | {{Path to project directory}} | {{Current working directory}} |

## {{Usage Examples}}

### {{Module Generation}}

{{You can ask Claude Code}}:

```
"Generate a new Order module with async command handling"
```

### {{Project Analysis}}

{{Analyze project structure.}}

```
"Analyze my project structure"
```

### {{Debug Assistance}}

{{Get help debugging errors.}}

```
"I'm getting a version mismatch error, help me debug"
```

## {{Code Analysis Tools}} {#code-analysis-tools}

:::info {{Version Note}}
{{Code analysis tools (`mbc_check_anti_patterns`, `mbc_health_check`, `mbc_explain_code`) were added in [version 1.0.22](./changelog#v1022).}}
:::

### {{Anti-Pattern Detection}}

{{The `mbc_check_anti_patterns` tool detects common code issues:}}

| {{Code}} | {{Name}} | {{Severity}} | {{Description}} |
|------|------|----------|-------------|
| AP001 | {{Direct DynamoDB Write}} | {{Critical}} | {{Use CommandService instead of direct DynamoDB writes}} |
| AP002 | {{Ignored Version Mismatch}} | {{High}} | {{Handle VersionMismatchError properly with retry}} |
| AP003 | {{N+1 Query Pattern}} | {{High}} | {{Use batch operations instead of loop queries}} |
| AP004 | {{Full Table Scan}} | {{High}} | {{Use Query with key conditions instead of Scan}} |
| AP005 | {{Hardcoded Tenant}} | {{Critical}} | {{Use getUserContext() for tenant code}} |
| AP006 | {{Missing Tenant Validation}} | {{Critical}} | {{Never trust client-provided tenant codes}} |
| AP007 | {{Throwing in Sync Handler}} | {{High}} | {{Handle errors gracefully in DataSyncHandler}} |
| AP008 | {{Hardcoded Secret}} | {{Critical}} | {{Use environment variables or Secrets Manager}} |
| AP009 | {{Manual JWT Parsing}} | {{Critical}} | {{Use built-in Cognito authorizer}} |
| AP010 | {{Heavy Module Import}} | {{Medium}} | {{Import only needed functions to reduce cold start}} |

### {{Health Check}}

{{The `mbc_health_check` tool verifies project configuration:}}

- {{MBC framework packages installation}}
- {{NestJS dependencies}}
- {{TypeScript configuration}}
- {{Environment file setup}}
- {{Source directory structure}}
- {{Serverless configuration}}

### {{Code Explanation}}

{{The `mbc_explain_code` tool analyzes code and explains:}}

- {{NestJS module structure and imports}}
- {{REST controller endpoints}}
- {{Service patterns and dependencies}}
- {{Entity definitions and DynamoDB keys}}
- {{CQRS command publishing patterns}}
- {{Data sync handler behavior}}

## {{Claude Code Skills}} {#claude-code-skills}

:::info {{Version Note}}
{{Claude Code Skills were added in [version 1.0.24](/docs/changelog#v1024).}}
:::

{{Claude Code Skills provide guided assistance for MBC CQRS Serverless development. Skills are specialized prompts that help developers with common tasks.}}

### {{Available Skills}}

| {{Skill}} | {{Description}} |
|-------|-------------|
| `/mbc-generate` | {{Generate boilerplate code (modules, services, controllers, DTOs, handlers)}} |
| `/mbc-review` | {{Review code for best practices and anti-patterns (20 patterns)}} |
| `/mbc-migrate` | {{Guide version migrations and breaking changes}} |
| `/mbc-debug` | {{Debug and troubleshoot common issues}} |

### {{Installing Skills}}

#### {{Using CLI (Recommended)}}

{{The easiest way to install skills is using the MBC CLI:}}

```bash
# {{Install to personal skills directory (available in all projects)}}
mbc install-skills

# {{Install to project directory (shared with team via git)}}
mbc install-skills --project

# {{List available skills}}
mbc install-skills --list

# {{Force overwrite existing skills}}
mbc install-skills --force
```

#### {{Manual Installation}}

{{Alternatively, copy them manually to your Claude Code skills directory:}}

```bash
# {{Copy to personal skills (available in all projects)}}
cp -r node_modules/@mbc-cqrs-serverless/mcp-server/skills/* ~/.claude/skills/

# {{Or copy to project skills (shared with team)}}
cp -r node_modules/@mbc-cqrs-serverless/mcp-server/skills/* .claude/skills/
```

### {{/mbc-generate Skill}}

{{Generates boilerplate code following MBC CQRS Serverless best practices.}}

**{{Core Templates:}}**
- {{Module, Controller, Service, DTOs, DataSyncHandler}}

**{{Additional Templates:}}**
- {{Event Handler for custom event processing}}
- {{Query Handler for complex searches}}
- {{Elasticsearch Sync Handler}}
- {{GraphQL Resolver}}

**{{Example Usage:}}**
```
/mbc-generate
Create an Order module with RDS synchronization
```

### {{/mbc-review Skill}}

{{Reviews code for MBC CQRS Serverless best practices and identifies anti-patterns.}}

**{{Anti-Patterns Detected (20 patterns):}}**

| {{Code}} | {{Description}} | {{Severity}} |
|------|-------------|----------|
| AP001 | {{Using publishSync instead of publishAsync}} | {{Warning}} |
| AP002 | {{Missing tenantCode in multi-tenant operations}} | {{Error}} |
| AP003 | {{Hardcoded version numbers}} | {{Error}} |
| AP004 | {{Missing DataSyncHandler registration}} | {{Error}} |
| AP005 | {{Not handling ConditionalCheckFailedException}} | {{Warning}} |
| AP006 | {{Using wrong PK/SK format}} | {{Error}} |
| AP007 | {{Missing invokeContext in service methods}} | {{Error}} |
| AP008 | {{Not using generateId for entity IDs}} | {{Warning}} |
| AP009 | {{Missing DTO validation decorators}} | {{Warning}} |
| AP010 | {{Deprecated method usage}} | {{Warning}} |
| AP011 | {{Missing getCommandSource for tracing}} | {{Warning}} |
| AP012 | {{Direct DynamoDB access instead of DataService}} | {{Warning}} |
| AP013 | {{Missing type declaration in DataSyncHandler}} | {{Error}} |
| AP014 | {{Not using DetailKey type}} | {{Info}} |
| AP015 | {{Hardcoded table names}} | {{Warning}} |
| AP016 | {{Missing error logging}} | {{Warning}} |
| AP017 | {{Incorrect attribute merging}} | {{Error}} |
| AP018 | {{Missing Swagger documentation}} | {{Info}} |
| AP019 | {{Not handling pagination correctly}} | {{Warning}} |
| AP020 | {{Circular module dependencies}} | {{Error}} |

**{{Example Usage:}}**
```
/mbc-review
Review the code in src/order/order.service.ts
```

### {{/mbc-migrate Skill}}

{{Guides version migrations for MBC CQRS Serverless framework.}}

**{{Features:}}**
- {{Version migration matrix (v1.0.16 to v1.0.23)}}
- {{Detailed migration guides for each version}}
- {{Deprecated API migration instructions}}
- {{Migration checklist (before, during, after)}}
- {{Version compatibility matrix}}

**{{Example Usage:}}**
```
/mbc-migrate
I need to upgrade from v1.0.20 to v1.0.23
```

### {{/mbc-debug Skill}}

{{Helps debug and troubleshoot issues in MBC CQRS Serverless applications.}}

**{{Features:}}**
- {{Error code quick lookup}}
- {{6 debugging workflows (Command, ConditionalCheckFailedException, DataSyncHandler, Tenant, Import, Performance)}}
- {{CloudWatch log queries}}
- {{Local development debugging (LocalStack, Serverless Offline)}}
- {{Troubleshooting decision tree}}

**{{Example Usage:}}**
```
/mbc-debug
I'm getting ConditionalCheckFailedException errors
```

## {{Related Packages}}

- [{{CLI Tool}}](./cli) - {{CLI tool for code generation}}
- [{{API Reference}}](./api-reference) - {{Detailed API documentation}}
