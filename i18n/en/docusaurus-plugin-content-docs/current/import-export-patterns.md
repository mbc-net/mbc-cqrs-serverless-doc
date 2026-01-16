---
sidebar_position: 16
description: Learn patterns for importing and exporting data in CSV and Excel formats with batch processing and validation.
---

# Import/Export Patterns

This guide covers patterns for handling data import and export operations, including CSV processing, Excel file handling, and batch data operations with Step Functions.

## When to Use This Guide

Use this guide when you need to:

- Import bulk data from CSV or Excel files
- Export data to various formats
- Process large datasets with Step Functions
- Implement file upload with S3 presigned URLs
- Transform data between external and internal formats

## Import Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────>│     S3      │────>│Step Function│────>│   Lambda    │
│  (Upload)   │     │  (Storage)  │     │(Orchestrate)│     │ (Process)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                    │
                                        ┌───────────────────────────┘
                                        ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  DynamoDB   │<────│   Import    │
                    │  (Command)  │     │   Handler   │
                    └─────────────┘     └─────────────┘
```

## File Upload Pattern

### Storage Service

Generate presigned URLs for secure file uploads:

```typescript
// storage/storage.service.ts
import { Injectable } from '@nestjs/common';
import { S3Service } from '@mbc-cqrs-serverless/core';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  constructor(private readonly s3Service: S3Service) {}

  /**
   * Generate upload URL for file import
   */
  async genUploadUrl(
    filename: string,
    contentType = 'text/csv',
  ): Promise<{ bucket: string; key: string; url: string }> {
    const bucket = this.s3Service.privateBucket;
    const timestamp = Date.now();
    const key = `imports/${timestamp}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ACL: 'private',
    });

    const url = await getSignedUrl(this.s3Service.client, command, {
      expiresIn: 3600, // 1 hour
    });

    return { bucket, key, url };
  }

  /**
   * Generate download URL for file export
   */
  async genDownloadUrl(
    key: string,
    filename?: string,
  ): Promise<{ url: string }> {
    const command = new GetObjectCommand({
      Bucket: this.s3Service.privateBucket,
      Key: key,
      ResponseContentDisposition: filename
        ? `attachment; filename="${filename}"`
        : undefined,
    });

    const url = await getSignedUrl(this.s3Service.client, command, {
      expiresIn: 3600,
    });

    return { url };
  }
}
```

### Storage Controller

```typescript
// storage/storage.controller.ts
import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { StorageService } from './storage.service';

@Controller('api/storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Get presigned URL for upload
   */
  @Post('upload-url')
  async getUploadUrl(
    @Body() dto: { filename: string; contentType?: string },
  ) {
    return this.storageService.genUploadUrl(dto.filename, dto.contentType);
  }

  /**
   * Get presigned URL for download
   */
  @Get('download-url')
  async getDownloadUrl(
    @Query('key') key: string,
    @Query('filename') filename?: string,
  ) {
    return this.storageService.genDownloadUrl(key, filename);
  }
}
```

## CSV Import Pattern

### CSV Import Controller

```typescript
// csv-import/csv-import.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StepFunctionService, INVOKE_CONTEXT, IInvoke } from '@mbc-cqrs-serverless/core';

export class CsvImportDto {
  bucket: string;
  key: string;
  type: string;  // Import type identifier
}

@Controller('api/csv-import')
export class CsvImportController {
  private readonly importArn: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly sfnService: StepFunctionService,
  ) {
    this.importArn = this.configService.get<string>('SFN_CSV_IMPORT_ARN');
  }

  /**
   * Start CSV import via Step Functions
   */
  @Post('/')
  async startImport(
    @INVOKE_CONTEXT() invokeContext: IInvoke,
    @Body() dto: CsvImportDto,
  ) {
    const executionName = `${dto.type}-${Date.now()}`;

    return this.sfnService.startExecution(
      this.importArn,
      {
        ...dto,
        invokeContext,
      },
      executionName,
    );
  }
}
```

### CSV Parser Service

```typescript
// csv-import/csv-parser.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { S3Service } from '@mbc-cqrs-serverless/core';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import * as csvParser from 'csv-parser';
import { Readable } from 'stream';

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
}

@Injectable()
export class CsvParserService {
  private readonly logger = new Logger(CsvParserService.name);

  constructor(private readonly s3Service: S3Service) {}

  /**
   * Parse CSV file from S3
   */
  async parseFromS3(
    bucket: string,
    key: string,
    options?: { encoding?: string; delimiter?: string },
  ): Promise<ParsedRow[]> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await this.s3Service.client.send(command);

    const stream = response.Body as Readable;
    const results: ParsedRow[] = [];
    let rowNumber = 0;

    return new Promise((resolve, reject) => {
      stream
        .pipe(csvParser({
          separator: options?.delimiter || ',',
          skipLines: 0,
        }))
        .on('data', (data) => {
          rowNumber++;
          results.push({
            rowNumber,
            data,
            errors: [],
          });
        })
        .on('end', () => {
          this.logger.log(`Parsed ${results.length} rows from ${key}`);
          resolve(results);
        })
        .on('error', (error) => {
          this.logger.error(`Failed to parse CSV: ${error.message}`);
          reject(error);
        });
    });
  }

  /**
   * Validate parsed rows
   */
  validateRows(
    rows: ParsedRow[],
    requiredFields: string[],
  ): ParsedRow[] {
    return rows.map(row => {
      const errors: string[] = [];

      for (const field of requiredFields) {
        if (!row.data[field] || row.data[field].trim() === '') {
          errors.push(`Missing required field: ${field}`);
        }
      }

      return { ...row, errors };
    });
  }
}
```

### Import Event Handler

```typescript
// csv-import/event/csv-import.event.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventHandler, IEventHandler, SNSService } from '@mbc-cqrs-serverless/core';
import { ConfigService } from '@nestjs/config';
import { CsvParserService } from '../csv-parser.service';
import { ProductService } from '../../product/product.service';

export class CsvImportEvent {
  bucket: string;
  key: string;
  type: string;
  invokeContext: any;
}

@EventHandler(CsvImportEvent)
@Injectable()
export class CsvImportEventHandler implements IEventHandler<CsvImportEvent> {
  private readonly logger = new Logger(CsvImportEventHandler.name);
  private readonly alarmTopicArn: string;

  constructor(
    private readonly csvParser: CsvParserService,
    private readonly productService: ProductService,
    private readonly snsService: SNSService,
    private readonly configService: ConfigService,
  ) {
    this.alarmTopicArn = this.configService.get<string>('SNS_ALARM_TOPIC_ARN');
  }

  /**
   * Process CSV import event
   */
  async execute(event: CsvImportEvent): Promise<any> {
    this.logger.log(`Processing import: ${event.key}`);

    try {
      // Parse CSV
      const rows = await this.csvParser.parseFromS3(event.bucket, event.key);

      // Validate
      const validatedRows = this.csvParser.validateRows(rows, [
        'code', 'name', 'price',
      ]);

      // Filter valid rows
      const validRows = validatedRows.filter(r => r.errors.length === 0);
      const invalidRows = validatedRows.filter(r => r.errors.length > 0);

      if (invalidRows.length > 0) {
        this.logger.warn(`${invalidRows.length} rows have validation errors`);
      }

      // Process in batches
      const batchSize = 30;
      let processedCount = 0;

      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);

        await Promise.all(
          batch.map(row => this.processRow(row.data, event.invokeContext)),
        );

        processedCount += batch.length;
        this.logger.log(`Processed ${processedCount}/${validRows.length} rows`);
      }

      return {
        success: true,
        totalRows: rows.length,
        processedRows: processedCount,
        errorRows: invalidRows.length,
      };
    } catch (error) {
      await this.sendAlarm(event, error);
      throw error;
    }
  }

  private async processRow(data: Record<string, string>, invokeContext: any) {
    await this.productService.publishCommand({
      code: data.code,
      name: data.name,
      attributes: {
        price: parseFloat(data.price),
        category: data.category,
        description: data.description,
      },
    }, invokeContext);
  }

  private async sendAlarm(event: CsvImportEvent, error: Error) {
    await this.snsService.publish({
      topicArn: this.alarmTopicArn,
      subject: 'CSV Import Error',
      message: JSON.stringify({
        key: event.key,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    });
  }
}
```

## Excel Import Pattern

### Excel Helper Functions

```typescript
// helpers/excel.ts
import { Workbook, Worksheet, Cell } from 'exceljs';

/**
 * Get cell value handling formulas and rich text
 */
export function getCellValue(row: any, column: string): string | undefined {
  const cell = row.getCell(column);

  if (!cell || cell.value === null || cell.value === undefined) {
    return undefined;
  }

  // Handle formula result
  if (typeof cell.value === 'object' && 'result' in cell.value) {
    return String(cell.value.result);
  }

  // Handle rich text
  if (typeof cell.value === 'object' && 'richText' in cell.value) {
    return cell.value.richText.map((r: any) => r.text).join('');
  }

  return String(cell.value);
}

/**
 * Get numeric cell value
 */
export function getCellNumber(row: any, column: string): number | undefined {
  const value = getCellValue(row, column);
  if (!value) return undefined;

  const num = parseFloat(value.replace(/,/g, ''));
  return isNaN(num) ? undefined : num;
}

/**
 * Get date cell value
 */
export function getCellDate(row: any, column: string): Date | undefined {
  const cell = row.getCell(column);

  if (cell.value instanceof Date) {
    return cell.value;
  }

  const value = getCellValue(row, column);
  if (!value) return undefined;

  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Find header row by matching column headers
 */
export function findHeaderRow(
  worksheet: Worksheet,
  expectedHeaders: string[],
  maxRows = 20,
): number {
  for (let rowNum = 1; rowNum <= maxRows; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const values = row.values as any[];

    const matches = expectedHeaders.filter(header =>
      values.some(v => v && String(v).includes(header)),
    );

    if (matches.length >= expectedHeaders.length * 0.8) {
      return rowNum;
    }
  }

  throw new Error('Header row not found');
}
```

### Excel Import Service

```typescript
// excel-import/excel-import.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { S3Service } from '@mbc-cqrs-serverless/core';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Workbook } from 'exceljs';
import { getCellValue, getCellNumber, findHeaderRow } from '../helpers/excel';

export interface ExcelImportResult {
  success: boolean;
  sheetName: string;
  totalRows: number;
  processedRows: number;
  errors: Array<{ row: number; message: string }>;
}

@Injectable()
export class ExcelImportService {
  private readonly logger = new Logger(ExcelImportService.name);

  constructor(private readonly s3Service: S3Service) {}

  /**
   * Load workbook from S3
   */
  async loadWorkbook(bucket: string, key: string): Promise<Workbook> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await this.s3Service.client.send(command);

    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const workbook = new Workbook();

    if (key.endsWith('.xlsx') || key.endsWith('.xlsm')) {
      await workbook.xlsx.load(buffer);
    } else if (key.endsWith('.xls')) {
      // For .xls files, use different parser
      throw new Error('XLS format not supported. Please use XLSX.');
    }

    return workbook;
  }

  /**
   * Process worksheet with row processor
   */
  async processWorksheet<T>(
    worksheet: any,
    config: {
      headerRow?: number;
      expectedHeaders?: string[];
      startRow?: number;
      processor: (row: any, rowNumber: number) => Promise<T | null>;
    },
  ): Promise<ExcelImportResult & { data: T[] }> {
    const errors: Array<{ row: number; message: string }> = [];
    const data: T[] = [];

    // Find or use specified header row
    const headerRow = config.headerRow || (
      config.expectedHeaders
        ? findHeaderRow(worksheet, config.expectedHeaders)
        : 1
    );

    const startRow = config.startRow || headerRow + 1;
    let processedRows = 0;
    let totalRows = 0;

    worksheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber < startRow) return;
      totalRows++;
    });

    for (let rowNum = startRow; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);

      // Skip empty rows
      if (this.isEmptyRow(row)) continue;

      try {
        const result = await config.processor(row, rowNum);
        if (result !== null) {
          data.push(result);
          processedRows++;
        }
      } catch (error) {
        errors.push({
          row: rowNum,
          message: error.message,
        });
      }
    }

    return {
      success: errors.length === 0,
      sheetName: worksheet.name,
      totalRows,
      processedRows,
      errors,
      data,
    };
  }

  private isEmptyRow(row: any): boolean {
    const values = row.values as any[];
    return !values || values.every(v => v === null || v === undefined || v === '');
  }
}
```

### Import Strategy Pattern

```typescript
// import/base-import.strategy.ts
import { IInvoke } from '@mbc-cqrs-serverless/core';

/**
 * Base interface for import strategies
 * @typeParam TInput - The input type, must be an object
 * @typeParam TAttributesDto - The output DTO type, must be an object
 */
export interface IImportStrategy<TInput extends object, TAttributesDto extends object> {
  /**
   * Transform raw input to command DTO
   */
  transform(input: TInput): Promise<TAttributesDto>;

  /**
   * Validate transformed DTO
   */
  validate(data: TAttributesDto): Promise<void>;
}

/**
 * Base import strategy with common functionality
 * @typeParam TInput - The input type, must be an object
 * @typeParam TAttributesDto - The output DTO type, must be an object
 */
export abstract class BaseImportStrategy<TInput extends object, TAttributesDto extends object>
  implements IImportStrategy<TInput, TAttributesDto>
{
  /**
   * Transform raw input to command DTO (default: return as-is)
   */
  async transform(input: TInput): Promise<TAttributesDto> {
    return input as unknown as TAttributesDto;
  }

  /**
   * Validate transformed DTO using class-validator
   */
  async validate(data: TAttributesDto): Promise<void> {
    // Uses class-validator for validation
    const errors = await validate(data as object);
    if (errors.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: this.flattenValidationErrors(errors),
        error: 'Bad Request',
      });
    }
  }

  /**
   * Flatten validation errors to a simple format
   */
  private flattenValidationErrors(
    errors: ValidationError[],
    parentPath = '',
  ): string[] {
    const messages: string[] = [];
    for (const error of errors) {
      const currentPath = parentPath
        ? `${parentPath}.${error.property}`
        : error.property;

      if (error.children && error.children.length > 0) {
        messages.push(
          ...this.flattenValidationErrors(error.children, currentPath),
        );
      } else if (error.constraints) {
        const firstConstraint = Object.values(error.constraints)[0];
        const message = firstConstraint.replace(error.property, currentPath);
        messages.push(message);
      }
    }
    return messages;
  }
}
```

### Concrete Import Strategy

```typescript
// product/import/product-import.strategy.ts
import { Injectable } from '@nestjs/common';
import { KEY_SEPARATOR, generateId } from '@mbc-cqrs-serverless/core';
import { BaseImportStrategy } from '@mbc-cqrs-serverless/import';
import { ulid } from 'ulid';
import { ProductCommandDto } from '../dto/product-command.dto';

const PRODUCT_PK_PREFIX = 'PRODUCT';

export interface ProductImportInput {
  code: string;
  name: string;
  category?: string;
  price?: string;
  description?: string;
  tenantCode: string; // Passed from import context
}

@Injectable()
export class ProductImportStrategy
  extends BaseImportStrategy<ProductImportInput, ProductCommandDto>
{
  /**
   * Transform import data to command DTO
   */
  async transform(input: ProductImportInput): Promise<ProductCommandDto> {
    const { tenantCode } = input;

    const pk = `${PRODUCT_PK_PREFIX}${KEY_SEPARATOR}${tenantCode}`;
    const sk = ulid();
    const id = generateId(pk, sk);

    return new ProductCommandDto({
      pk,
      sk,
      id,
      tenantCode,
      code: input.code?.trim(),
      name: input.name?.trim(),
      type: 'PRODUCT',
      attributes: {
        category: input.category?.trim(),
        price: input.price ? parseFloat(input.price.replace(/,/g, '')) : undefined,
        description: input.description?.trim(),
      },
    });
  }

  /**
   * Validate import input
   */
  async validate(input: ProductImportInput): Promise<void> {
    if (!input.code) {
      throw new Error('Product code is required');
    }
    if (!input.name) {
      throw new Error('Product name is required');
    }
    if (input.price && isNaN(parseFloat(input.price.replace(/,/g, '')))) {
      throw new Error('Invalid price format');
    }
  }
}
```

## Export Pattern

### Export Service

```typescript
// export/export.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { S3Service } from '@mbc-cqrs-serverless/core';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Workbook } from 'exceljs';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly s3Service: S3Service) {}

  /**
   * Export data to CSV and upload to S3
   */
  async exportToCsv(
    data: Record<string, any>[],
    headers: { key: string; label: string }[],
    filename: string,
  ): Promise<{ bucket: string; key: string }> {
    // Build CSV content
    const headerRow = headers.map(h => h.label).join(',');
    const dataRows = data.map(row =>
      headers.map(h => this.escapeCsvValue(row[h.key])).join(','),
    );
    const csvContent = [headerRow, ...dataRows].join('\n');

    // Upload to S3
    const bucket = this.s3Service.privateBucket;
    const key = `exports/${Date.now()}/${filename}`;

    await this.s3Service.client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: csvContent,
      ContentType: 'text/csv; charset=utf-8',
    }));

    this.logger.log(`Exported ${data.length} rows to ${key}`);
    return { bucket, key };
  }

  /**
   * Export data to Excel and upload to S3
   */
  async exportToExcel(
    data: Record<string, any>[],
    headers: { key: string; label: string; width?: number }[],
    filename: string,
    sheetName = 'Data',
  ): Promise<{ bucket: string; key: string }> {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Set columns
    worksheet.columns = headers.map(h => ({
      header: h.label,
      key: h.key,
      width: h.width || 15,
    }));

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    data.forEach(row => {
      const rowData: Record<string, any> = {};
      headers.forEach(h => {
        rowData[h.key] = row[h.key];
      });
      worksheet.addRow(rowData);
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload to S3
    const bucket = this.s3Service.privateBucket;
    const key = `exports/${Date.now()}/${filename}`;

    await this.s3Service.client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer as Buffer,
      ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }));

    this.logger.log(`Exported ${data.length} rows to ${key}`);
    return { bucket, key };
  }

  private escapeCsvValue(value: any): string {
    if (value === null || value === undefined) return '';

    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}
```

## Step Function Integration

### Import Orchestration

```typescript
// Import workflow with Step Functions

// serverless.yml
/*
stepFunctions:
  stateMachines:
    csvImport:
      name: ${self:custom.prefix}-csv-import
      definition:
        StartAt: ParseFile
        States:
          ParseFile:
            Type: Task
            Resource: !GetAtt ParseFileLambda.Arn
            Next: ProcessBatches
            Catch:
              - ErrorEquals: ["States.ALL"]
                Next: HandleError

          ProcessBatches:
            Type: Map
            ItemsPath: $.batches
            MaxConcurrency: 5
            Iterator:
              StartAt: ProcessBatch
              States:
                ProcessBatch:
                  Type: Task
                  Resource: !GetAtt ProcessBatchLambda.Arn
                  End: true
            Next: Finalize

          Finalize:
            Type: Task
            Resource: !GetAtt FinalizeLambda.Arn
            End: true

          HandleError:
            Type: Task
            Resource: !GetAtt HandleErrorLambda.Arn
            End: true
*/
```

## Best Practices

### 1. Batch Processing

Always process large files in batches:

```typescript
const BATCH_SIZE = 30;

async processBatches<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(processor));
  }
}
```

### 2. Error Handling

Collect and report errors without stopping processing:

```typescript
const errors: Array<{ row: number; error: string }> = [];

for (const [index, row] of rows.entries()) {
  try {
    await processRow(row);
  } catch (error) {
    errors.push({ row: index + 1, error: error.message });
    // Continue processing
  }
}

if (errors.length > 0) {
  await this.reportErrors(errors);
}
```

### 3. Validation Before Processing

Validate all data before starting import:

```typescript
// First pass: validate
const validationErrors = await this.validateAll(rows);
if (validationErrors.length > 0) {
  return { success: false, errors: validationErrors };
}

// Second pass: process
await this.processAll(rows);
```

### 4. Progress Reporting

Report progress for long-running imports:

```typescript
const total = rows.length;
let processed = 0;

for (const batch of batches) {
  await processBatch(batch);
  processed += batch.length;

  // Report progress every 100 rows
  if (processed % 100 === 0) {
    this.logger.log(`Progress: ${processed}/${total} (${Math.round(processed/total*100)}%)`);
  }
}
```

## ImportModule API Reference

The `@mbc-cqrs-serverless/import` package provides a comprehensive framework for managing data import tasks.

### Installation

```bash
npm install @mbc-cqrs-serverless/import
```

### ProcessingMode Enum {#processingmode-enum}

The `ProcessingMode` enum defines how import jobs are executed:

```typescript
export enum ProcessingMode {
  DIRECT = 'DIRECT',           // Direct processing without Step Functions
  STEP_FUNCTION = 'STEP_FUNCTION', // Processing orchestrated by Step Functions
}
```

| Mode | Description | Use Case |
|----------|-----------------|--------------|
| `DIRECT` | Import is processed directly without Step Functions orchestration | Small imports, simple data |
| `STEP_FUNCTION` | Import is orchestrated by Step Functions for reliability | Large imports, complex workflows, ZIP imports |

### CreateCsvImportDto {#createcsvimportdto}

The `CreateCsvImportDto` is used to start a CSV import job:

```typescript
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ProcessingMode } from '@mbc-cqrs-serverless/import'

export class CreateCsvImportDto {
  @IsString()
  @IsOptional()
  sourceId?: string           // Optional source identifier

  @IsNotEmpty()
  @IsEnum(ProcessingMode)
  processingMode: ProcessingMode // How the import should be processed

  @IsString()
  @IsNotEmpty()
  bucket: string              // S3 bucket containing the CSV file

  @IsString()
  @IsNotEmpty()
  key: string                 // S3 key (path) to the CSV file

  @IsString()
  @IsNotEmpty()
  tableName: string           // Target table name for import profile matching

  @IsString()
  @IsNotEmpty()
  tenantCode: string          // Tenant code for multi-tenancy
}
```

| Property | Type | Required | Description |
|--------------|----------|--------------|-----------------|
| `sourceId` | `string` | No | Optional identifier for the import source |
| `processingMode` | `ProcessingMode` | Yes | DIRECT or STEP_FUNCTION mode |
| `bucket` | `string` | Yes | S3 bucket containing the CSV file |
| `key` | `string` | Yes | S3 key (path) to the CSV file |
| `tableName` | `string` | Yes | Target table name, used to match import profile |
| `tenantCode` | `string` | Yes | Tenant code for multi-tenancy |

### CreateZipImportDto {#createzipimportdto}

The `CreateZipImportDto` is used to start a ZIP import job that contains multiple CSV files:

```typescript
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateZipImportDto {
  @IsString()
  @IsNotEmpty()
  bucket: string              // S3 bucket containing the ZIP file

  @IsString()
  @IsNotEmpty()
  key: string                 // S3 key (path) to the ZIP file

  @IsString()
  @IsNotEmpty()
  tenantCode: string          // Tenant code for multi-tenancy

  // High priority: sortedFileKeys
  // If not provided, it will use the default sorting logic
  @IsArray()
  @IsOptional()
  sortedFileKeys?: string[]   // Optional ordered list of file keys to process

  // High priority: tableName
  // If not provided, it will be extracted from the filename
  @IsString()
  @IsOptional()
  tableName?: string = null   // Optional table name override
}
```

| Property | Type | Required | Description |
|--------------|----------|--------------|-----------------|
| `bucket` | `string` | Yes | S3 bucket containing the ZIP file |
| `key` | `string` | Yes | S3 key (path) to the ZIP file |
| `tenantCode` | `string` | Yes | Tenant code for multi-tenancy |
| `sortedFileKeys` | `string[]` | No | Ordered list of file keys to process. If not provided, default sorting is used |
| `tableName` | `string` | No | Table name override. If not provided, extracted from filename (format: yyyymmddhhMMss-\{tableName\}.csv) |

### Core Concepts

The module operates on a two-phase architecture:

1. **Import Phase** (`IImportStrategy`): Transform raw data (from JSON or CSV) into a standardized DTO and validate it.
2. **Process Phase** (`IProcessStrategy`): Compare validated DTO with existing data and map it to a command payload for creation or update.

### Implementing Import Strategy

The import strategy handles initial transformation and validation:

```typescript
import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { BaseImportStrategy, IImportStrategy } from '@mbc-cqrs-serverless/import';
import { PolicyCommandDto } from '../dto/policy-command.dto';

@Injectable()
export class PolicyImportStrategy
  extends BaseImportStrategy<Record<string, any>, PolicyCommandDto>
  implements IImportStrategy<Record<string, any>, PolicyCommandDto>
{
  async transform(input: Record<string, any>): Promise<PolicyCommandDto> {
    const attrSource = input.attributes && typeof input.attributes === 'object'
      ? input.attributes
      : input;

    const mappedObject = {
      pk: input.pk,
      sk: input.sk,
      attributes: {
        policyType: attrSource.policyType,
        applyDate: new Date(attrSource.applyDate).toISOString(),
      },
    };

    return plainToInstance(PolicyCommandDto, mappedObject);
  }
}
```

### ComparisonStatus Enum {#comparisonstatus-enum}

The `ComparisonStatus` enum defines the result of comparing imported data with existing data:

```typescript
export enum ComparisonStatus {
  EQUAL = 'EQUAL',         // Data exists and is identical - no action needed
  NOT_EXIST = 'NOT_EXIST', // Data does not exist - create new record
  CHANGED = 'CHANGED',     // Data exists but differs - update existing record
}
```

| Value | Description | Action |
|-----------|-----------------|------------|
| `EQUAL` | Imported data matches existing data | Skip (no operation) |
| `NOT_EXIST` | No existing data found | Create new record |
| `CHANGED` | Existing data differs from imported data | Update existing record |

### ComparisonResult Interface {#comparisonresult-interface}

The `ComparisonResult<TEntity>` interface wraps the comparison status with optional existing data. The generic type `TEntity` must extend `DataModel`:

```typescript
import { DataModel } from '@mbc-cqrs-serverless/core'

export interface ComparisonResult<TEntity extends DataModel> {
  status: ComparisonStatus;  // The result of the comparison
  /**
   * If the status is 'CHANGED', this property holds the existing entity data
   * retrieved from the database. It is undefined otherwise.
   */
  existingData?: TEntity;
}
```

| Property | Type | Description |
|--------------|----------|-----------------|
| `status` | `ComparisonStatus` | The comparison result status |
| `existingData` | `TEntity \| undefined` | The existing entity data, present when status is CHANGED |

### IProcessStrategy Interface {#iprocessstrategy-interface}

The `IProcessStrategy` interface defines the contract for processing validated import data. Note that the generic type `TEntity` must extend `DataModel`:

```typescript
import {
  CommandInputModel,
  CommandPartialInputModel,
  CommandService,
  DataModel,
} from '@mbc-cqrs-serverless/core';

export interface IProcessStrategy<TEntity extends DataModel, TAttributesDto extends object> {
  /**
   * Compare the validated DTO with existing data
   */
  compare(
    importAttributes: TAttributesDto,
    tenantCode: string,
  ): Promise<ComparisonResult<TEntity>>;

  /**
   * Map the DTO to a command payload based on comparison status
   * Note: status excludes EQUAL since no mapping is needed for identical data
   * @returns CommandInputModel for create, CommandPartialInputModel for update
   */
  map(
    status: Exclude<ComparisonStatus, ComparisonStatus.EQUAL>,
    importAttributes: TAttributesDto,
    tenantCode: string,
    existingData?: TEntity,
  ): Promise<CommandInputModel | CommandPartialInputModel>;

  /**
   * Get the command service for publishing commands
   */
  getCommandService(): CommandService;
}
```

### BaseProcessStrategy Abstract Class {#baseprocessstrategy-class}

The `BaseProcessStrategy` abstract class provides a base implementation that subclasses must extend. The generic type `TEntity` must extend `DataModel`:

```typescript
import { DataModel } from '@mbc-cqrs-serverless/core';

export abstract class BaseProcessStrategy<TEntity extends DataModel, TTransformedDto extends object>
  implements IProcessStrategy<TEntity, TTransformedDto>
{
  /**
   * Abstract method - must be implemented to compare data
   */
  abstract compare(
    transformedData: TTransformedDto,
    tenantCode: string,
  ): Promise<ComparisonResult<TEntity>>;

  /**
   * Abstract method - must be implemented to map data to command payload
   * Note: status excludes EQUAL since no mapping is needed for identical data
   */
  abstract map(
    status: Exclude<ComparisonStatus, ComparisonStatus.EQUAL>,
    transformedData: TTransformedDto,
    tenantCode: string,
    existingData?: TEntity,
  ): Promise<CommandInputModel | CommandPartialInputModel>;

  /**
   * Abstract method - must be implemented to return the command service
   */
  abstract getCommandService(): CommandService;
}
```

:::info Note
All three methods (`compare()`, `map()`, `getCommandService()`) in `BaseProcessStrategy` are abstract and must be implemented by subclasses.
:::

### Implementing Process Strategy

The process strategy contains core business logic for comparing and mapping data:

```typescript
import { Injectable } from '@nestjs/common';
import {
  CommandInputModel,
  CommandPartialInputModel,
  CommandService,
  DataService,
} from '@mbc-cqrs-serverless/core';
import {
  BaseProcessStrategy,
  ComparisonResult,
  ComparisonStatus,
  IProcessStrategy,
} from '@mbc-cqrs-serverless/import';
import { PolicyCommandDto } from '../dto/policy-command.dto';
import { PolicyDataEntity } from '../entity/policy-data.entity';

@Injectable()
export class PolicyProcessStrategy
  extends BaseProcessStrategy<PolicyDataEntity, PolicyCommandDto>
  implements IProcessStrategy<PolicyDataEntity, PolicyCommandDto>
{
  constructor(
    private readonly commandService: CommandService,
    private readonly dataService: DataService,
  ) {
    super();
  }

  getCommandService(): CommandService {
    return this.commandService;
  }

  async compare(
    dto: PolicyCommandDto,
    tenantCode: string,
  ): Promise<ComparisonResult<PolicyDataEntity>> {
    const existing = await this.dataService.getItem({ pk: dto.pk, sk: dto.sk });
    if (!existing) return { status: ComparisonStatus.NOT_EXIST };
    return { status: ComparisonStatus.EQUAL, existingData: existing as PolicyDataEntity };
  }

  async map(
    status: Exclude<ComparisonStatus, ComparisonStatus.EQUAL>,
    dto: PolicyCommandDto,
    tenantCode: string,
    existingData?: PolicyDataEntity,
  ): Promise<CommandInputModel | CommandPartialInputModel> {
    if (status === ComparisonStatus.NOT_EXIST) {
      // Return CommandInputModel for creating new records
      return { ...dto, version: 0 } as CommandInputModel;
    }
    // status === ComparisonStatus.CHANGED
    // Return CommandPartialInputModel for updating existing records
    return {
      pk: dto.pk,
      sk: dto.sk,
      attributes: dto.attributes,
      version: existingData.version,
    } as CommandPartialInputModel;
  }
}
```

### Module Configuration

Register the ImportModule with your profiles:

```typescript
import { Module } from '@nestjs/common';
import { ImportModule } from '@mbc-cqrs-serverless/import';
import { PolicyModule } from './policy/policy.module';
import { PolicyImportStrategy } from './policy/strategies/policy.import-strategy';
import { PolicyProcessStrategy } from './policy/strategies/policy.process-strategy';

@Module({
  imports: [
    PolicyModule,
    ImportModule.register({
      enableController: true,
      imports: [PolicyModule],
      profiles: [
        {
          tableName: 'policy',
          importStrategy: PolicyImportStrategy,
          processStrategy: PolicyProcessStrategy,
        },
      ],
    }),
  ],
})
export class AppModule {}
```

### Custom Event Factory for Imports

Configure the event factory to handle import events:

```typescript
import {
  EventFactory,
  IEvent,
  StepFunctionsEvent,
} from '@mbc-cqrs-serverless/core';
import {
  CsvImportSfnEvent,
  DEFAULT_IMPORT_ACTION_QUEUE,
  ImportEvent,
  ImportQueueEvent,
} from '@mbc-cqrs-serverless/import';
import { DynamoDBStreamEvent, SQSEvent } from 'aws-lambda';

@EventFactory()
export class CustomEventFactory extends EventFactoryAddedTask {
  async transformDynamodbStream(event: DynamoDBStreamEvent): Promise<IEvent[]> {
    const curEvents = await super.transformDynamodbStream(event);

    const importEvents = event.Records.map((record) => {
      if (
        record.eventSourceARN.endsWith('import_tmp') ||
        record.eventSourceARN.includes('import_tmp/stream/')
      ) {
        if (record.eventName === 'INSERT') {
          return new ImportEvent().fromDynamoDBRecord(record);
        }
      }
      return undefined;
    }).filter((event) => !!event);

    return [...curEvents, ...importEvents];
  }

  async transformSqs(event: SQSEvent): Promise<IEvent[]> {
    const curEvents = await super.transformSqs(event);

    const importEvents = event.Records.map((record) => {
      if (record.eventSourceARN.endsWith(DEFAULT_IMPORT_ACTION_QUEUE)) {
        return new ImportQueueEvent().fromSqsRecord(record);
      }
      return undefined;
    }).filter((event) => !!event);

    return [...importEvents, ...curEvents];
  }

  async transformStepFunction(event: StepFunctionsEvent<any>): Promise<IEvent[]> {
    if (event.context.StateMachine.Name.includes('import-csv')) {
      return [new CsvImportSfnEvent(event)];
    }
    return super.transformStepFunction(event);
  }
}
```

### ImportStatusHandler API {#importstatushandler-api}

The `ImportStatusHandler` is an internal event handler that manages Step Functions callbacks for import jobs. When using Step Functions orchestration (ZIP imports or STEP_FUNCTION mode CSV imports), this handler ensures proper communication with the state machine.

#### Behavior

| Import Status | Action | Step Functions Command |
|-------------------|------------|---------------------------|
| `COMPLETED` | Send success callback | `SendTaskSuccessCommand` |
| `FAILED` | Send failure callback | `SendTaskFailureCommand` |
| Other statuses | Ignored | None |

#### Methods

| Method | Description |
|------------|-----------------|
| `sendTaskSuccess(taskToken, output)` | Sends success signal to Step Functions with the import result |
| `sendTaskFailure(taskToken, error, cause)` | Sends failure signal to Step Functions with error details |

#### Step Functions Integration

When an import job is created as part of a Step Functions workflow (e.g., ZIP import), a `taskToken` is stored in the job's attributes. The `ImportStatusHandler` listens for status change notifications and:

1. Retrieves the import job from DynamoDB
2. Checks if a `taskToken` exists in the job's attributes
3. Sends the appropriate callback based on the final status:
   - `COMPLETED` → `SendTaskSuccessCommand` with result data
   - `FAILED` → `SendTaskFailureCommand` with error details

This ensures Step Functions workflows properly handle both success and failure cases without hanging indefinitely.

:::info Version Note
The `sendTaskFailure()` method was added in [version 1.0.18](./changelog#v1018) to fix an issue where Step Functions would wait indefinitely when import jobs failed. See also [Import Module Errors](./error-catalog#import-module-errors) for troubleshooting.
:::

### ImportQueueEventHandler Error Handling {#import-error-handling}

The `ImportQueueEventHandler` processes individual import records from the SQS queue. When an error occurs during processing (e.g., `ConditionalCheckFailedException`), the handler properly updates the parent job status.

#### Error Flow (v1.0.19+)

```
Child Job Error Occurs
         │
         ▼
Mark Child Job as FAILED
         │
         ▼
Update Parent Job Counters
  (incrementParentJobCounters)
         │
         ▼
Check if All Children Complete
         │
    ┌────┴────┐
    │ Yes     │ No
    ▼         ▼
Update Master  {{Wait for
  Job Status}}     more children
         │
    ┌────┴────┐
    │ Has     │ All
    │ Failures│ Succeeded
    ▼         ▼
FAILED    COMPLETED
         │
         ▼
ImportStatusHandler Triggered
         │
         ▼
SendTaskFailure/SendTaskSuccess
```

#### Key Methods

| Method | Description |
|------------|-----------------|
| `handleImport(event)` | Orchestrates single import record processing with error handling |
| `executeStrategy(...)` | Executes compare, map, and save lifecycle for a strategy |

#### Error Handling Behavior

When a child import job fails:

1. Child job status is set to `FAILED` with error details
2. Parent job counters are atomically updated (`failedRows` incremented)
3. When all children complete, master job status is set based on results:
   - If `failedRows > 0` → Master status = `FAILED`
   - If all succeeded → Master status = `COMPLETED`
4. Lambda does NOT crash - error is handled gracefully

:::warning Common Errors
`ConditionalCheckFailedException`: This occurs when attempting to import data that already exists with conflicting version. The import job will be marked as FAILED and the parent job will properly aggregate this failure.
:::

:::info Version Note
Prior to v1.0.19, errors in child jobs would crash the Lambda and leave the master job in `PROCESSING` status indefinitely. The fixes in [version 1.0.19](./changelog#v1019) ensure proper error propagation and status updates.
:::

### CsvImportSfnEventHandler {#csvimportsfneventhandler}

The `CsvImportSfnEventHandler` handles Step Functions CSV import workflow states. It manages the `csv_loader` and `finalize_parent_job` states in the import state machine.

#### Key Methods

| Method | Description |
|------------|-----------------|
| `handleStepState(event)` | Routes events to appropriate handlers based on state name (`csv_loader` or `finalize_parent_job`) |
| `loadCsv(input)` | Processes the csv_loader state, creates child jobs for CSV rows |
| `finalizeParentJob(event)` | Finalizes the parent job after all children complete, sets final status |

#### Status Determination (v1.0.20+)

When finalizing the parent job, the handler correctly determines the final status:

```typescript
// Correct behavior (v1.0.20+)
const status = failedRows > 0
  ? ImportJobStatus.FAILED    // Any child failed → FAILED
  : ImportJobStatus.COMPLETED // All children succeeded → COMPLETED
```

:::warning Known Issue (Fixed in v1.0.20)
Prior to v1.0.20, a bug in the ternary operator caused the status to always be `COMPLETED`:

```typescript
// Bug (pre-v1.0.20): always returned COMPLETED
const status = failedRows > 0
  ? ImportJobStatus.COMPLETED  // Wrong!
  : ImportJobStatus.COMPLETED
```

This caused Step Functions to report SUCCESS even when child import jobs failed. See [version 1.0.20](./changelog#v1020) for details.
:::

### ZipImportSfnEventHandler {#zipimportsfneventhandler}

The `ZipImportSfnEventHandler` handles Step Functions ZIP import workflow states. It orchestrates the processing of multiple CSV files extracted from a ZIP archive.

#### Workflow States

| State | Description |
|-----------|-----------------|
| `trigger_single_csv_and_wait` | Triggers a single CSV import job for each file in the ZIP |
| `finalize_zip_job` | Aggregates results from all CSV imports and finalizes the master job |

#### Key Methods

| Method | Description |
|------------|-----------------|
| `triggerSingleCsvJob(event)` | Creates a CSV import job with STEP_FUNCTION mode, passing the taskToken for callback |
| `finalizeZipMasterJob(event)` | Aggregates results from all processed CSV files and updates the ZIP master job status |

:::warning Known Issue
The `finalizeZipMasterJob` method currently always sets the master job status to `COMPLETED`, regardless of whether any child CSV import jobs failed. This means ZIP import workflows will report success even when individual CSV files failed to import correctly.

To work around this, check the `failedRows` count in the result object to determine if any errors occurred during processing.
:::

#### File Naming Convention

When processing CSV files from a ZIP archive, the handler extracts the table name from the filename:

```
Format: yyyymmddhhMMss-\{tableName\}.csv
Example: 20240115120000-products.csv → extracts tableName = "products"
```

If `tableName` is provided in the `CreateZipImportDto`, it overrides the extracted name.

#### Processing Flow

```
ZIP File Uploaded to S3
         │
         ▼
Step Functions Triggered
         │
         ▼
Unzip and List CSV Files
         │
         ▼
Map State: For Each CSV File
    ┌────┴────┐
    │         │
    ▼         ▼
trigger_single_csv_and_wait
    │         │
    ▼         ▼
CSV Import Job Created    CSV Import Job Created
(with taskToken)          (with taskToken)
    │         │
    ▼         ▼
Wait for Completion       Wait for Completion
    │         │
    └────┬────┘
         │
         ▼
finalize_zip_job
         │
         ▼
Aggregate Results & Update Master Job
```

#### ZipImportSfnEvent Structure

```typescript
export class ZipImportSfnEvent implements IEvent {
  source: string           // Execution ID from Step Functions
  context: StepFunctionsContext // Step Functions context with state info
  input: string | any[]    // S3 key or array of results
  taskToken: string        // Token for callback to Step Functions
}
```

The `context.Execution.Input` contains:
- `masterJobKey`: Primary key of the ZIP master job in DynamoDB
- `parameters`: Original import parameters (bucket, tenantCode, tableName)

---

## Related Documentation

- [Backend Development Guide](./backend-development) - Core backend patterns
- [Service Patterns](./service-patterns) - Service implementation
- [Step Functions](./architecture/step-functions) - Workflow orchestration
- [Data Sync Handler Examples](./data-sync-handler-examples) - Sync handler patterns
