---
sidebar_position: 8
description: MBC CQRS Serverlessで動的なマルチテナントアンケートとフォームを構築するためのアンケートテンプレート管理モジュール。
---

# アンケートテンプレート

MBC CQRS Serverlessフレームワークのためのアンケートテンプレート管理機能です。

## インストール {#installation}

```bash
npm install @mbc-cqrs-serverless/survey-template
```

## 概要 {#overview}

Survey Templateパッケージは、マルチテナントCQRSアーキテクチャにおける包括的なアンケートテンプレート管理を提供します。様々な質問タイプをサポートする柔軟なJSONベースの定義を使用して、アンケートテンプレートの作成、管理、保存を可能にします。

## 機能 {#features}

- **アンケートテンプレートCRUD操作**: アンケートテンプレートの作成、読み取り、更新、削除
- **マルチテナントサポート**: テナント分離されたアンケートテンプレート管理
- **柔軟なアンケート構造**: JSONベースのアンケートテンプレート定義
- **様々な質問タイプ**: テキスト、複数選択、評価などをサポート
- **検索とフィルタリング**: キーワードマッチングを備えた高度な検索機能
- **イベント駆動アーキテクチャ**: コマンド/イベントハンドリングを備えたCQRSパターン上に構築
- **RESTful API**: アンケートテンプレート操作のための完全なREST API

## 基本セットアップ {#basic-setup}

### モジュール設定

```typescript
import { SurveyTemplateModule } from '@mbc-cqrs-serverless/survey-template';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    SurveyTemplateModule.register({
      enableController: true,  // Enable REST API endpoints (REST APIエンドポイントを有効化)
      prismaService: PrismaService,  // Required when enableController is true (enableController が true の場合に必須)
    }),
  ],
})
export class AppModule {}
```

## APIエンドポイント {#api-endpoints}

| メソッド | エンドポイント | 説明 |
|--------|----------|-------------|
| GET | `/api/survey-template/` | アンケートテンプレートの検索と一覧表示 |
| POST | `/api/survey-template/` | 新しいアンケートテンプレートを作成 |
| GET | `/api/survey-template/:id` | 特定のアンケートテンプレートを取得 |
| PUT | `/api/survey-template/:id` | アンケートテンプレートを更新 |
| DELETE | `/api/survey-template/:id` | アンケートテンプレートを削除 |

## アンケートテンプレートの作成 {#creating-survey-template}

```typescript
import { Injectable } from '@nestjs/common';
import { IInvoke } from '@mbc-cqrs-serverless/core';
import {
  SurveyTemplateCreateDto,
  SurveyTemplateDataEntity,
  SurveyTemplateService,
} from '@mbc-cqrs-serverless/survey-template';

@Injectable()
export class SurveyService {
  constructor(
    private readonly surveyTemplateService: SurveyTemplateService,
  ) {}

  async createTemplate(
    dto: SurveyTemplateCreateDto,
    invokeContext: IInvoke,
  ): Promise<SurveyTemplateDataEntity> {
    return this.surveyTemplateService.create(dto, { invokeContext });
  }
}
```

## 質問タイプ {#question-types}

### テキスト質問

```json
{
  "type": "text",
  "text": "Please describe your experience",
  "required": true,
  "maxLength": 1000,
  "placeholder": "Enter your response..."
}
```

### 複数選択

```json
{
  "type": "multiple_choice",
  "text": "Which products do you use?",
  "required": true,
  "allowMultiple": true,
  "options": [
    { "value": "product_a", "label": "Product A" },
    { "value": "product_b", "label": "Product B" },
    { "value": "product_c", "label": "Product C" }
  ]
}
```

### 評価スケール

```json
{
  "type": "rating",
  "text": "Rate your experience",
  "required": true,
  "min": 1,
  "max": 10,
  "labels": {
    "1": "Poor",
    "5": "Average",
    "10": "Excellent"
  }
}
```

### はい/いいえ質問

```json
{
  "type": "boolean",
  "text": "Would you recommend us to a friend?",
  "required": true
}
```

### 日付質問

```json
{
  "type": "date",
  "text": "When did you first use our service?",
  "required": false,
  "minDate": "2020-01-01",
  "maxDate": "today"
}
```

## アンケートテンプレート構造 {#template-structure}

