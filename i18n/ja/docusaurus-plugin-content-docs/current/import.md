---
sidebar_position: 6
---

# インポート

MBC CQRS Serverlessフレームワーク内でデータインポートを処理するための柔軟で拡張可能なモジュールです。

## インストール

```bash
npm install @mbc-cqrs-serverless/import
```

## 概要

インポートモジュールは、REST APIやCSVファイルなど複数のソースからのデータ取り込みに対する統一的なアプローチを提供します。データ取り込みとビジネスロジック実行の間のクリーンな分離のために2フェーズアーキテクチャを実装しています。

## 主な機能

- **統一アーキテクチャ設計**: 単一の一貫したコアビジネスロジックを通じてREST APIエンドポイントとCSVファイルからのデータを処理
- **ストラテジーパターン**: NestJSプロバイダーを通じて各データエンティティのバリデーション、変換、処理ロジックをカスタマイズ
- **非同期処理**: 最大限のスケーラビリティのためにDynamoDB Streams、SNS、SQSを通じたイベント駆動処理
- **2フェーズ処理**: データ取り込み/バリデーションとビジネスロジック実行の明確な分離
- **デュアルCSVモード**: 小さいファイル用のDIRECT処理か大規模インポート用のSTEP_FUNCTIONワークフローを選択

## アーキテクチャ

モジュールは2フェーズアーキテクチャで動作します：

### フェーズ1：インポート（取り込み）

このフェーズは`IImportStrategy`インターフェースを使用してシステムにデータを取り込みます：

1. **`transform(input)`**: 生の入力（JSONボディまたはCSV行）を標準化され検証されたDTOに変換
2. **`validate(dto)`**: 変換されたDTOをバリデート

結果はCREATEDステータスで一時DynamoDBテーブルのレコードになります。

### フェーズ2：処理（ビジネスロジック）

レコードが一時テーブルに入ると、`IProcessStrategy`インターフェースを使用してこのフェーズがトリガーされます：

1. **`compare(dto)`**: 最終目的地とデータを比較してステータスを決定（NOT_EXIST、CHANGED、EQUAL）
2. **`map(status, dto)`**: 作成または更新コマンドの最終ペイロードを構築
3. **`getCommandService()`**: 書き込み操作を実行するための正しいCommandServiceを提供

処理後、一時レコードはCOMPLETEDまたはFAILEDに更新されます。

## 基本セットアップ

### モジュール設定

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

## インポートストラテジーの実装

エンティティ用のカスタムインポートストラテジーを作成：

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

## プロセスストラテジーの実装

エンティティ用のカスタムプロセスストラテジーを作成：

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

## CSVインポート

### ダイレクトモード

小さいCSVファイルにはダイレクト処理を使用：

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

### Step Functionモード

大規模インポートにはStep Functionワークフローを使用：

```typescript
async importLargeCsv(file: Buffer): Promise<ImportResult> {
  return this.csvImportService.import(file, {
    mode: 'STEP_FUNCTION',
    strategy: 'order',
    stepFunctionArn: process.env.IMPORT_STEP_FUNCTION_ARN,
  });
}
```

## REST APIインポート

REST APIエンドポイントからデータをインポート：

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

## インポートステータス

インポートの進行状況とステータスを追跡：

| ステータス | 説明 |
|--------|-------------|
| `CREATED` | ステージングテーブルにレコードが作成された |
| `PROCESSING` | レコードが処理中 |
| `COMPLETED` | 正常に処理完了 |
| `FAILED` | 処理失敗 |
| `SKIPPED` | スキップ（変更なし） |

## エラー処理

モジュールは失敗したインポートの詳細なエラー情報を提供します：

```typescript
const result = await this.importService.import(data);

if (result.status === 'FAILED') {
  console.error('Import failed:', result.error);
  console.error('Failed at row:', result.failedRow);
}
```

## ベストプラクティス

1. **バリデーション優先**: 変換フェーズで徹底的なバリデーションを実装してエラーを早期に検出
2. **べき等処理**: 重複インポートを適切に処理するプロセスストラテジーを設計
3. **大きなファイルにはStep Functionsを使用**: 数千行のCSVファイルにはSTEP_FUNCTIONモードを使用
4. **進行状況の監視**: 長時間実行インポートを監視するためにステータス追跡を使用
5. **エラー回復**: 一時的な障害に対するリトライロジックを実装
