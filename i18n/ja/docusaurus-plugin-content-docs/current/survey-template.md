---
sidebar_position: 8
---

# 調査テンプレート

MBC CQRS Serverlessフレームワークのための調査テンプレート管理機能です。

## インストール

```bash
npm install @mbc-cqrs-serverless/survey-template
```

## 概要

Survey Templateパッケージは、マルチテナントCQRSアーキテクチャにおける包括的な調査テンプレート管理を提供します。様々な質問タイプをサポートする柔軟なJSONベースの定義を使用して、調査テンプレートの作成、管理、保存を可能にします。

## 機能

- **調査テンプレートCRUD操作**: 調査テンプレートの作成、読み取り、更新、削除
- **マルチテナントサポート**: テナント分離された調査テンプレート管理
- **柔軟な調査構造**: JSONベースの調査テンプレート定義
- **様々な質問タイプ**: テキスト、複数選択、評価などをサポート
- **検索とフィルタリング**: キーワードマッチングを備えた高度な検索機能
- **イベント駆動アーキテクチャ**: コマンド/イベントハンドリングを備えたCQRSパターン上に構築
- **RESTful API**: 調査テンプレート操作のための完全なREST API

## 基本セットアップ

### モジュール設定

```typescript
import { SurveyTemplateModule } from '@mbc-cqrs-serverless/survey-template';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    SurveyTemplateModule.forRoot({
      tableName: 'survey-templates',
      region: 'ap-northeast-1',
    }),
  ],
})
export class AppModule {}
```

## APIエンドポイント

| メソッド | エンドポイント | 説明 |
|--------|----------|-------------|
| GET | `/api/survey-template/` | 調査テンプレートの検索と一覧表示 |
| POST | `/api/survey-template/` | 新しい調査テンプレートを作成 |
| GET | `/api/survey-template/:id` | 特定の調査テンプレートを取得 |
| PUT | `/api/survey-template/:id` | 調査テンプレートを更新 |
| DELETE | `/api/survey-template/:id` | 調査テンプレートを削除 |

## 調査テンプレートの作成

```typescript
import { SurveyTemplateService } from '@mbc-cqrs-serverless/survey-template';

@Injectable()
export class SurveyService {
  constructor(
    private readonly surveyTemplateService: SurveyTemplateService,
  ) {}

  async createTemplate(): Promise<SurveyTemplate> {
    return this.surveyTemplateService.create({
      name: 'Customer Satisfaction Survey',
      description: 'Annual customer satisfaction survey',
      sections: [
        {
          title: 'General Feedback',
          questions: [
            {
              type: 'rating',
              text: 'How satisfied are you with our service?',
              required: true,
              min: 1,
              max: 5,
            },
            {
              type: 'text',
              text: 'What can we improve?',
              required: false,
              maxLength: 500,
            },
          ],
        },
      ],
    });
  }
}
```

## 質問タイプ

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

## 調査テンプレート構造

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
```

## テンプレートの検索

```typescript
async searchTemplates(keyword: string): Promise<SurveyTemplate[]> {
  return this.surveyTemplateService.search({
    keyword,
    limit: 10,
  });
}

async listByCategory(category: string): Promise<SurveyTemplate[]> {
  return this.surveyTemplateService.list({
    filter: { category },
  });
}
```

## テンプレートの更新

```typescript
async updateTemplate(
  id: string,
  updates: Partial<SurveyTemplate>,
): Promise<SurveyTemplate> {
  return this.surveyTemplateService.update(id, updates);
}
```

## テンプレートの複製

```typescript
async cloneTemplate(
  templateId: string,
  newName: string,
): Promise<SurveyTemplate> {
  const original = await this.surveyTemplateService.getById(templateId);
  return this.surveyTemplateService.create({
    ...original,
    name: newName,
  });
}
```

## マルチテナント使用

テンプレートはテナントによって自動的に分離されます：

```typescript
@Controller('api/survey-template')
export class SurveyTemplateController {
  constructor(
    private readonly surveyTemplateService: SurveyTemplateService,
  ) {}

  @Get()
  @UseTenant()
  async list(@TenantContext() tenantId: string): Promise<SurveyTemplate[]> {
    // Automatically scoped to tenant
    return this.surveyTemplateService.list();
  }
}
```

## イベント処理

テンプレートイベントをリッスン：

```typescript
import { TemplateCreatedEvent } from '@mbc-cqrs-serverless/survey-template';

@EventsHandler(TemplateCreatedEvent)
export class TemplateCreatedHandler
  implements IEventHandler<TemplateCreatedEvent> {
  async handle(event: TemplateCreatedEvent): Promise<void> {
    console.log('Template created:', event.template.name);
  }
}
```

## ベストプラクティス

1. **セクションを使用**: より良いユーザー体験のために質問を論理的なセクションに整理
2. **質問を検証**: 必須フィールドが適切にマークされていることを確認
3. **オプションを制限**: 複数選択の場合、オプションを適切な数に保つ
4. **テンプレートのバージョン管理**: 使用中の既存テンプレートを変更する代わりに新しいバージョンを作成
5. **テンプレートのテスト**: デプロイ前にテンプレートをプレビュー
