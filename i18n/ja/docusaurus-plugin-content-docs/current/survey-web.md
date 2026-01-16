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
import { SurveyTemplatePage } from "@mbc-cqrs-serverless/survey-web";
import "@mbc-cqrs-serverless/survey-web/styles.css";

export default function SurveyTemplatesPage() {
  return <SurveyTemplatePage />;
}
```

### EditSurveyTemplatePage

ドラッグ&ドロップ機能を備えたアンケートテンプレートの作成・編集エディタ。

このコンポーネントは内部的に`next/navigation`の`useParams()`を使用してURLからアンケートIDを取得します。新規作成モードでは、IDパラメータのないルートでレンダリングします。既存のアンケートを編集する場合は、IDパラメータ付きのルート（例：`/surveys/[id]/edit`）でレンダリングします。

```tsx
import { EditSurveyTemplatePage } from "@mbc-cqrs-serverless/survey-web";

// Route: /surveys/new (create mode) (新規作成モード)
// Route: /surveys/[id]/edit (edit mode - ID extracted from URL via useParams) (編集モード - useParamsでURLからIDを取得)
export default function EditSurveyPage() {
  return <EditSurveyTemplatePage />;
}
```

### SurveyForm

アンケートテンプレートを回答者向けの入力フォームとしてレンダリングします。

```tsx
import { SurveyForm } from "@mbc-cqrs-serverless/survey-web";

export default function SurveyResponsePage({ schema }) {
  const handleSubmit = (responses) => {
    console.log("Survey responses:", responses);
  };

  return (
    <SurveyForm
      schema={schema}
      onSubmit={handleSubmit}
      disabled={false}
    >
      {/* Optional: Custom content or actions (オプション: カスタムコンテンツやアクション) */}
    </SurveyForm>
  );
}
```

## 質問タイプ

Survey Webパッケージは9種類の質問タイプをサポートしています：

### 1. 短いテキスト

簡潔な回答用の1行テキスト入力。

```json
{
  "id": "q1",
  "type": "short-text",
  "label": "What is your name?",
  "validation": {
    "required": true
  }
}
```

### 2. 長いテキスト

詳細な回答用の複数行テキストエリア。

```json
{
  "id": "q2",
  "type": "long-text",
  "label": "Please describe your experience",
  "validation": {
    "required": false,
    "custom": {
      "type": "length",
      "rule": "max",
      "value": 1000,
      "customError": "Response must be 1000 characters or less"
    }
  }
}
```

### 3. 単一選択

相互排他的な選択肢用のラジオボタン。

```json
{
  "id": "q3",
  "type": "single-choice",
  "label": "What is your preferred contact method?",
  "options": [
    { "value": "email", "label": "Email" },
    { "value": "phone", "label": "Phone" },
    { "value": "mail", "label": "Mail" }
  ],
  "validation": {
    "required": true
  }
}
```

### 4. 複数選択

複数選択用のチェックボックス。

```json
{
  "id": "q4",
  "type": "multiple-choice",
  "label": "Which products are you interested in?",
  "options": [
    { "value": "product_a", "label": "Product A" },
    { "value": "product_b", "label": "Product B" },
    { "value": "product_c", "label": "Product C" }
  ],
  "validation": {
    "required": true
  }
}
```

### 5. ドロップダウン

リストから選択するセレクトドロップダウン。

```json
{
  "id": "q5",
  "type": "dropdown",
  "label": "Select your country",
  "options": [
    { "value": "jp", "label": "Japan" },
    { "value": "us", "label": "United States" },
    { "value": "uk", "label": "United Kingdom" }
  ],
  "validation": {
    "required": true
  }
}
```

### 6. リニアスケール

評価回答用の数値スケール。

```json
{
  "id": "q6",
  "type": "linear-scale",
  "label": "How likely are you to recommend us?",
  "min": 0,
  "max": 10,
  "minLabel": "Not likely",
  "maxLabel": "Very likely",
  "validation": {
    "required": true
  }
}
```

### 7. 評価

2〜10段階で設定可能な星/ハート/サムズアップ評価入力。

```json
{
  "id": "q7",
  "type": "rating",
  "label": "Rate your overall satisfaction",
  "levels": 5,
  "symbol": "star",
  "validation": {
    "required": true
  }
}
```

| プロパティ | 型 | デフォルト | 説明 |
|----------|------|---------|-------------|
| `levels` | `number` | `5` | 評価レベル数（2〜10） |
| `symbol` | `'star' \| 'heart' \| 'thumb'` | `'star'` | 評価表示に使用するシンボル |

### 8. 日付

設定可能なオプション付きの日付選択ピッカー。

```json
{
  "id": "q8",
  "type": "date",
  "label": "When did you first use our service?",
  "includeTime": false,
  "includeYear": true,
  "validation": {
    "required": false
  }
}
```

| プロパティ | 型 | デフォルト | 説明 |
|----------|------|---------|-------------|
| `includeTime` | `boolean` | `false` | 日付と一緒に時間選択を含める |
| `includeYear` | `boolean` | `true` | 日付選択に年を含める |

### 9. 時間

時間または期間入力用のタイムピッカー。

```json
{
  "id": "q9",
  "type": "time",
  "label": "What time works best for a callback?",
  "answerType": "time",
  "validation": {
    "required": false
  }
}
```

| プロパティ | 型 | デフォルト | 説明 |
|----------|------|---------|-------------|
| `answerType` | `'time' \| 'duration'` | `'time'` | 入力モード：特定の時間または期間 |

## カスタムフック

:::warning 内部フック
以下に記載されているフック（`useSurveyTemplates`、`useEditSurveyTemplate`、`useDeleteSurveyTemplate`）は、ページコンポーネントで使用される内部フックです。メインパッケージのインデックスからはエクスポートされていません。通常のユースケースでは、代わりにページコンポーネント（`SurveyTemplatePage`、`EditSurveyTemplatePage`）を使用してください。
:::

### useSurveyTemplates

ページネーションと検索機能を備えたアンケートテンプレートの取得と管理。

```tsx
// Note: This is an internal hook, not exported from main index (注意: これは内部フックで、メインインデックスからエクスポートされていません)
import { useSurveyTemplates } from "@mbc-cqrs-serverless/survey-web/hooks/use-survey-templates";

