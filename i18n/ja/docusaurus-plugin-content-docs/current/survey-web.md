---
description: アンケート・調査票UIコンポーネントを構築するためのSurvey Webパッケージについて学びます。
---

# Survey用フロントパッケージ

MBC CQRS Serverlessアプリケーションでアンケートテンプレートの管理とフォームレンダリングを行うためのフロントエンドコンポーネントライブラリです。

## インストール

```bash
npm install @mbc-cqrs-serverless/survey-web
```

## 概要

Survey Webパッケージ（`@mbc-cqrs-serverless/survey-web`）は、アンケートテンプレートの作成、編集、レンダリング用のReactコンポーネントを提供します。複数の質問タイプ、ドラッグ&ドロップによるセクション並び替え、AWS AppSyncを通じたリアルタイムコラボレーションをサポートしています。

## 機能

- **テンプレート管理**: アンケートテンプレートの作成、編集、削除
- **複数の質問タイプ**: 様々なデータ収集ニーズに対応する9種類の組み込み質問タイプ
- **ドラッグ&ドロップ**: @dnd-kitによるセクションと質問の並び替え
- **フォームバリデーション**: カスタムルール対応のZodベースバリデーション
- **リアルタイム更新**: AWS AppSync統合による共同編集
- **レスポンシブデザイン**: モバイルフレンドリーなアンケートフォーム
- **セクションベースの構造**: 質問を論理的なセクションに整理

## 主要コンポーネント

### SurveyTemplatePage

検索・管理機能を備えたアンケートテンプレート一覧を表示します。

```tsx
import { SurveyTemplatePage } from "@mbc-cqrs-serverless/survey-web/SurveyTemplatePage";
import "@mbc-cqrs-serverless/survey-web/styles.css";

export default function SurveyTemplatesPage() {
  return <SurveyTemplatePage />;
}
```

### EditSurveyTemplatePage

ドラッグ&ドロップ機能を備えたアンケートテンプレートの作成・編集エディタ。

```tsx
import { EditSurveyTemplatePage } from "@mbc-cqrs-serverless/survey-web/EditSurveyTemplatePage";

export default function EditSurveyPage({ params }: { params: { id: string } }) {
  return <EditSurveyTemplatePage id={params.id} />;
}
```

### SurveyForm

アンケートテンプレートを回答者向けの入力フォームとしてレンダリングします。

```tsx
import { SurveyForm } from "@mbc-cqrs-serverless/survey-web/SurveyForm";

export default function SurveyResponsePage({ template }) {
  const handleSubmit = (responses) => {
    console.log("Survey responses:", responses);
  };

  return (
    <SurveyForm
      template={template}
      onSubmit={handleSubmit}
    />
  );
}
```

## 質問タイプ

Survey Webパッケージは9種類の質問タイプをサポートしています：

### 1. 短いテキスト

簡潔な回答用の1行テキスト入力。

```json
{
  "type": "short_text",
  "text": "What is your name?",
  "required": true,
  "placeholder": "Enter your name"
}
```

### 2. 長いテキスト

詳細な回答用の複数行テキストエリア。

```json
{
  "type": "long_text",
  "text": "Please describe your experience",
  "required": false,
  "maxLength": 1000
}
```

### 3. 単一選択

相互排他的な選択肢用のラジオボタン。

```json
{
  "type": "single_choice",
  "text": "What is your preferred contact method?",
  "required": true,
  "options": [
    { "value": "email", "label": "Email" },
    { "value": "phone", "label": "Phone" },
    { "value": "mail", "label": "Mail" }
  ]
}
```

### 4. 複数選択

複数選択用のチェックボックス。

```json
{
  "type": "multiple_choice",
  "text": "Which products are you interested in?",
  "required": true,
  "options": [
    { "value": "product_a", "label": "Product A" },
    { "value": "product_b", "label": "Product B" },
    { "value": "product_c", "label": "Product C" }
  ]
}
```

### 5. ドロップダウン

リストから選択するセレクトドロップダウン。

