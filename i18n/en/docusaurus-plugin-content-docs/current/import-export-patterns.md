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
   * ファイルインポート用のアップロードURLを生成
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
      expiresIn: 3600, // 1 hour / 1時間
    });

    return { bucket, key, url };
  }

  /**
   * Generate download URL for file export
   * ファイルエクスポート用のダウンロードURLを生成
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
   * アップロード用の署名付きURLを取得
   */
  @Post('upload-url')
  async getUploadUrl(
    @Body() dto: { filename: string; contentType?: string },
  ) {
    return this.storageService.genUploadUrl(dto.filename, dto.contentType);
  }

  /**
   * Get presigned URL for download
   * ダウンロード用の署名付きURLを取得
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
  type: string;  // Import type identifier / インポートタイプ識別子
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
   * Step Functionsを経由してCSVインポートを開始
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
   * S3からCSVファイルを解析
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
   * 解析された行をバリデート
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
   * CSVインポートイベントを処理
   */
  async execute(event: CsvImportEvent): Promise<any> {
    this.logger.log(`Processing import: ${event.key}`);

    try {
      // Parse CSV / CSVを解析
      const rows = await this.csvParser.parseFromS3(event.bucket, event.key);

      // Validate / バリデート
      const validatedRows = this.csvParser.validateRows(rows, [
        'code', 'name', 'price',
      ]);

      // Filter valid rows / 有効な行をフィルタ
      const validRows = validatedRows.filter(r => r.errors.length === 0);
      const invalidRows = validatedRows.filter(r => r.errors.length > 0);

      if (invalidRows.length > 0) {
        this.logger.warn(`${invalidRows.length} rows have validation errors`);
      }

      // Process in batches / バッチで処理
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
 * 数式やリッチテキストを処理してセル値を取得
 */
export function getCellValue(row: any, column: string): string | undefined {
  const cell = row.getCell(column);

  if (!cell || cell.value === null || cell.value === undefined) {
    return undefined;
  }

  // Handle formula result / 数式の結果を処理
  if (typeof cell.value === 'object' && 'result' in cell.value) {
    return String(cell.value.result);
  }

  // Handle rich text / リッチテキストを処理
  if (typeof cell.value === 'object' && 'richText' in cell.value) {
    return cell.value.richText.map((r: any) => r.text).join('');
  }

  return String(cell.value);
}

/**
 * Get numeric cell value
 * 数値のセル値を取得
 */
export function getCellNumber(row: any, column: string): number | undefined {
  const value = getCellValue(row, column);
  if (!value) return undefined;

  const num = parseFloat(value.replace(/,/g, ''));
  return isNaN(num) ? undefined : num;
}

/**
 * Get date cell value
 * 日付のセル値を取得
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
 * 列ヘッダーをマッチングしてヘッダー行を検索
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
   * S3からワークブックを読み込む
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
      // For .xls files, use different parser / .xlsファイルには別のパーサーを使用
      throw new Error('XLS format not supported. Please use XLSX.');
    }

    return workbook;
  }

  /**
   * Process worksheet with row processor
   * 行プロセッサでワークシートを処理
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

    // Find or use specified header row / ヘッダー行を検索または指定されたものを使用
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

      // Skip empty rows / 空行をスキップ
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
 * インポート戦略の基本インターフェース
 */
export interface IImportStrategy<TInput, TOutput> {
  /**
   * Transform raw input to command DTO
   * 生の入力をコマンドDTOに変換
   */
  transform(input: TInput): Promise<TOutput>;

  /**
   * Validate input data
   * 入力データをバリデート
   */
  validate(input: TInput): Promise<void>;
}

/**
 * Base import strategy with common functionality
 * 共通機能を持つ基本インポート戦略
 */
export abstract class BaseImportStrategy<TInput, TOutput>
  implements IImportStrategy<TInput, TOutput>
{
  /**
   * Transform raw input to command DTO (default: return as-is)
   * 生の入力をコマンドDTOに変換（デフォルト：そのまま返す）
   */
  async transform(input: TInput): Promise<TOutput> {
    return input as unknown as TOutput;
  }

  /**
   * Validate input data using class-validator
   * class-validatorを使用して入力データをバリデート
   */
  async validate(input: TInput): Promise<void> {
    // Uses class-validator for validation
    // class-validatorでバリデーションを実行
    const errors = await validate(input as object);
    if (errors.length > 0) {
      throw new InvalidDataException(this.flattenValidationErrors(errors));
    }
  }

  /**
   * Flatten validation errors to a simple format
   * バリデーションエラーをシンプルな形式にフラット化
   */
  protected flattenValidationErrors(errors: ValidationError[]): string[] {
    const messages: string[] = [];
    for (const error of errors) {
      if (error.constraints) {
        messages.push(...Object.values(error.constraints));
      }
      if (error.children?.length) {
        messages.push(...this.flattenValidationErrors(error.children));
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
   * インポートデータをコマンドDTOに変換
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
   * インポート入力をバリデート
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
   * データをCSVにエクスポートしてS3にアップロード
   */
  async exportToCsv(
    data: Record<string, any>[],
    headers: { key: string; label: string }[],
    filename: string,
  ): Promise<{ bucket: string; key: string }> {
    // Build CSV content / CSVコンテンツを構築
    const headerRow = headers.map(h => h.label).join(',');
    const dataRows = data.map(row =>
      headers.map(h => this.escapeCsvValue(row[h.key])).join(','),
    );
    const csvContent = [headerRow, ...dataRows].join('\n');

    // Upload to S3 / S3にアップロード
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
   * データをExcelにエクスポートしてS3にアップロード
   */
  async exportToExcel(
    data: Record<string, any>[],
    headers: { key: string; label: string; width?: number }[],
    filename: string,
    sheetName = 'Data',
  ): Promise<{ bucket: string; key: string }> {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Set columns / 列を設定
    worksheet.columns = headers.map(h => ({
      header: h.label,
      key: h.key,
      width: h.width || 15,
    }));

    // Style header row / ヘッダー行にスタイルを適用
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows / データ行を追加
    data.forEach(row => {
      const rowData: Record<string, any> = {};
      headers.forEach(h => {
        rowData[h.key] = row[h.key];
      });
      worksheet.addRow(rowData);
    });

    // Generate buffer / バッファを生成
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload to S3 / S3にアップロード
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
// Step Functionsによるインポートワークフロー

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
    // Continue processing / 処理を継続
  }
}

if (errors.length > 0) {
  await this.reportErrors(errors);
}
```

### 3. Validation Before Processing

Validate all data before starting import:

```typescript
// First pass: validate / 最初のパス：バリデート
const validationErrors = await this.validateAll(rows);
if (validationErrors.length > 0) {
  return { success: false, errors: validationErrors };
}

// Second pass: process / 2番目のパス：処理
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

  // Report progress every 100 rows / 100行ごとに進捗を報告
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

### Implementing Process Strategy

The process strategy contains core business logic for comparing and mapping data:

```typescript
import { Injectable } from '@nestjs/common';
import { CommandService, DataService } from '@mbc-cqrs-serverless/core';
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
    status: ComparisonStatus,
    dto: PolicyCommandDto,
    tenantCode: string,
    existingData?: PolicyDataEntity,
  ) {
    if (status === ComparisonStatus.NOT_EXIST) {
      return { ...dto, version: 0 };
    }
    if (status === ComparisonStatus.CHANGED) {
      return {
        pk: dto.pk,
        sk: dto.sk,
        attributes: dto.attributes,
        version: existingData.version,
      };
    }
    throw new Error('Invalid map status');
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

## Related Documentation

- [Backend Development Guide](./backend-development) - Core backend patterns
- [Service Patterns](./service-patterns) - Service implementation
- [Step Functions](./architecture/step-functions) - Workflow orchestration
- [Data Sync Handler Examples](./data-sync-handler-examples) - Sync handler patterns
