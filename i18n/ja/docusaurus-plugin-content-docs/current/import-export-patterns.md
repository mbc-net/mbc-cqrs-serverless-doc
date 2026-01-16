---
sidebar_position: 16
description: バッチ処理とバリデーションを使用したCSVおよびExcel形式でのデータインポート・エクスポートパターンを学びます。
---

# インポート/エクスポートパターン

このガイドでは、CSVの処理、Excelファイルの処理、Step Functionsを使用したバッチデータ操作など、データのインポートおよびエクスポート操作のパターンについて説明します。

## このガイドを使用するタイミング

以下の場合にこのガイドを使用してください：

- CSVまたはExcelファイルから一括データをインポートする
- 様々な形式にデータをエクスポートする
- Step Functionsで大規模なデータセットを処理する
- S3署名付きURLでファイルアップロードを実装する
- 外部形式と内部形式の間でデータを変換する

## インポートアーキテクチャの概要

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

## ファイルアップロードパターン

### ストレージサービス

安全なファイルアップロードのための署名付きURLを生成します：

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
   * Generate upload URL for file import (ファイルインポート用のアップロードURLを生成)
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
      expiresIn: 3600, // 1 hour (1時間)
    });

    return { bucket, key, url };
  }

  /**
   * Generate download URL for file export (ファイルエクスポート用のダウンロードURLを生成)
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

### ストレージコントローラー

```typescript
// storage/storage.controller.ts
import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { StorageService } from './storage.service';

@Controller('api/storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Get presigned URL for upload (アップロード用の署名付きURLを取得)
   */
  @Post('upload-url')
  async getUploadUrl(
    @Body() dto: { filename: string; contentType?: string },
  ) {
    return this.storageService.genUploadUrl(dto.filename, dto.contentType);
  }

  /**
   * Get presigned URL for download (ダウンロード用の署名付きURLを取得)
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

## CSVインポートパターン

### CSVインポートコントローラー

```typescript
// csv-import/csv-import.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StepFunctionService, INVOKE_CONTEXT, IInvoke } from '@mbc-cqrs-serverless/core';

export class CsvImportDto {
  bucket: string;
  key: string;
  type: string;  // Import type identifier (インポートタイプ識別子)
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
   * Start CSV import via Step Functions (Step FunctionsでCSVインポートを開始)
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

### CSVパーサーサービス

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
   * Parse CSV file from S3 (S3からCSVファイルを解析)
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
   * Validate parsed rows (解析された行をバリデート)
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

### インポートイベントハンドラー

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
   * Process CSV import event (CSVインポートイベントを処理)
   */
  async execute(event: CsvImportEvent): Promise<any> {
    this.logger.log(`Processing import: ${event.key}`);

    try {
      // Parse CSV (CSVを解析)
      const rows = await this.csvParser.parseFromS3(event.bucket, event.key);

      // Validate (バリデート)
      const validatedRows = this.csvParser.validateRows(rows, [
        'code', 'name', 'price',
      ]);

      // Filter valid rows (有効な行をフィルタ)
      const validRows = validatedRows.filter(r => r.errors.length === 0);
      const invalidRows = validatedRows.filter(r => r.errors.length > 0);

      if (invalidRows.length > 0) {
        this.logger.warn(`${invalidRows.length} rows have validation errors`);
      }

      // Process in batches (バッチで処理)
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

## Excelインポートパターン

### Excelヘルパー関数

```typescript
// helpers/excel.ts
import { Workbook, Worksheet, Cell } from 'exceljs';

/**
 * Get cell value handling formulas and rich text (数式やリッチテキストを処理してセル値を取得)
 */
export function getCellValue(row: any, column: string): string | undefined {
  const cell = row.getCell(column);

  if (!cell || cell.value === null || cell.value === undefined) {
    return undefined;
  }

  // Handle formula result (数式の結果を処理)
  if (typeof cell.value === 'object' && 'result' in cell.value) {
    return String(cell.value.result);
  }

  // Handle rich text (リッチテキストを処理)
  if (typeof cell.value === 'object' && 'richText' in cell.value) {
    return cell.value.richText.map((r: any) => r.text).join('');
  }

  return String(cell.value);
}

/**
 * Get numeric cell value (数値のセル値を取得)
 */
export function getCellNumber(row: any, column: string): number | undefined {
  const value = getCellValue(row, column);
  if (!value) return undefined;

  const num = parseFloat(value.replace(/,/g, ''));
  return isNaN(num) ? undefined : num;
}

/**
 * Get date cell value (日付のセル値を取得)
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
 * Find header row by matching column headers (列ヘッダーをマッチングしてヘッダー行を検索)
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

### Excelインポートサービス

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
   * Load workbook from S3 (S3からワークブックを読み込む)
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
      // For .xls files, use different parser (.xlsファイルには別のパーサーを使用)
      throw new Error('XLS format not supported. Please use XLSX.');
    }

    return workbook;
  }

  /**
   * Process worksheet with row processor (行プロセッサでワークシートを処理)
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

    // Find or use specified header row (ヘッダー行を検索または指定されたものを使用)
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

      // Skip empty rows (空行をスキップ)
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

### インポートストラテジーパターン

```typescript
// import/base-import.strategy.ts
import { IInvoke } from '@mbc-cqrs-serverless/core';

/**
 * Base interface for import strategies (インポート戦略の基本インターフェース)
 * @typeParam TInput - The input type, must be an object (入力型、オブジェクトである必要があります)
 * @typeParam TAttributesDto - The output DTO type, must be an object (出力DTO型、オブジェクトである必要があります)
 */
export interface IImportStrategy<TInput extends object, TAttributesDto extends object> {
  /**
   * Transform raw input to command DTO (生の入力をコマンドDTOに変換)
   */
  transform(input: TInput): Promise<TAttributesDto>;

  /**
   * Validate transformed DTO (変換後のDTOをバリデート)
   */
  validate(data: TAttributesDto): Promise<void>;
}

/**
 * Base import strategy with common functionality (共通機能を持つ基本インポート戦略)
 * @typeParam TInput - The input type, must be an object (入力型、オブジェクトである必要があります)
 * @typeParam TAttributesDto - The output DTO type, must be an object (出力DTO型、オブジェクトである必要があります)
 */
export abstract class BaseImportStrategy<TInput extends object, TAttributesDto extends object>
  implements IImportStrategy<TInput, TAttributesDto>
{
  /**
   * Transform raw input to command DTO (default: return as-is) (生の入力をコマンドDTOに変換、デフォルト：そのまま返す)
   */
  async transform(input: TInput): Promise<TAttributesDto> {
    return input as unknown as TAttributesDto;
  }

  /**
   * Validate transformed DTO using class-validator (class-validatorを使用して変換後のDTOをバリデート)
   */
  async validate(data: TAttributesDto): Promise<void> {
    // Uses class-validator for validation (class-validatorでバリデーションを実行)
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
   * Flatten validation errors to a simple format (バリデーションエラーをシンプルな形式にフラット化)
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

### 具象インポートストラテジー

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
   * Transform import data to command DTO (インポートデータをコマンドDTOに変換)
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
   * Validate import input (インポート入力をバリデート)
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

## エクスポートパターン

### エクスポートサービス

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
   * Export data to CSV and upload to S3 (データをCSVにエクスポートしてS3にアップロード)
   */
  async exportToCsv(
    data: Record<string, any>[],
    headers: { key: string; label: string }[],
    filename: string,
  ): Promise<{ bucket: string; key: string }> {
    // Build CSV content (CSVコンテンツを構築)
    const headerRow = headers.map(h => h.label).join(',');
    const dataRows = data.map(row =>
      headers.map(h => this.escapeCsvValue(row[h.key])).join(','),
    );
    const csvContent = [headerRow, ...dataRows].join('\n');

    // Upload to S3 (S3にアップロード)
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
   * Export data to Excel and upload to S3 (データをExcelにエクスポートしてS3にアップロード)
   */
  async exportToExcel(
    data: Record<string, any>[],
    headers: { key: string; label: string; width?: number }[],
    filename: string,
    sheetName = 'Data',
  ): Promise<{ bucket: string; key: string }> {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Set columns (列を設定)
    worksheet.columns = headers.map(h => ({
      header: h.label,
      key: h.key,
      width: h.width || 15,
    }));

    // Style header row (ヘッダー行にスタイルを適用)
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows (データ行を追加)
    data.forEach(row => {
      const rowData: Record<string, any> = {};
      headers.forEach(h => {
        rowData[h.key] = row[h.key];
      });
      worksheet.addRow(rowData);
    });

    // Generate buffer (バッファを生成)
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload to S3 (S3にアップロード)
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

## Step Functions統合

### インポートオーケストレーション

```typescript
// Import workflow with Step Functions (Step Functionsによるインポートワークフロー)

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

## ベストプラクティス

### 1. バッチ処理

大きなファイルは常にバッチで処理します：

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

### 2. エラーハンドリング

処理を停止せずにエラーを収集し報告します：

```typescript
const errors: Array<{ row: number; error: string }> = [];

for (const [index, row] of rows.entries()) {
  try {
    await processRow(row);
  } catch (error) {
    errors.push({ row: index + 1, error: error.message });
    // Continue processing (処理を継続)
  }
}

if (errors.length > 0) {
  await this.reportErrors(errors);
}
```

### 3. 処理前のバリデーション

インポートを開始する前にすべてのデータをバリデーションします：

```typescript
// First pass: validate (最初のパス：バリデート)
const validationErrors = await this.validateAll(rows);
if (validationErrors.length > 0) {
  return { success: false, errors: validationErrors };
}

// Second pass: process (2番目のパス：処理)
await this.processAll(rows);
```

### 4. 進捗報告

長時間実行されるインポートの進捗を報告します：

```typescript
const total = rows.length;
let processed = 0;

for (const batch of batches) {
  await processBatch(batch);
  processed += batch.length;

  // Report progress every 100 rows (100行ごとに進捗を報告)
  if (processed % 100 === 0) {
    this.logger.log(`Progress: ${processed}/${total} (${Math.round(processed/total*100)}%)`);
  }
}
```

## ImportModule APIリファレンス

`@mbc-cqrs-serverless/import`パッケージは、データインポートタスクを管理するための包括的なフレームワークを提供します。

### インストール

```bash
npm install @mbc-cqrs-serverless/import
```

### ProcessingMode列挙型 {#processingmode-enum}

`ProcessingMode`列挙型は、インポートジョブの実行方法を定義します：

```typescript
export enum ProcessingMode {
  DIRECT = 'DIRECT',           // Direct processing without Step Functions (Step Functionsを使用しない直接処理)
  STEP_FUNCTION = 'STEP_FUNCTION', // Processing orchestrated by Step Functions (Step Functionsによるオーケストレーション処理)
}
```

| モード | 説明 | ユースケース |
|----------|-----------------|--------------|
| `DIRECT` | Step Functionsオーケストレーションを使用せずにインポートを直接処理 | 小規模インポート、シンプルなデータ |
| `STEP_FUNCTION` | 信頼性のためにStep Functionsでインポートをオーケストレーション | 大規模インポート、複雑なワークフロー、ZIPインポート |

### CreateCsvImportDto {#createcsvimportdto}

`CreateCsvImportDto`はCSVインポートジョブを開始するために使用されます：

```typescript
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ProcessingMode } from '@mbc-cqrs-serverless/import'

export class CreateCsvImportDto {
  @IsString()
  @IsOptional()
  sourceId?: string           // Optional source identifier (オプションのソース識別子)

  @IsNotEmpty()
  @IsEnum(ProcessingMode)
  processingMode: ProcessingMode // How the import should be processed (インポートの処理方法)

  @IsString()
  @IsNotEmpty()
  bucket: string              // S3 bucket containing the CSV file (CSVファイルを含むS3バケット)

  @IsString()
  @IsNotEmpty()
  key: string                 // S3 key (path) to the CSV file (CSVファイルへのS3キー（パス）)

  @IsString()
  @IsNotEmpty()
  tableName: string           // Target table name for import profile matching (インポートプロファイルマッチング用のターゲットテーブル名)

  @IsString()
  @IsNotEmpty()
  tenantCode: string          // Tenant code for multi-tenancy (マルチテナンシー用のテナントコード)
}
```

| プロパティ | 型 | 必須 | 説明 |
|--------------|----------|--------------|-----------------|
| `sourceId` | `string` | いいえ | インポートソースのオプション識別子 |
| `processingMode` | `ProcessingMode` | はい | DIRECTまたはSTEP_FUNCTIONモード |
| `bucket` | `string` | はい | S3 bucket containing the CSV file (CSVファイルを含むS3バケット) |
| `key` | `string` | はい | S3 key (path) to the CSV file (CSVファイルへのS3キー（パス）) |
| `tableName` | `string` | はい | ターゲットテーブル名、インポートプロファイルのマッチングに使用 |
| `tenantCode` | `string` | はい | Tenant code for multi-tenancy (マルチテナンシー用のテナントコード) |

### CreateZipImportDto {#createzipimportdto}

`CreateZipImportDto`は複数のCSVファイルを含むZIPインポートジョブを開始するために使用されます：

```typescript
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateZipImportDto {
  @IsString()
  @IsNotEmpty()
  bucket: string              // S3 bucket containing the ZIP file (ZIPファイルを含むS3バケット)

  @IsString()
  @IsNotEmpty()
  key: string                 // S3 key (path) to the ZIP file (ZIPファイルへのS3キー（パス）)

  @IsString()
  @IsNotEmpty()
  tenantCode: string          // Tenant code for multi-tenancy (マルチテナンシー用のテナントコード)

  // High priority: sortedFileKeys (高優先度: sortedFileKeys)
  // If not provided, it will use the default sorting logic (指定されない場合、デフォルトのソートロジックを使用)
  @IsArray()
  @IsOptional()
  sortedFileKeys?: string[]   // Optional ordered list of file keys to process (処理するファイルキーのオプションの順序付きリスト)

  // High priority: tableName (高優先度: tableName)
  // If not provided, it will be extracted from the filename (指定されない場合、ファイル名から抽出)
  @IsString()
  @IsOptional()
  tableName?: string = null   // Optional table name override (オプションのテーブル名オーバーライド)
}
```

| プロパティ | 型 | 必須 | 説明 |
|--------------|----------|--------------|-----------------|
| `bucket` | `string` | はい | S3 bucket containing the ZIP file (ZIPファイルを含むS3バケット) |
| `key` | `string` | はい | S3 key (path) to the ZIP file (ZIPファイルへのS3キー（パス）) |
| `tenantCode` | `string` | はい | Tenant code for multi-tenancy (マルチテナンシー用のテナントコード) |
| `sortedFileKeys` | `string[]` | いいえ | 処理するファイルキーの順序付きリスト。指定されない場合、デフォルトのソートが使用される |
| `tableName` | `string` | いいえ | テーブル名のオーバーライド。指定されない場合、ファイル名から抽出（形式: yyyymmddhhMMss-\{tableName\}.csv） |

### コアコンセプト

このモジュールは2フェーズアーキテクチャで動作します：

1. **インポートフェーズ**（`IImportStrategy`）：生データ（JSONまたはCSV）を標準化されたDTOに変換し、バリデーションを行います。
2. **処理フェーズ**（`IProcessStrategy`）：バリデーション済みDTOを既存データと比較し、作成または更新用のコマンドペイロードにマッピングします。

### インポートストラテジーの実装

インポートストラテジーは初期変換とバリデーションを処理します：

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

### ComparisonStatus列挙型 {#comparisonstatus-enum}

`ComparisonStatus`列挙型は、インポートデータと既存データの比較結果を定義します：

```typescript
export enum ComparisonStatus {
  EQUAL = 'EQUAL',         // Data exists and is identical - no action needed (データが存在し同一 - アクション不要)
  NOT_EXIST = 'NOT_EXIST', // Data does not exist - create new record (データが存在しない - 新規レコード作成)
  CHANGED = 'CHANGED',     // Data exists but differs - update existing record (データは存在するが異なる - 既存レコード更新)
}
```

| 値 | 説明 | アクション |
|-----------|-----------------|------------|
| `EQUAL` | インポートデータが既存データと一致 | スキップ（操作なし） |
| `NOT_EXIST` | 既存データが見つからない | 新規レコード作成 |
| `CHANGED` | 既存データがインポートデータと異なる | 既存レコード更新 |

### ComparisonResultインターフェース {#comparisonresult-interface}

`ComparisonResult<T>`インターフェースは、比較ステータスとオプションの既存データをラップします：

```typescript
export interface ComparisonResult<T> {
  status: ComparisonStatus;  // The result of the comparison (比較結果)
  existingData?: T;          // The existing data if found (for EQUAL or CHANGED status) (見つかった場合の既存データ、EQUALまたはCHANGEDステータス用)
}
```

| プロパティ | 型 | 説明 |
|--------------|----------|-----------------|
| `status` | `ComparisonStatus` | 比較結果ステータス |
| `existingData` | `T \| undefined` | 既存エンティティデータ、ステータスがEQUALまたはCHANGEDの場合に存在 |

### IProcessStrategyインターフェース {#iprocessstrategy-interface}

`IProcessStrategy`インターフェースは、バリデーション済みインポートデータを処理するための契約を定義します：

```typescript
import { CommandInputModel, CommandPartialInputModel, CommandService } from '@mbc-cqrs-serverless/core';

export interface IProcessStrategy<TExistingData, TAttributesDto> {
  /**
   * Get the command service for publishing commands (コマンド発行用のコマンドサービスを取得)
   */
  getCommandService(): CommandService;

  /**
   * Compare the validated DTO with existing data (バリデーション済みDTOを既存データと比較)
   */
  compare(dto: TAttributesDto, tenantCode: string): Promise<ComparisonResult<TExistingData>>;

  /**
   * Map the DTO to a command payload based on comparison status (比較ステータスに基づいてDTOをコマンドペイロードにマッピング)
   * @returns CommandInputModel for create, CommandPartialInputModel for update (作成用CommandInputModel、更新用CommandPartialInputModel)
   */
  map(
    status: ComparisonStatus,
    dto: TAttributesDto,
    tenantCode: string,
    existingData?: TExistingData,
  ): Promise<CommandInputModel | CommandPartialInputModel>;
}
```

### BaseProcessStrategy抽象クラス {#baseprocessstrategy-class}

`BaseProcessStrategy`抽象クラスは、サブクラスが拡張する必要がある基本実装を提供します：

```typescript
export abstract class BaseProcessStrategy<TExistingData, TAttributesDto>
  implements IProcessStrategy<TExistingData, TAttributesDto>
{
  /**
   * Abstract method - must be implemented to return the command service (抽象メソッド - コマンドサービスを返すために実装が必要)
   */
  abstract getCommandService(): CommandService;

  /**
   * Abstract method - must be implemented to compare data (抽象メソッド - データ比較のために実装が必要)
   */
  abstract compare(
    dto: TAttributesDto,
    tenantCode: string,
  ): Promise<ComparisonResult<TExistingData>>;

  /**
   * Abstract method - must be implemented to map data to command payload (抽象メソッド - データをコマンドペイロードにマッピングするために実装が必要)
   */
  abstract map(
    status: ComparisonStatus,
    dto: TAttributesDto,
    tenantCode: string,
    existingData?: TExistingData,
  ): Promise<CommandInputModel | CommandPartialInputModel>;
}
```

:::info 注意
`BaseProcessStrategy`の3つのメソッド（`getCommandService()`、`compare()`、`map()`）はすべて抽象メソッドであり、サブクラスで実装する必要があります。
:::

### プロセスストラテジーの実装

プロセスストラテジーはデータの比較とマッピングのコアビジネスロジックを含みます：

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
    status: ComparisonStatus,
    dto: PolicyCommandDto,
    tenantCode: string,
    existingData?: PolicyDataEntity,
  ): Promise<CommandInputModel | CommandPartialInputModel> {
    if (status === ComparisonStatus.NOT_EXIST) {
      // Return CommandInputModel for creating new records (新規レコード作成用にCommandInputModelを返す)
      return { ...dto, version: 0 } as CommandInputModel;
    }
    if (status === ComparisonStatus.CHANGED) {
      // Return CommandPartialInputModel for updating existing records (既存レコード更新用にCommandPartialInputModelを返す)
      return {
        pk: dto.pk,
        sk: dto.sk,
        attributes: dto.attributes,
        version: existingData.version,
      } as CommandPartialInputModel;
    }
    throw new Error('Invalid map status');
  }
}
```

### モジュール設定

プロファイルを使用してImportModuleを登録します：

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

### インポート用カスタムイベントファクトリー

インポートイベントを処理するようにイベントファクトリーを設定します：

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

`ImportStatusHandler`は、インポートジョブのStep Functionsコールバックを管理する内部イベントハンドラーです。Step Functionsオーケストレーション（ZIPインポートまたはSTEP_FUNCTIONモードのCSVインポート）を使用する場合、このハンドラーはステートマシンとの適切な通信を保証します。

#### 動作

| インポートステータス | アクション | Step Functionsコマンド |
|-------------------|------------|---------------------------|
| `COMPLETED` | 成功コールバックを送信 | `SendTaskSuccessCommand` |
| `FAILED` | 失敗コールバックを送信 | `SendTaskFailureCommand` |
| その他のステータス | 無視 | なし |

#### メソッド

| メソッド | 説明 |
|------------|-----------------|
| `sendTaskSuccess(taskToken, output)` | インポート結果とともにStep Functionsに成功シグナルを送信 |
| `sendTaskFailure(taskToken, error, cause)` | エラー詳細とともにStep Functionsに失敗シグナルを送信 |

#### Step Functions統合

Step Functionsワークフロー（例：ZIPインポート）の一部としてインポートジョブが作成されると、`taskToken`がジョブの属性に保存されます。`ImportStatusHandler`はステータス変更通知をリッスンし、以下を行います：

1. DynamoDBからインポートジョブを取得
2. ジョブの属性に`taskToken`が存在するか確認
3. 最終ステータスに基づいて適切なコールバックを送信：
   - `COMPLETED` → `SendTaskSuccessCommand` 結果データとともに
   - `FAILED` → `SendTaskFailureCommand` エラー詳細とともに

これにより、Step Functionsワークフローが無限に待機することなく、成功と失敗の両方のケースを適切に処理できます。

:::info Version Note
`sendTaskFailure()`メソッドは[バージョン1.0.18](./changelog#v1018)で追加され、インポートジョブが失敗した際にStep Functionsが無限に待機する問題を修正しました。トラブルシューティングについては[インポートモジュールエラー](./error-catalog#import-module-errors)も参照してください。
:::

### ImportQueueEventHandlerエラーハンドリング {#import-error-handling}

`ImportQueueEventHandler`はSQSキューから個々のインポートレコードを処理します。処理中にエラーが発生した場合（例：`ConditionalCheckFailedException`）、ハンドラーは親ジョブのステータスを適切に更新します。

#### エラーフロー（v1.0.19以降）

```
子ジョブエラー発生
         │
         ▼
子ジョブをFAILEDとしてマーク
         │
         ▼
親ジョブカウンターを更新
  (incrementParentJobCounters)
         │
         ▼
すべての子ジョブが完了したか確認
         │
    ┌────┴────┐
    │ Yes     │ No
    ▼         ▼
マスターを更新  {{Wait for
  Job Status}}     more children
         │
    ┌────┴────┐
    │ Has     │ All
    │ Failures│ Succeeded
    ▼         ▼
FAILED    COMPLETED
         │
         ▼
ImportStatusHandlerがトリガー
         │
         ▼
SendTaskFailure/SendTaskSuccess
```

#### 主要メソッド

| メソッド | 説明 |
|------------|-----------------|
| `handleImport(event)` | エラーハンドリングを含む単一インポートレコード処理をオーケストレート |
| `executeStrategy(...)` | ストラテジーの比較、マッピング、保存のライフサイクルを実行 |

#### エラーハンドリングの動作

子インポートジョブが失敗した場合：

1. 子ジョブのステータスがエラー詳細とともに`FAILED`に設定される
2. 親ジョブのカウンターがアトミックに更新される（`failedRows`がインクリメント）
3. すべての子ジョブが完了すると、結果に基づいてマスタージョブのステータスが設定される：
   - `failedRows > 0`の場合 → マスターステータス = `FAILED`
   - すべて成功した場合 → マスターステータス = `COMPLETED`
4. Lambdaはクラッシュしない - エラーは適切に処理される

:::warning Common Errors
`ConditionalCheckFailedException`：競合するバージョンで既に存在するデータをインポートしようとした場合に発生します。インポートジョブはFAILEDとしてマークされ、親ジョブはこの失敗を適切に集計します。
:::

:::info Version Note
v1.0.19より前は、子ジョブのエラーによりLambdaがクラッシュし、マスタージョブが`PROCESSING`ステータスのまま無限に残っていました。[バージョン1.0.19](./changelog#v1019)の修正により、適切なエラー伝播とステータス更新が保証されます。
:::

### CsvImportSfnEventHandler {#csvimportsfneventhandler}

`CsvImportSfnEventHandler`はStep FunctionsのCSVインポートワークフローステートを処理します。インポートステートマシン内の`csv_loader`と`csv_finalizer`ステートを管理します。

#### 主要メソッド

| メソッド | 説明 |
|------------|-----------------|
| `handleCsvLoader(event)` | csv_loaderステートを処理し、子ジョブを作成し、早期終了を処理します |
| `finalizeParentJob(event)` | すべての子ジョブ完了後に親ジョブを終了し、最終ステータスを設定します |

#### ステータス判定（v1.0.20以降）

親ジョブを終了する際、ハンドラーは最終ステータスを正しく判定します：

```typescript
// 正しい動作（v1.0.20以降）
const status = failedRows > 0
  ? ImportJobStatus.FAILED    // 子ジョブが失敗した場合 → FAILED
  : ImportJobStatus.COMPLETED // すべての子ジョブが成功した場合 → COMPLETED
```

:::warning 既知の問題（v1.0.20で修正）
v1.0.20より前のバージョンでは、三項演算子のバグにより、ステータスが常に`COMPLETED`になっていました：

```typescript
// バグ（v1.0.20より前）：常にCOMPLETEDを返していた
const status = failedRows > 0
  ? ImportJobStatus.COMPLETED  // 間違い！
  : ImportJobStatus.COMPLETED
```

このバグにより、子インポートジョブが失敗しても、Step FunctionsがSUCCESSを報告していました。詳細は[バージョン1.0.20](./changelog#v1020)を参照してください。
:::

### ZipImportSfnEventHandler {#zipimportsfneventhandler}

`ZipImportSfnEventHandler`はStep FunctionsのZIPインポートワークフローステートを処理します。ZIPアーカイブから抽出された複数のCSVファイルの処理をオーケストレーションします。

#### ワークフローステート

| ステート | 説明 |
|-----------|-----------------|
| `trigger_single_csv_and_wait` | ZIP内の各ファイルに対して単一のCSVインポートジョブをトリガー |
| `finalize_zip_job` | すべてのCSVインポートの結果を集計し、マスタージョブを終了 |

#### 主要メソッド

| メソッド | 説明 |
|------------|-----------------|
| `triggerSingleCsvJob(event)` | STEP_FUNCTIONモードでCSVインポートジョブを作成し、コールバック用のtaskTokenを渡す |
| `finalizeZipMasterJob(event)` | 処理されたすべてのCSVファイルの結果を集計し、ZIPマスタージョブのステータスを更新 |

#### ファイル命名規則

ZIPアーカイブからCSVファイルを処理する際、ハンドラーはファイル名からテーブル名を抽出します：

```
形式: yyyymmddhhMMss-\{tableName\}.csv
例: 20240115120000-products.csv → tableName = "products" を抽出
```

`CreateZipImportDto`で`tableName`が指定されている場合、抽出された名前をオーバーライドします。

#### 処理フロー

```
ZIPファイルがS3にアップロード
         │
         ▼
Step Functionsがトリガー
         │
         ▼
解凍してCSVファイルをリスト
         │
         ▼
Mapステート: 各CSVファイルに対して
    ┌────┴────┐
    │         │
    ▼         ▼
trigger_single_csv_and_wait
    │         │
    ▼         ▼
CSVインポートジョブ作成    CSVインポートジョブ作成
(taskToken付き)          (taskToken付き)
    │         │
    ▼         ▼
完了を待機       完了を待機
    │         │
    └────┬────┘
         │
         ▼
finalize_zip_job
         │
         ▼
結果を集計してマスタージョブを更新
```

#### ZipImportSfnEvent構造

```typescript
export class ZipImportSfnEvent implements IEvent {
  source: string           // Execution ID from Step Functions (Step Functionsからの実行ID)
  context: StepFunctionsContext // Step Functions context with state info (ステート情報を含むStep Functionsコンテキスト)
  input: string | any[]    // S3 key or array of results (S3キーまたは結果の配列)
  taskToken: string        // Token for callback to Step Functions (Step Functionsへのコールバック用トークン)
}
```

`context.Execution.Input`には以下が含まれます：
- `masterJobKey`: DynamoDBのZIPマスタージョブのプライマリキー
- `parameters`: 元のインポートパラメータ（bucket、tenantCode、tableName）

---

## 関連ドキュメント

- [バックエンド開発ガイド](./backend-development) - コアバックエンドパターン
- [サービスパターン](./service-patterns) - サービス実装
- [Step Functions](./architecture/step-functions) - ワークフローオーケストレーション
- [データ同期ハンドラー例](./data-sync-handler-examples) - 同期ハンドラーパターン
