---
sidebar_position: 2
---

# {{CQRS Pattern Flow}}

{{This document explains how the CQRS (Command Query Responsibility Segregation) pattern is implemented in MBC CQRS Serverless.}}

## {{CQRS Overview}}

```mermaid
flowchart TB
    Client[Client Application]

    subgraph Write
        CommandAPI[Command API]
        CommandHandler[Command Handler]
        CommandService[Command Service]
        EventStore[(Event Store)]
        EventPublisher[Event Publisher]
    end

    subgraph Read
        QueryAPI[Query API]
        QueryHandler[Query Handler]
        DataService[Data Service]
        ReadStore[(Read Store)]
    end

    subgraph Events
        EventHandler[Event Handler]
        Projector[Projector]
    end

    Client --> CommandAPI
    Client --> QueryAPI

    CommandAPI --> CommandHandler
    CommandHandler --> CommandService
    CommandService --> EventStore
    CommandService --> EventPublisher

    QueryAPI --> QueryHandler
    QueryHandler --> DataService
    DataService --> ReadStore

    EventPublisher --> EventHandler
    EventHandler --> Projector
    Projector --> ReadStore
```

## {{Command Flow - Write Path}}

{{The flow of write operations.}}

```mermaid
sequenceDiagram
    Client->>Gateway: POST request
    Gateway->>Controller: DTO
    Controller->>Handler: Command
    Handler->>Handler: Validate
    Handler->>Service: publish
    Service->>DynamoDB: PutItem
    DynamoDB-->>Service: OK
    Service->>SNS: Event
    SNS-->>Service: OK
    Service-->>Handler: Entity
    Handler-->>Controller: Result
    Controller-->>Gateway: 201
    Gateway-->>Client: Response
```

### {{Command Flow Steps}}

1. **{{Request Received}}**: {{Client sends POST/PUT/DELETE request}}
2. **{{DTO Validation}}**: {{Controller validates input using class-validator}}
3. **{{Command Dispatch}}**: {{Controller creates and dispatches command}}
4. **{{Business Logic}}**: {{Command handler executes business rules}}
5. **{{Persistence}}**: {{Command service persists to DynamoDB with optimistic locking}}
6. **{{Event Publishing}}**: {{Domain events are published to SNS}}
7. **{{Response}}**: {{Success response returned to client}}

## {{Query Flow - Read Path}}

{{The flow of read operations.}}

```mermaid
sequenceDiagram
    Client->>Gateway: GET request
    Gateway->>Controller: Request
    Controller->>Handler: Query
    Handler->>DataService: getItem
    DataService->>Database: Query
    Database-->>DataService: Item
    DataService-->>Handler: Entity
    Handler-->>Controller: Result
    Controller-->>Gateway: 200
    Gateway-->>Client: Response
```

### {{Query Flow Steps}}

1. **{{Request Received}}**: {{Client sends GET request}}
2. **{{Query Dispatch}}**: {{Controller creates and dispatches query}}
3. **{{Data Retrieval}}**: {{Query handler calls data service}}
4. **{{Database Query}}**: {{Data service queries DynamoDB or RDS}}
5. **{{Response}}**: {{Data returned to client}}

## {{Key Components}}

### {{Command Handler}}

```typescript
@CommandHandler(CreateResourceCommand)
export class CreateResourceHandler
  implements ICommandHandler<CreateResourceCommand> {

  constructor(private readonly commandService: CommandService) {}

  async execute(command: CreateResourceCommand): Promise<DataEntity> {
    // 1. Validate business rules
    // 2. Create entity
    // 3. Persist and publish event
    return this.commandService.publishAsync(entity, { invokeContext });
  }
}
```

### {{Query Handler}}

```typescript
@QueryHandler(GetResourceQuery)
export class GetResourceHandler
  implements IQueryHandler<GetResourceQuery> {

  constructor(private readonly dataService: DataService) {}

  async execute(query: GetResourceQuery): Promise<DataEntity> {
    return this.dataService.getItem({
      pk: query.pk,
      sk: query.sk,
    });
  }
}
```

## {{Benefits of CQRS}}

{{Adopting the CQRS pattern provides these benefits:}}

- **{{Scalability}}**: {{Read and write can be scaled independently}}
- **{{Optimization}}**: {{Optimize each side for its specific purpose}}
- **{{Flexibility}}**: {{Use different data models for reads and writes}}
- **{{Performance}}**: {{Denormalize read models for fast queries}}
- **{{Auditability}}**: {{Complete event history for audit trails}}
