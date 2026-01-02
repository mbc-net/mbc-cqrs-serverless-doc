---
description: CLI
---

# CLI

The mbc-cqrs-serverless CLI helps you quickly scaffold new projects and generate boilerplate code for modules, services, and entities. It follows the framework's conventions to ensure consistency.

## When to Use the CLI

Use the CLI when you need to:

- Create a new MBC CQRS Serverless project from scratch
- Add a new domain module (product, order, user)
- Generate controller, service, entity, and DTO files with correct structure
- Start the local development server

## Problems the CLI Solves

| Problem | Solution |
|---------|----------|
| Setting up project structure manually is error-prone | `mbc new` creates complete project skeleton |
| Remembering correct file names and imports | `mbc generate` creates consistent boilerplate |
| Forgetting to register modules correctly | Generated code follows NestJS conventions |

## Installation

To install the CLI globally:

```bash
npm install -g @mbc-cqrs-serverless/cli
```

## Available Commands

To get a list of the available CLI commands, run the following command:

```bash
mbc -h
```

The output should look like this:

```bash
Usage: mbc [options] [command]

Options:
  -V, --version           output the version number
  -h, --help              display help for command

Commands:
  new|n [name]            Generate a new CQRS application using the MBC CQRS
                          serverless framework
  generate|g <schematic>  Generate a MBC-cqrs-serverless element
  start|s                 Start application with serverless framework
  ui-common|ui [options]  add mbc-cqrs-ui-common components to your project
  help [command]          display help for command
```

## new Command

### Use Case: Start a New Backend Project

Scenario: You're starting a new microservice or API backend and need the complete project structure with all dependencies.

```bash
mbc new [projectName[@version]]
```

### Examples

Create a new project in the current directory:

```bash
mbc new
```

Create a project with a specific name:

```bash
mbc new my-cqrs-app
```

Create a project with a specific version:

```bash
mbc new my-cqrs-app@0.1.45
```

## generate Command

### Use Case: Add a New Domain to Existing Project

Scenario: Your project needs a new Order feature with API endpoints, business logic, and database entities.

Solution: Generate module, controller, service, entity, and DTO in sequence.

```bash
mbc generate <schematic> [name]
# or
mbc g <schematic> [name]
```

### Available Schematics

| Name | Alias | Description |
|------|-------|-------------|
| module | mo | Create a module |
| controller | co | Create a controller |
| service | se | Create a service |
| entity | en | Create an entity |
| dto | dto | Create a DTO |

### Options

| Option | Description |
|--------|-------------|
| `-d, --dry-run` | Report actions that would be taken without writing out results |
| `--mode <mode>` | Specify the mode of operation: sync or async (default: async) |
| `--schema` | Enable schema generation (default: true) |
| `--no-schema` | Disable schema generation |

### Examples

Generate a new module:

```bash
mbc generate module order
# or
mbc g mo order
```

Generate a controller:

```bash
mbc generate controller order
# or
mbc g co order
```

Generate a service:

```bash
mbc generate service order
# or
mbc g se order
```

Generate an entity:

```bash
mbc generate entity order
# or
mbc g en order
```

Generate a DTO:

```bash
mbc generate dto order
# or
mbc g dto order
```

Dry run (preview without creating files):

```bash
mbc g mo order --dry-run
```

## start Command

### Use Case: Run Local Development Server

Scenario: You want to test API endpoints locally before deploying to AWS.

```bash
mbc start
# or
mbc s
```

## ui-common Command

### Use Case: Add Pre-built UI Components to Frontend

Scenario: You're building a frontend and want to use the standard MBC CQRS UI component library.

```bash
mbc ui-common [options]
# or
mbc ui [options]
```

This command integrates the MBC CQRS UI Common library into your project, providing pre-built UI components and utilities.

## Troubleshooting

### Version not found

```bash
mbc new myapp@999.999.999
# Error: Version not found
```

Solution: Use a valid version number. Check available versions in npm registry.

### Directory not empty

```bash
mbc new my-project
# Error: Directory not empty
```

Solution: Use a new directory or remove existing files before creating a project.

### Permission denied

If you encounter permission errors during global installation:

```bash
sudo npm install -g @mbc-cqrs-serverless/cli
# or use npm prefix
npm config set prefix ~/.npm-global
npm install -g @mbc-cqrs-serverless/cli
```
