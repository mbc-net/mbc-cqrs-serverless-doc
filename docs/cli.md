---
description: { { CLI } }
---

# {{CLI}}

{{The mbc-cqrs-serverless CLI allows you to create new projects and generate application elements.}}

## {{Installation}}

{{To install the CLI globally:}}

```bash
npm install -g @mbc-cqrs-serverless/cli
```

## {{Available Commands}}

{{To get a list of the available CLI commands, run the following command:}}

```bash
mbc -h
```

{{The output should look like this:}}

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

## {{new Command}}

{{Create a new project:}}

```bash
mbc new [projectName[@version]]
```

### {{Examples}}

{{Create a new project in the current directory:}}

```bash
mbc new
```

{{Create a project with a specific name:}}

```bash
mbc new my-cqrs-app
```

{{Create a project with a specific version:}}

```bash
mbc new my-cqrs-app@0.1.45
```

## {{generate Command}}

{{Generate application elements such as modules, controllers, services, entities, and DTOs.}}

```bash
mbc generate <schematic> [name]
# or
mbc g <schematic> [name]
```

### {{Available Schematics}}

| {{Name}} | {{Alias}} | {{Description}} |
|------|-------|-------------|
| module | mo | {{Create a module}} |
| controller | co | {{Create a controller}} |
| service | se | {{Create a service}} |
| entity | en | {{Create an entity}} |
| dto | dto | {{Create a DTO}} |

### {{Options}}

| {{Option}} | {{Description}} |
|--------|-------------|
| `-d, --dry-run` | {{Report actions that would be taken without writing out results}} |
| `--mode <mode>` | {{Specify the mode of operation: sync or async (default: async)}} |
| `--schema` | {{Enable schema generation (default: true)}} |
| `--no-schema` | {{Disable schema generation}} |

### {{Examples}}

{{Generate a new module:}}

```bash
mbc generate module order
# or
mbc g mo order
```

{{Generate a controller:}}

```bash
mbc generate controller order
# or
mbc g co order
```

{{Generate a service:}}

```bash
mbc generate service order
# or
mbc g se order
```

{{Generate an entity:}}

```bash
mbc generate entity order
# or
mbc g en order
```

{{Generate a DTO:}}

```bash
mbc generate dto order
# or
mbc g dto order
```

{{Dry run (preview without creating files):}}

```bash
mbc g mo order --dry-run
```

## {{start Command}}

{{Start the application with serverless framework:}}

```bash
mbc start
# or
mbc s
```

## {{ui-common Command}}

{{Add mbc-cqrs-ui-common components to your project:}}

```bash
mbc ui-common [options]
# or
mbc ui [options]
```