```typescript
interface SurveyTemplate {
  id: string;
  name: string;
  description?: string;
  sections: Section[];
  settings?: TemplateSettings;
  createdAt: Date;
  updatedAt: Date;
}

interface Section {
  title: string;
  description?: string;
  questions: Question[];
}

interface TemplateSettings {
  allowAnonymous: boolean;
  showProgressBar: boolean;
  randomizeQuestions: boolean;
}

type QuestionType = 'text' | 'multiple_choice' | 'rating' | 'boolean' | 'date';

interface Question {
  type: QuestionType;
  text: string;
  required: boolean;
  // text question options (テキスト質問オプション)
  maxLength?: number;
  placeholder?: string;
  // multiple_choice options (複数選択オプション)
  allowMultiple?: boolean;
  options?: Array<{ value: string; label: string }>;
  // rating options (評価オプション)
  min?: number;
  max?: number;
  labels?: Record<string, string>;
  // date options (日付オプション)
  minDate?: string;
  maxDate?: string;
}
```

## テンプレートの検索 {#searching-templates}

```typescript
async searchTemplates(
  tenantCode: string,
  searchDto: SearchDto,
): Promise<SurveyTemplateDataListEntity> {
  return this.surveyTemplateService.searchData(tenantCode, searchDto);
}

async getTemplate(key: DetailKey): Promise<SurveyTemplateDataEntity> {
  return this.surveyTemplateService.findOne(key);
}
```

## テンプレートの更新 {#updating-templates}

```typescript
async updateTemplate(
  key: DetailKey,
  dto: SurveyTemplateUpdateDto,
  invokeContext: IInvoke,
): Promise<SurveyTemplateDataEntity> {
  return this.surveyTemplateService.update(key, dto, { invokeContext });
}
```

## テンプレートの削除 {#deleting-templates}

```typescript
async deleteTemplate(
  key: DetailKey,
  invokeContext: IInvoke,
): Promise<SurveyTemplateDataEntity> {
  return this.surveyTemplateService.remove(key, { invokeContext });
}
```

## マルチテナント使用 {#multi-tenant-usage}

テンプレートはinvokeコンテキストを通じてテナントごとに自動的に分離されます：

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { getUserContext, IInvoke, INVOKE_CONTEXT, SearchDto } from '@mbc-cqrs-serverless/core';
import {
  SurveyTemplateDataListEntity,
  SurveyTemplateService,
} from '@mbc-cqrs-serverless/survey-template';

@Controller('api/survey-template')
export class SurveyTemplateController {
  constructor(
    private readonly surveyTemplateService: SurveyTemplateService,
  ) {}

  @Get()
  async searchData(
    @Query() searchDto: SearchDto,
    @INVOKE_CONTEXT() invokeContext: IInvoke,
  ): Promise<SurveyTemplateDataListEntity> {
    const { tenantCode } = getUserContext(invokeContext);
    return this.surveyTemplateService.searchData(tenantCode, searchDto);
  }
}
```

## イベント処理 {#event-handling}

データ同期ハンドラーを使用してアンケートテンプレートデータの同期を処理：

```typescript
import { CommandModel, IDataSyncHandler } from '@mbc-cqrs-serverless/core';

export class SurveyTemplateDataSyncHandler implements IDataSyncHandler {
  async up(cmd: CommandModel): Promise<any> {
    // Called automatically on every command event — sync to RDS, notify users, etc. (すべてのコマンドイベントで自動呼び出し — RDSへの同期、ユーザーへの通知など)
    console.log('Survey template upserted:', cmd.name);
  }

  async down(cmd: CommandModel): Promise<any> {
    // Reserved for manual rollback — not called automatically by the framework (手動ロールバック用 — フレームワークから自動的には呼び出されません)
    console.log('Survey template rollback:', cmd.name);
  }
}
```

## ベストプラクティス {#best-practices}

1. **セクションを使用**: より良いユーザー体験のために質問を論理的なセクションに整理
2. **質問を検証**: 必須フィールドが適切にマークされていることを確認
3. **オプションを制限**: 複数選択の場合、オプションを適切な数に保つ
4. **テンプレートのバージョン管理**: 使用中の既存テンプレートを変更する代わりに新しいバージョンを作成
5. **テンプレートのテスト**: デプロイ前にテンプレートをプレビュー


## 関連ドキュメント

- [アンケートWeb](/docs/survey-web) - フロントエンドのアンケートコンポーネント
- [バックエンド開発](/docs/backend-development) - コアバックエンドパターン
- [サービスパターン](/docs/service-patterns) - サービス実装
