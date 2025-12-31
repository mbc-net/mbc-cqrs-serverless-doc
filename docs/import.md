---
sidebar_position: 6
---

# {{Import}}

{{A flexible and extensible module for handling data import within the MBC CQRS Serverless framework.}}

## {{Installation}}

```bash
npm install @mbc-cqrs-serverless/import
```

## {{Overview}}

{{The Import module provides a unified approach to data ingestion from multiple sources, including REST APIs and CSV files. It implements a two-phase architecture for clean separation between data ingestion and business logic execution.}}

## {{Core Features}}

- **{{Unified Architectural Design}}**: {{Process data from REST API endpoints and CSV files through a single, consistent set of core business logic}}
- **{{Strategy Pattern}}**: {{Customize validation, transformation, and processing logic for each data entity via NestJS providers}}
- **{{Asynchronous Processing}}**: {{Event-driven processing through DynamoDB Streams, SNS, and SQS for maximum scalability}}
- **{{Biphasic Processing}}**: {{Clear separation between data ingestion/validation and business logic execution}}
- **{{Dual CSV Modes}}**: {{Choose between DIRECT processing for smaller files or STEP_FUNCTION workflow for large-scale imports}}

## {{Architecture}}

{{The module operates on a two-phase architecture:}}

### {{Phase 1: Import (Ingestion)}}

{{This phase handles getting data into the system using the `IImportStrategy` interface:}}

1. **`transform(input)`**: {{Transform raw input (JSON body or CSV row) into a standardized, validated DTO}}
2. **`validate(dto)`**: {{Validate the transformed DTO}}

{{The result is a record in a temporary DynamoDB table with CREATED status.}}

### {{Phase 2: Process (Business Logic)}}

{{Once a record is in the temporary table, an event triggers this phase using the `IProcessStrategy` interface:}}

1. **`compare(dto)`**: {{Compare data with the final destination to determine status (NOT_EXIST, CHANGED, EQUAL)}}
2. **`map(status, dto)`**: {{Construct the final payload for create or update command}}
3. **`getCommandService()`**: {{Provide the correct CommandService to execute the write operation}}

{{After processing, the temporary record is updated to COMPLETED or FAILED.}}

## {{Basic Setup}}

### {{Module Configuration}}

```typescript
import { ImportModule } from '@mbc-cqrs-serverless/import';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ImportModule.forRoot({
      tableName: 'import-staging',
      region: 'ap-northeast-1',
    }),
  ],
})
export class AppModule {}
```

## {{Implementing Import Strategy}}

{{Create a custom import strategy for your entity:}}

```typescript
import { IImportStrategy } from '@mbc-cqrs-serverless/import';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OrderImportStrategy implements IImportStrategy<OrderDto> {
  async transform(input: any): Promise<OrderDto> {
    return {
      orderId: input.order_id,
      customerId: input.customer_id,
      items: input.items || [],
      totalAmount: Number(input.total_amount),
    };
  }

  async validate(dto: OrderDto): Promise<void> {
    if (!dto.orderId) {
      throw new Error('Order ID is required');
    }
    if (!dto.customerId) {
      throw new Error('Customer ID is required');
    }
  }
}
```

## {{Implementing Process Strategy}}

{{Create a custom process strategy for your entity:}}

```typescript
import { IProcessStrategy, CompareStatus } from '@mbc-cqrs-serverless/import';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OrderProcessStrategy implements IProcessStrategy<OrderDto> {
  constructor(
    private readonly orderService: OrderService,
    private readonly commandService: CommandService,
  ) {}

  async compare(dto: OrderDto): Promise<CompareStatus> {
    const existing = await this.orderService.findById(dto.orderId);
    if (!existing) {
      return CompareStatus.NOT_EXIST;
    }
    if (this.hasChanges(existing, dto)) {
      return CompareStatus.CHANGED;
    }
    return CompareStatus.EQUAL;
  }

  async map(status: CompareStatus, dto: OrderDto): Promise<any> {
    if (status === CompareStatus.NOT_EXIST) {
      return { type: 'CREATE', data: dto };
    }
    return { type: 'UPDATE', data: dto };
  }

  getCommandService(): CommandService {
    return this.commandService;
  }

  private hasChanges(existing: Order, dto: OrderDto): boolean {
    return existing.totalAmount !== dto.totalAmount;
  }
}
```

## {{CSV Import}}

### {{Direct Mode}}

{{For smaller CSV files, use direct processing:}}

```typescript
import { CsvImportService } from '@mbc-cqrs-serverless/import';

@Injectable()
export class OrderCsvService {
  constructor(private readonly csvImportService: CsvImportService) {}

  async importFromCsv(file: Buffer): Promise<ImportResult> {
    return this.csvImportService.import(file, {
      mode: 'DIRECT',
      strategy: 'order',
    });
  }
}
```

### {{Step Function Mode}}

{{For large-scale imports, use Step Function workflow:}}

```typescript
async importLargeCsv(file: Buffer): Promise<ImportResult> {
  return this.csvImportService.import(file, {
    mode: 'STEP_FUNCTION',
    strategy: 'order',
    stepFunctionArn: process.env.IMPORT_STEP_FUNCTION_ARN,
  });
}
```

## {{REST API Import}}

{{Import data from REST API endpoints:}}

```typescript
import { ApiImportService } from '@mbc-cqrs-serverless/import';

@Injectable()
export class OrderApiService {
  constructor(private readonly apiImportService: ApiImportService) {}

  async importOrder(data: any): Promise<ImportResult> {
    return this.apiImportService.import(data, {
      strategy: 'order',
    });
  }
}
```

## {{Import Status}}

{{Track import progress and status:}}

| {{Status}} | {{Description}} |
|--------|-------------|
| `CREATED` | {{Record created in staging table}} |
| `PROCESSING` | {{Record is being processed}} |
| `COMPLETED` | {{Successfully processed}} |
| `FAILED` | {{Processing failed}} |
| `SKIPPED` | {{Skipped (no changes detected)}} |

## {{Error Handling}}

{{The module provides detailed error information for failed imports:}}

```typescript
const result = await this.importService.import(data);

if (result.status === 'FAILED') {
  console.error('Import failed:', result.error);
  console.error('Failed at row:', result.failedRow);
}
```

## {{Best Practices}}

1. **{{Validation First}}**: {{Implement thorough validation in the transform phase to catch errors early}}
2. **{{Idempotent Processing}}**: {{Design process strategies to handle duplicate imports gracefully}}
3. **{{Use Step Functions for Large Files}}**: {{For CSV files with thousands of rows, use STEP_FUNCTION mode}}
4. **{{Monitor Progress}}**: {{Use the status tracking to monitor long-running imports}}
5. **{{Error Recovery}}**: {{Implement retry logic for transient failures}}
