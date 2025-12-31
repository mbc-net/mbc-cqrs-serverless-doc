---
sidebar_position: 1
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

## {{Related Packages}}

- [{{CLI Tool}}](./cli) - {{CLI tool for code generation}}
- [{{API Reference}}](./api-reference) - {{Detailed API documentation}}
