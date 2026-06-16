---
sidebar_position: 3
description: Optimized prompts for AI-assisted development with MBC CQRS Serverless.
---

# AI Prompts Library

This page provides optimized prompts for common development tasks when using AI assistants with the MBC CQRS Serverless framework.

## Module Generation {#module-generation}

### Create a New CQRS Module

```text
Create a new CQRS module for [FEATURE_NAME] in MBC CQRS Serverless with:
- CommandModule registration with table name "[TABLE_NAME]"
- Command handlers: Create, Update, Delete (async processing)
- DataService for queries: list with pagination, getById
- Entity extending DataEntity with attributes
- DTOs for create, update, and response
- Follow existing patterns in the codebase
```

### Create a Module with RDS Sync

```text
Create a CQRS module for [FEATURE_NAME] that syncs data to RDS:
- CommandModule with DataSyncHandler for RDS
- Prisma model in prisma/schema.prisma for the RDS table
- Handle create, update, and delete sync operations
- Include error handling for sync failures
```

## Command Operations {#command-operations}

### Implement Async Command

```text
Implement an async command handler for [OPERATION] in MBC CQRS Serverless:
- Use publishAsync for immediate response
- Include input validation in DTO
- Set appropriate command source
- Handle optimistic locking with version
- Follow the existing command pattern in this codebase
```

### Implement Sync Command

```text
Implement a synchronous command for [OPERATION] that waits for completion:
- Use publishSync method
- Return the fully processed result
- Include proper error handling
- Consider timeout implications
```

## Query Operations {#query-operations}

### List Query with Filters

```text
Implement a list query for [ENTITY] with:
- Pagination support (limit, cursor)
- Filter by [FIELD_NAMES]
- Sort options
- Use DataService.listItemsByPk with skExpression
- Return paginated response with items and cursor
```

### Detail Query

```text
Implement a detail query to get [ENTITY] by ID:
- Use DataService.getItem
- Handle VERSION_LATEST for latest version
- Include proper error handling for not found
- Serialize response for API output
```

## Event Handling {#event-handling}

### Create Custom Event Handler

```text
Create a custom event handler for [EVENT_TYPE] in MBC CQRS Serverless:
- Extend appropriate event class (DynamoDbEvent, SqsEvent, etc.)
- Implement IEventHandler interface
- Register handler in EventHandlerModule
- Include error handling and logging
- Follow the event handling patterns in the codebase
```

### DynamoDB Stream Handler

```text
Create a DynamoDB stream handler to [PURPOSE]:
- Process INSERT, MODIFY, REMOVE events
- Filter by table name if needed
- Extract old and new images
- Implement idempotent processing
- Handle errors appropriately
```

## Data Sync {#data-sync}

### Create Data Sync Handler

```text
Create a DataSyncHandler to sync [ENTITY] to [TARGET]:
- Implement IDataSyncHandler interface
- Handle up() for create/update operations
- Handle down() for delete operations
- Use transactions where appropriate
- Include error handling and rollback logic
```

## Multi-Tenancy {#multi-tenancy}

### Implement Tenant-Aware Feature

```text
Implement [FEATURE] with multi-tenancy support:
- Extract tenantCode from invocation context
- Use tenant-prefixed partition keys
- Apply tenant isolation in queries
- Include tenant validation
- Follow existing tenant patterns in the codebase
```

## Authentication & Authorization {#auth-prompts}

### Implement Group-Based Role Resolver (v1.3.1+)

```text
Implement a GroupRoleResolver for [APP_NAME]:
- Group-to-role mapping stored in [DynamoDB / RDS / hardcoded config]
- Map groups: [LIST_GROUPS] to roles: [LIST_ROLES]
- Use @GroupRoleResolver() decorator (NOT @Injectable() — AP027 anti-pattern)
- Implement IGroupRoleResolver interface with resolveRoles()
- Register as provider in AppModule
- See: https://mbc-cqrs-serverless.mbc-net.com/docs/authentication#group-based-roles
```

### Add AppSync Events API Notifications (v1.3.0+)

```text
Set up AppSync Events API real-time notifications for [FEATURE]:
- Add NOTIFICATION_TRANSPORTS=appsync-event to environment
- Configure APPSYNC_EVENTS_ENDPOINT and APPSYNC_EVENTS_NAMESPACE
- Add appsyncEvents CDK config to provision EventApi + ChannelNamespace
- Subscribe frontend client using AppSync Events API channel path format
- See: https://mbc-cqrs-serverless.mbc-net.com/docs/notification-module#appsync-events-service
```

## Testing {#testing}

### Unit Test for Command Handler

```text
Write unit tests for [COMMAND_HANDLER]:
- Mock CommandService and dependencies
- Test successful command execution
- Test validation errors
- Test version conflict handling
- Use Jest with AWS SDK mocks
```

### Integration Test

```text
Write integration tests for [FEATURE]:
- Set up test DynamoDB tables
- Test full command-query flow
- Verify data sync if applicable
- Clean up test data after each test
- Use LocalStack for local testing
```

## Debugging {#debugging}

### Diagnose Version Conflict

```text
I'm getting an "Invalid input: item not found or version mismatch" error when updating [ENTITY].
Please help me:
1. Understand why this error occurs in CQRS/Event Sourcing
2. Check if I'm using the correct version in my update
3. Suggest how to handle concurrent updates properly
4. Show me how to implement retry logic if needed
```

### Diagnose Data Sync Issues

```text
Data is not syncing to RDS for [ENTITY]. Please help me:
1. Check if DataSyncHandler is properly registered
2. Verify the sync handler implementation
3. Check for errors in the sync process
4. Suggest debugging steps and logging
```

### Diagnose Event Processing

```text
Events are not being processed for [EVENT_TYPE]. Please check:
1. Event handler registration in the module
2. Event class implementation
3. SQS/SNS configuration
4. Error handling and dead letter queue setup
```

## Architecture Review {#architecture-review}

### Review Module Implementation

```text
Review this [MODULE_NAME] module implementation for:
- Proper CQRS pattern adherence (command/query separation)
- Event sourcing best practices
- Multi-tenancy implementation
- Error handling completeness
- Performance considerations
- Security best practices
```

### Review for Production Readiness

```text
Review [FEATURE] for production readiness:
- Error handling and recovery
- Logging and monitoring
- Performance under load
- Security vulnerabilities
- Data consistency guarantees
- Rollback procedures
```

## Migration {#migration}

### Create Migration for Schema Change

```text
Create a migration for [SCHEMA_CHANGE]:
- Prisma migration (run npm run migrate:dev to create the migration file)
- Handle existing data transformation
- Include rollback procedure
- Test with sample data
- Document breaking changes if any
```

## Best Practices {#best-practices}

When using these prompts:

1. **Be Specific**: Replace placeholders with actual names and requirements
2. **Provide Context**: Include relevant code snippets or file paths
3. **Reference Existing Code**: Point to similar implementations in your codebase
4. **Specify Constraints**: Mention any performance, security, or compatibility requirements
5. **Request Explanations**: Ask AI to explain its implementation choices

## Related Documentation

- [AI Integration](/docs/ai-integration) - Overview of AI tool support
- [MCP Server](/docs/mcp-server) - MCP server for AI tools
- [Error Catalog](/docs/error-catalog) - Error reference with solutions
