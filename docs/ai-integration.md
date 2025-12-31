---
sidebar_position: 1
---

# {{AI Integration}}

{{The MBC CQRS Serverless framework is designed with AI tool integration in mind.}}

## {{Overview}}

{{Modern development workflows increasingly include AI assistance for code generation, debugging, and documentation lookup. This framework supports AI development tools through llms.txt files and MCP server.}}

## {{llms.txt Convention}}

### {{What is llms.txt?}}

{{The llms.txt convention provides a standardized way for websites and projects to expose information for LLMs.}}

### {{File Structure}}

{{The framework provides two versions:}}

- **`llms.txt`** - {{Concise overview and quick reference}}
- **`llms-full.txt`** - {{Comprehensive documentation and context}}

### {{Using llms.txt}}

{{AI tools can directly fetch these files to build context about the framework:}}

```bash
# Short version for quick context
curl https://raw.githubusercontent.com/mbc-net/mbc-cqrs-serverless/main/llms.txt

# Full version for comprehensive context
curl https://raw.githubusercontent.com/mbc-net/mbc-cqrs-serverless/main/llms-full.txt
```

## {{MCP Server Integration}}

{{The Model Context Protocol (MCP) server provides a more dynamic way for AI tools to interact with the framework.}}

### {{Key Features}}

| {{Feature}} | {{Description}} |
|---------|-------------|
| Resources | {{Access to framework documentation}} |
| Tools | {{Code generation and validation tools}} |
| Prompts | {{Guided workflows for common tasks}} |

### {{Setup}}

{{Add to Claude Code or other MCP-compatible tools:}}

```json
{
  "mcpServers": {
    "mbc-cqrs-serverless": {
      "command": "npx",
      "args": ["@mbc-cqrs-serverless/mcp-server"]
    }
  }
}
```

{{Learn more}}: [{{MCP Server Documentation}}](./mcp-server)

## {{Best Practices}}

### {{Documentation First}}

{{Before tackling complex tasks, let AI read the framework documentation:}}

1. {{Use MCP resources to fetch architecture documentation}}
2. {{Review CQRS patterns and event sourcing concepts}}
3. {{Examine existing modules as reference patterns}}

### {{Code Generation}}

{{When asking AI to generate modules, be specific:}}

```
"Generate an Order module with async command handling and validation"
```

### {{Debugging Assistance}}

{{When encountering errors, AI can use the error catalog to find solutions:}}

```
"I'm getting error 'version not match'. What should I do?"
```

## {{Supported Tools}}

{{The following AI tools can integrate with MBC CQRS Serverless:}}

| {{Tool}} | {{Support}} | {{Notes}} |
|------|---------|-------|
| Claude Code | {{Full Support}} | {{Native MCP support}} |
| Cursor | {{Full Support}} | {{MCP support available}} |
| GitHub Copilot | {{Partial Support}} | {{Via llms.txt}} |

## {{Related Resources}}

- [{{MCP Server}}](./mcp-server) - {{Detailed MCP server documentation}}
- [{{CLI Tool}}](./cli) - {{CLI commands for code generation}}
- [{{Error Catalog}}](./error-catalog) - {{Error reference with solutions}}
- [{{Architecture}}](./architecture) - {{System architecture overview}}