function TemplateList() {
  const {
    surveys,        // アンケートテンプレートの配列 (Array of survey templates)
    totalItems,     // テンプレートの総数 (Total number of templates)
    isLoading,
    error,
    refetch         // リストを更新する関数 (Function to refresh the list)
  } = useSurveyTemplates({
    page: 1,
    pageSize: 10,
    keyword: "",           // オプション：検索キーワード (Optional: search keyword)
    orderBy: "createdAt",  // オプション：ソートフィールド (Optional: sort field)
    orderType: "desc"      // Optional: sort direction ('asc' | 'desc') (オプション: ソート順)
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>合計: {totalItems}</p>
      <ul>
        {surveys.map((survey) => (
          <li key={survey.id}>{survey.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### useEditSurveyTemplate

スキーマ管理と送信処理を備えたアンケートテンプレート編集用フック。

```tsx
// Note: This is an internal hook, not exported from main index (注意: これは内部フックで、メインインデックスからエクスポートされていません)
import { useEditSurveyTemplate } from "@mbc-cqrs-serverless/survey-web/hooks/use-edit-survey-template";
import type { SurveySchemaType } from "@mbc-cqrs-serverless/survey-web/types/schema";

function TemplateEditor({ id }: { id?: string }) {
  const {
    surveyData,           // サーバーからの現在のアンケートデータ (Current survey data from server)
    currentSchema,        // 現在の編集可能なスキーマ (Current editable schema)
    originalSchema,       // 変更検出用の元のスキーマ (Original schema for change detection)
    isLoading,
    isSubmitting,
    error,
    setCurrentSchema,     // 現在のスキーマを更新する関数 (Function to update current schema)
    handleCreateSurvey,   // (schema: SurveySchemaType) => Promise<void> - Function to create new survey (新しいアンケートを作成する関数)
    handleUpdateSurvey,   // (schema: SurveySchemaType) => Promise<void> - Function to update existing survey (既存のアンケートを更新する関数)
    retryFetchSurvey,     // アンケートデータの取得をリトライする関数 (Function to retry fetching survey data)
    isSchemaChanged,      // スキーマに変更があるかを示すブール値 (Boolean indicating if schema has changes)
    isButtonDisabled,     // 送信ボタンの無効状態を示すブール値 (Boolean for submit button disabled state)
    submitButtonRef       // 送信ボタンのRef (Ref for submit button)
  } = useEditSurveyTemplate({ id });

  const handleSave = async () => {
    if (id) {
      await handleUpdateSurvey(currentSchema);
    } else {
      await handleCreateSurvey(currentSchema);
    }
  };

  return (
    <div>
      {/* エディタUI (Editor UI) */}
      <button
        ref={submitButtonRef}
        onClick={handleSave}
        disabled={isButtonDisabled}
      >
        {isSubmitting ? "保存中..." : "保存"}
      </button>
    </div>
  );
}
```

### useDeleteSurveyTemplate

成功コールバック付きのアンケートテンプレート削除用フック。

```tsx
// Note: This is an internal hook, not exported from main index (注意: これは内部フックで、メインインデックスからエクスポートされていません)
import { useDeleteSurveyTemplate } from "@mbc-cqrs-serverless/survey-web/hooks/use-delete-survey-template";

function DeleteButton({ surveyId }: { surveyId: string }) {
  const { handleDeleteSurvey, isDeleting } = useDeleteSurveyTemplate({
    onSuccess: () => {
      console.log("アンケートが正常に削除されました (Survey deleted successfully)");
      // リストに戻るか更新 (Navigate back to list or refresh)
    }
  });

  return (
    <button
      onClick={() => handleDeleteSurvey(surveyId)}
      disabled={isDeleting}
    >
      削除
    </button>
  );
}
```

## アンケートテンプレート構造

アンケートテンプレートはセクションヘッダーを含むフラットリスト構造を使用します：

```typescript
interface SurveySchema {
  title: string;
  description?: string;
  items: SurveyItem[];  // セクションヘッダーと質問のフラットリスト (Flat list of section headers and questions)
}

// セクションヘッダー項目 - ブックマークまたはページ区切りとして機能 (Section header item - acts as a bookmark or page break)
interface SectionHeader {
  id: string;
  type: "section-header";
  title: string;
  description?: string;
  action?: {
    type: "submit";
  } | {
    type: "jump";
    targetSectionId: string;  // 条件分岐用の別のsection-headerのID (ID of another section-header for conditional branching)
  };
}

// 質問項目 (Question item)
interface Question {
  id: string;
  type: QuestionType;  // short-text、long-text、single-choiceなど (short-text, long-text, single-choice, etc.)
  label: string;
  description?: string;
  options?: QuestionOption[];  // 選択ベースの質問用 (For choice-based questions)
  validation?: ValidationRules;
}

// 選択ベースの質問用オプション (Option for choice-based questions)
interface QuestionOption {
  value: string;        // オプションの一意の値 (Unique value for the option)
  label: string;        // オプションの表示ラベル (Display label for the option)
  nextSectionId?: string;  // このオプションが選択されたときにジャンプするセクションのID（条件分岐用） (ID of section to jump to when this option is selected)
  isOther?: boolean;    // trueの場合、カスタム「その他」回答用のテキスト入力を表示 (If true, shows a text input for custom "Other" response)
}

// すべての項目タイプの共用体 (Union of all item types)
type SurveyItem = SectionHeader | Question;
```

アンケート構造の例：

```json
{
  "title": "Customer Feedback Survey",
  "description": "Help us improve our service",
  "items": [
    {
      "id": "section-intro",
      "type": "section-header",
      "title": "Introduction",
      "description": "Please answer a few questions about yourself"
    },
    {
      "id": "q1",
      "type": "short-text",
      "label": "What is your name?",
      "validation": { "required": true }
    },
    {
      "id": "section-feedback",
      "type": "section-header",
      "title": "Feedback",
      "description": "Tell us about your experience"
    },
    {
      "id": "q2",
      "type": "linear-scale",
      "label": "How satisfied are you?",
      "min": 1,
      "max": 10,
      "minLabel": "Not satisfied",
      "maxLabel": "Very satisfied",
      "validation": { "required": true }
    }
  ]
}
```

## SurveyTemplateDataEntity型

`SurveyTemplateDataEntity`型は、実際のDynamoDBエンティティ構造を表します：

```typescript
type SurveyTemplateDataEntity = {
  // プライマリキー (Primary keys)
  pk: string;                    // パーティションキー (Partition key)
  sk: string;                    // ソートキー (Sort key)

  // エンティティ識別子 (Entity identifiers)
  id: string;                    // 一意の識別子 (Unique identifier)
  code: string;                  // テンプレートコード (Template code)
  name: string;                  // テンプレート名 (Template name)
  version: number;               // バージョン番号 (Version number)
  tenantCode: string;            // テナントコード (Tenant code)
  type: string;                  // エンティティタイプ (Entity type)

  // 監査フィールド（文字列） (Audit fields)
  createdAt?: string;            // 作成日時 (Creation timestamp)
  updatedAt?: string;            // 最終更新日時 (Last update timestamp)
  createdBy?: string;            // 作成者ユーザーID (Creator user ID)
  updatedBy?: string;            // 最終更新者ユーザーID (Last updater user ID)

  // オプションフィールド (Optional fields)
  cpk?: string;                  // コマンドパーティションキー (Command partition key)
  csk?: string;                  // コマンドソートキー (Command sort key)
  source?: string;               // ソース識別子 (Source identifier)
  requestId?: string;            // リクエストID (Request ID)
  createdIp?: string;            // 作成者IPアドレス (Creator IP address)
  updatedIp?: string;            // 更新者IPアドレス (Updater IP address)
  seq?: number;                  // シーケンス番号 (Sequence number)
  ttl?: number;                  // 有効期限 (Time to live)
  isDeleted?: boolean;           // 論理削除フラグ (Soft delete flag)

  // アンケートテンプレートデータ (Survey template data)
  attributes: {
    description?: string;        // テンプレート説明 (Template description)
    surveyTemplate: {            // アンケートテンプレートJSON構造 (Survey template JSON structure)
      [key: string]: unknown;
    };
  };
}
```

## バリデーションルール

バリデーションルールは`validation`オブジェクト内に判別共用体構造で定義されます：

```typescript
interface ValidationRules {
  required?: boolean;
  custom?: CustomValidationRule;  // short-textおよびlong-text質問用 (For short-text and long-text questions)
  shuffleOptions?: boolean;       // 選択質問用 - 選択肢の順序をランダム化 (For choice questions - randomize option order)
}

// カスタムバリデーションルール用の判別共用体 (Discriminated union for custom validation rules)
// Note: short-text supports all validation types (注意: short-textはすべてのバリデーションタイプをサポート)
// Note: long-text only supports LengthValidation and RegexValidation (注意: long-textはLengthValidationとRegexValidationのみサポート)
type CustomValidationRule =
  | NumberValidation   // short-text only (short-textのみ)
  | TextValidation     // short-text only (short-textのみ)
  | LengthValidation   // short-text and long-text (short-textとlong-text)
  | RegexValidation;   // short-text and long-text (short-textとlong-text)

interface NumberValidation {
  type: "number";
  rule: "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "between" | "not_between" | "is_number" | "is_whole";
  value?: number;
  value2?: number;  // 'between'および'not_between'ルール用 (For 'between' and 'not_between' rules)
  customError?: string;
}

interface TextValidation {
  type: "text";
  rule: "contains" | "not_contains" | "is_email" | "is_url";
  value?: string;
  customError?: string;
}

interface LengthValidation {
  type: "length";
  rule: "min" | "max";
  value: number;
  customError?: string;
}

interface RegexValidation {
  type: "regex";
  rule: "contains" | "not_contains" | "matches" | "not_matches";
  value: string;
  customError?: string;
}

// 複数選択質問用 (For multiple-choice questions)
interface MultipleChoiceValidationRule {
  rule: "min" | "max" | "exact";
  value: number;
  customError?: string;
}
```

メールバリデーションの例：

```json
{
  "id": "email",
  "type": "short-text",
  "label": "Enter your email",
  "validation": {
    "required": true,
    "custom": {
      "type": "text",
      "rule": "is_email",
      "customError": "Please enter a valid email address"
    }
  }
}
```

数値範囲バリデーションの例：

```json
{
  "id": "age",
  "type": "short-text",
  "label": "Enter your age",
  "validation": {
    "required": true,
    "custom": {
      "type": "number",
      "rule": "between",
      "value": 18,
      "value2": 120,
      "customError": "Age must be between 18 and 120"
    }
  }
}
```

複数選択バリデーション（最小/最大選択数）の例：

```json
{
  "id": "interests",
  "type": "multiple-choice",
  "label": "Select your interests (2-5 choices)",
  "options": [
    { "value": "sports", "label": "Sports" },
    { "value": "music", "label": "Music" },
    { "value": "reading", "label": "Reading" },
    { "value": "travel", "label": "Travel" },
    { "value": "cooking", "label": "Cooking" }
  ],
  "validation": {
    "required": true,
    "custom": {
      "rule": "min",
      "value": 2,
      "customError": "Please select at least 2 options"
    }
  }
}
```

## 環境変数

以下の環境変数を設定します：

| 変数 | 説明 | 必須 |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | REST APIエンドポイントのベースURL | はい |
| `NEXT_PUBLIC_TENANT_CODE` | x-tenant-codeヘッダー用のテナントコード（デフォルト：'common'） | いいえ |
| `NEXT_PUBLIC_AWS_APPSYNC_GRAPHQLENDPOINT` | AWS AppSync GraphQLエンドポイント | はい |
| `NEXT_PUBLIC_AWS_APPSYNC_APIKEY` | 認証用AWS AppSync APIキー | はい |
| `NEXT_PUBLIC_AWS_APPSYNC_REGION` | AppSync用のAWSリージョン | はい |

`.env.local`の設定例：

```bash
# REST API設定 (REST API Configuration)
NEXT_PUBLIC_API_URL=https://api.example.com

# テナント設定 (Tenant Configuration)
NEXT_PUBLIC_TENANT_CODE=my-tenant

# AWS AppSync設定 (AWS AppSync Configuration)
NEXT_PUBLIC_AWS_APPSYNC_GRAPHQLENDPOINT=https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
NEXT_PUBLIC_AWS_APPSYNC_APIKEY=da2-xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_AWS_APPSYNC_REGION=us-east-1
```

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