```json
{
  "type": "dropdown",
  "text": "Select your country",
  "required": true,
  "options": [
    { "value": "jp", "label": "Japan" },
    { "value": "us", "label": "United States" },
    { "value": "uk", "label": "United Kingdom" }
  ]
}
```

### 6. リニアスケール

評価回答用の数値スケール。

```json
{
  "type": "linear_scale",
  "text": "How likely are you to recommend us?",
  "required": true,
  "min": 1,
  "max": 10,
  "minLabel": "Not likely",
  "maxLabel": "Very likely"
}
```

### 7. 評価

5つ星評価入力。

```json
{
  "type": "rating",
  "text": "Rate your overall satisfaction",
  "required": true
}
```

### 8. 日付

日付選択用の日付ピッカー。

```json
{
  "type": "date",
  "text": "When did you first use our service?",
  "required": false
}
```

### 9. 時間

時間選択用のタイムピッカー。

```json
{
  "type": "time",
  "text": "What time works best for a callback?",
  "required": false
}
```

## カスタムフック

### useSurveyTemplates

アンケートテンプレートの取得と管理。

```tsx
import { useSurveyTemplates } from "@mbc-cqrs-serverless/survey-web";

function TemplateList() {
  const { templates, isLoading, error } = useSurveyTemplates();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {templates.map((template) => (
        <li key={template.id}>{template.name}</li>
      ))}
    </ul>
  );
}
```

### useEditSurveyTemplate

アンケートテンプレート編集用フック。

```tsx
import { useEditSurveyTemplate } from "@mbc-cqrs-serverless/survey-web";

function TemplateEditor({ templateId }) {
  const { template, updateTemplate, saveTemplate } = useEditSurveyTemplate(templateId);

  const handleSave = async () => {
    await saveTemplate();
  };

  return (
    <div>
      {/* Editor UI */}
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

### useDeleteSurveyTemplate

アンケートテンプレート削除用フック。

```tsx
import { useDeleteSurveyTemplate } from "@mbc-cqrs-serverless/survey-web";

function DeleteButton({ templateId }) {
  const { deleteTemplate, isDeleting } = useDeleteSurveyTemplate();

  return (
    <button
      onClick={() => deleteTemplate(templateId)}
      disabled={isDeleting}
    >
      Delete
    </button>
  );
}
```

## アンケートテンプレート構造

アンケートテンプレートは以下の構造に従います：

```typescript
interface SurveyTemplate {
  id: string;
  name: string;
  description?: string;
  sections: Section[];
  createdAt: Date;
  updatedAt: Date;
}

interface Section {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  nextSectionId?: string; // For conditional branching
}

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options?: Option[];
  validation?: ValidationRule[];
}
```

## バリデーションルール

質問用のカスタムバリデーションルールを定義：

```typescript
interface ValidationRule {
  type: "min_length" | "max_length" | "pattern" | "email" | "number_range";
  value: string | number;
  message: string;
}
```

バリデーション付きの例：

```json
{
  "type": "short_text",
  "text": "Enter your email",
  "required": true,
  "validation": [
    {
      "type": "email",
      "message": "Please enter a valid email address"
    }
  ]
}
```

## 環境変数

以下の環境変数を設定します：

| 変数 | 説明 |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | REST APIエンドポイントのベースURL |
| `NEXT_PUBLIC_AWS_APPSYNC_GRAPHQLENDPOINT` | AWS AppSync GraphQLエンドポイント |
| `NEXT_PUBLIC_AWS_APPSYNC_REGION` | AppSync用のAWSリージョン |

## スタイリング

パッケージのスタイルをインポートします：

```tsx
import "@mbc-cqrs-serverless/survey-web/styles.css";
```

コンポーネントはTailwind CSSを使用しています。プロジェクトでTailwind CSSが設定されていることを確認してください。

## 依存関係

このパッケージで使用される主要な依存関係：

- React 18.x
- Next.js 14.x
- ドラッグ&ドロップ用@dnd-kit
- Apollo Client
- Radix UIコンポーネント
- Tailwind CSS 3.x
- react-hook-form
- バリデーション用Zod
- 日付処理用date-fns
- アイコン用lucide-react
