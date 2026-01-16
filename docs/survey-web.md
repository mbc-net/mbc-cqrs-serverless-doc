---
description: {{Learn about the Survey Web package for building survey and questionnaire UI components.}}
---

# {{Survey Web}}

{{Frontend component library for survey template management and form rendering in MBC CQRS Serverless applications.}}

## {{Installation}}

```bash
npm install @mbc-cqrs-serverless/survey-web
```

## {{Overview}}

{{The Survey Web package (`@mbc-cqrs-serverless/survey-web`) provides React components for creating, editing, and rendering survey templates. It supports multiple question types, drag-and-drop section reordering, and real-time collaboration through AWS AppSync.}}

## {{Features}}

- **{{Template Management}}**: {{Create, edit, and delete survey templates}}
- **{{Multiple Question Types}}**: {{9 built-in question types for various data collection needs}}
- **{{Drag and Drop}}**: {{Reorder sections and questions with @dnd-kit}}
- **{{Form Validation}}**: {{Zod-based validation with custom rules}}
- **{{Real-time Updates}}**: {{AWS AppSync integration for collaborative editing}}
- **{{Responsive Design}}**: {{Mobile-friendly survey forms}}
- **{{Section-based Structure}}**: {{Organize questions into logical sections}}

## {{Main Components}}

### {{SurveyTemplatePage}}

{{Displays a list of survey templates with search and management capabilities.}}

```tsx
import { SurveyTemplatePage } from "@mbc-cqrs-serverless/survey-web/SurveyTemplatePage";
import "@mbc-cqrs-serverless/survey-web/styles.css";

export default function SurveyTemplatesPage() {
  return <SurveyTemplatePage />;
}
```

### {{EditSurveyTemplatePage}}

{{Editor for creating and modifying survey templates with drag-and-drop functionality.}}

{{This component uses `useParams()` from `next/navigation` internally to get the survey ID from the URL. For new surveys (create mode), render on a route without an ID parameter. For editing existing surveys, render on a route with an ID parameter (e.g., `/surveys/[id]/edit`).}}

```tsx
import { EditSurveyTemplatePage } from "@mbc-cqrs-serverless/survey-web/EditSurveyTemplatePage";

// {{Route: /surveys/new (create mode)}}
// {{Route: /surveys/[id]/edit (edit mode - ID extracted from URL via useParams)}}
export default function EditSurveyPage() {
  return <EditSurveyTemplatePage />;
}
```

### {{SurveyForm}}

{{Renders a survey template as a fillable form for respondents.}}

```tsx
import { SurveyForm } from "@mbc-cqrs-serverless/survey-web/SurveyForm";

// {{Answer values can be string (single value) or string[] (multiple choice)}}
type SurveyAnswers = Record<string, string | string[] | undefined>;

// {{Define schema type based on the Survey Template Structure section below}}
interface SurveySchema {
  title: string;
  description?: string;
  items: SurveyItem[];
}

interface Props {
  schema: SurveySchema;
}

export default function SurveyResponsePage({ schema }: Props) {
  const handleSubmit = (answers: SurveyAnswers) => {
    console.log("Survey answers:", answers);
  };

  return (
    <SurveyForm
      schema={schema}
      onSubmit={handleSubmit}
      disabled={false}
    >
      {/* {{Optional: Custom content rendered inside the current section}} */}
    </SurveyForm>
  );
}
```

| {{Prop}} | {{Type}} | {{Required}} | {{Description}} |
|----------|----------|--------------|-----------------|
| `schema` | `SurveySchema` | {{Yes}} | {{The survey template schema to render}} |
| `onSubmit` | `(answers: SurveyAnswers) => void` | {{Yes}} | {{Callback when survey is submitted with all answers}} |
| `disabled` | `boolean` | {{No}} | {{Disable form interactions (default: false)}} |
| `children` | `React.ReactNode` | {{No}} | {{Optional content rendered inside the current section}} |

## {{Question Types}}

{{The Survey Web package supports 9 question types:}}

### {{1. Short Text}}

{{Single-line text input for brief responses.}}

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

### {{2. Long Text}}

{{Multi-line text area for detailed responses.}}

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

### {{3. Single Choice}}

{{Radio button selection for mutually exclusive options.}}

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

### {{4. Multiple Choice}}

{{Checkbox selection for multiple options.}}

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

### {{5. Dropdown}}

{{Select dropdown for choosing from a list.}}

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

### {{6. Linear Scale}}

{{Numeric scale for rating responses.}}

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

### {{7. Rating}}

{{Configurable star/heart/thumb rating input with 2-10 levels.}}

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

| {{Property}} | {{Type}} | {{Default}} | {{Description}} |
|----------|------|---------|-------------|
| `levels` | `number` | `5` | {{Number of rating levels (2-10)}} |
| `symbol` | `'star' \| 'heart' \| 'thumb'` | `'star'` | {{Symbol used for rating display}} |

### {{8. Date}}

{{Date picker for date selection with configurable options.}}

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

| {{Property}} | {{Type}} | {{Default}} | {{Description}} |
|----------|------|---------|-------------|
| `includeTime` | `boolean` | `false` | {{Include time selection along with date}} |
| `includeYear` | `boolean` | `true` | {{Include year in date selection}} |

### {{9. Time}}

{{Time picker for time or duration input.}}

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

| {{Property}} | {{Type}} | {{Default}} | {{Description}} |
|----------|------|---------|-------------|
| `answerType` | `'time' \| 'duration'` | `'time'` | {{Input mode: specific time or duration}} |

## {{Custom Hooks}}

:::warning {{Internal Hooks}}
{{The hooks documented below (`useSurveyTemplates`, `useEditSurveyTemplate`, `useDeleteSurveyTemplate`) are internal hooks used by the page components. They are NOT exported from the main package index and cannot be imported directly. The import paths shown are for illustration purposes only. Use the page components (`SurveyTemplatePage`, `EditSurveyTemplatePage`) instead for standard use cases.}}
:::

### {{useSurveyTemplates}}

{{Fetch and manage survey templates with pagination and search support.}}

```tsx
// {{IMPORTANT: This hook is internal and cannot be imported directly.}}
// {{This code example is for reference only to show the hook's interface.}}
// {{Use SurveyTemplatePage component instead for standard use cases.}}

function TemplateList() {
  const {
    surveys,        // {{Array of survey templates (SurveyTemplateDataEntity[])}}
    totalItems,     // {{Total number of templates}}
    isLoading,
    error,          // {{Error | null}}
    refetch         // {{() => Promise<void> - Function to refresh the list}}
  } = useSurveyTemplates({
    page: 1,
    pageSize: 10,
    keyword: "",           // {{Optional: search keyword}}
    orderBy: "createdAt",  // {{Optional: sort field}}
    orderType: "desc"      // {{Optional: sort direction ('asc' | 'desc')}}
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>{{Total}}: {totalItems}</p>
      <ul>
        {surveys.map((survey) => (
          <li key={survey.id}>{survey.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### {{useEditSurveyTemplate}}

{{Hook for editing survey templates with schema management and submission handling.}}

```tsx
// {{IMPORTANT: This hook is internal and cannot be imported directly.}}
// {{This code example is for reference only to show the hook's interface.}}
// {{Use EditSurveyTemplatePage component instead for standard use cases.}}

function TemplateEditor({ id }: { id?: string }) {
  const {
    surveyData,           // {{Current survey data from server (SurveyTemplateDataEntity | null)}}
    currentSchema,        // {{Current editable schema (SurveySchemaType | null)}}
    originalSchema,       // {{Original schema for change detection (SurveySchemaType | null)}}
    isLoading,
    isSubmitting,
    error,
    setCurrentSchema,     // {{Function to update current schema}}
    handleCreateSurvey,   // {{(schema: SurveySchemaType) => Promise<void> - Create new survey}}
    handleUpdateSurvey,   // {{(schema: SurveySchemaType) => Promise<void> - Update existing survey}}
    retryFetchSurvey,     // {{() => Promise<void> - Retry fetching survey data}}
    isSchemaChanged,      // {{boolean - True if schema differs from original}}
    isButtonDisabled,     // {{boolean - True if submit should be disabled}}
    submitButtonRef       // {{React.RefObject<HTMLButtonElement> - Ref for submit button}}
  } = useEditSurveyTemplate({ id });

  const handleSave = async () => {
    if (!currentSchema) return;
    if (id) {
      await handleUpdateSurvey(currentSchema);
    } else {
      await handleCreateSurvey(currentSchema);
    }
  };

  return (
    <div>
      {/* {{Editor UI}} */}
      <button
        ref={submitButtonRef}
        onClick={handleSave}
        disabled={isButtonDisabled}
      >
        {isSubmitting ? "{{Saving...}}" : "{{Save}}"}
      </button>
    </div>
  );
}
```

### {{useDeleteSurveyTemplate}}

{{Hook for deleting survey templates with success callback.}}

```tsx
// {{IMPORTANT: This hook is internal and cannot be imported directly.}}
// {{This code example is for reference only to show the hook's interface.}}

function DeleteButton({ surveyId }: { surveyId: string }) {
  const {
    handleDeleteSurvey,  // {{(id: string) => Promise<void> - Delete survey by ID}}
    isDeleting           // {{boolean - True while deletion is in progress}}
  } = useDeleteSurveyTemplate({
    onSuccess: () => {
      console.log("{{Survey deleted successfully}}");
      // {{Navigate back to list or refresh}}
    }
  });

  return (
    <button
      onClick={() => handleDeleteSurvey(surveyId)}
      disabled={isDeleting}
    >
      {{Delete}}
    </button>
  );
}
```

## {{Survey Template Structure}}

{{Survey templates use a flat list structure with section headers:}}

```typescript
interface SurveySchema {
  title: string;
  description?: string;
  items: SurveyItem[];  // {{Flat list of section headers and questions}}
}

// {{Section header item - acts as a bookmark or page break}}
interface SectionHeader {
  id: string;
  type: "section-header";
  title: string;
  description?: string;
  action?: {
    type: "submit";
  } | {
    type: "jump";
    targetSectionId: string;  // {{ID of another section-header for conditional branching}}
  };
}

// {{Question item}}
interface Question {
  id: string;
  type: QuestionType;  // {{short-text, long-text, single-choice, etc.}}
  label: string;
  description?: string;
  options?: QuestionOption[];  // {{For choice-based questions}}
  validation?: ValidationRules;
}

// {{Option for choice-based questions}}
interface QuestionOption {
  value: string;        // {{Unique value for the option}}
  label: string;        // {{Display label for the option}}
  nextSectionId?: string;  // {{ID of section to jump to when this option is selected (for conditional branching)}}
  isOther?: boolean;    // {{If true, shows a text input for custom "Other" response}}
}

// {{Union of all item types}}
type SurveyItem = SectionHeader | Question;
```

{{Example survey structure:}}

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

## {{SurveyTemplateDataEntity Type}}

{{The `SurveyTemplateDataEntity` type represents the actual DynamoDB entity structure:}}

```typescript
type SurveyTemplateDataEntity = {
  // {{Primary keys}}
  pk: string;                    // {{Partition key}}
  sk: string;                    // {{Sort key}}

  // {{Entity identifiers}}
  id: string;                    // {{Unique identifier}}
  code: string;                  // {{Template code}}
  name: string;                  // {{Template name}}
  version: number;               // {{Version number}}
  tenantCode: string;            // {{Tenant code}}
  type: string;                  // {{Entity type}}

  // {{Audit fields (as strings)}}
  createdAt?: string;            // {{Creation timestamp}}
  updatedAt?: string;            // {{Last update timestamp}}
  createdBy?: string;            // {{Creator user ID}}
  updatedBy?: string;            // {{Last updater user ID}}

  // {{Optional fields}}
  cpk?: string;                  // {{Command partition key}}
  csk?: string;                  // {{Command sort key}}
  source?: string;               // {{Source identifier}}
  requestId?: string;            // {{Request ID}}
  createdIp?: string;            // {{Creator IP address}}
  updatedIp?: string;            // {{Updater IP address}}
  seq?: number;                  // {{Sequence number}}
  ttl?: number;                  // {{Time to live}}
  isDeleted?: boolean;           // {{Soft delete flag}}

  // {{Survey template data}}
  attributes: {
    description?: string;        // {{Template description}}
    surveyTemplate: {            // {{Survey template JSON structure}}
      [key: string]: unknown;
    };
  };
}
```

## {{Validation Rules}}

{{Validation rules are defined inside the `validation` object with a discriminated union structure:}}

```typescript
interface ValidationRules {
  required?: boolean;
  custom?: CustomValidationRule;  // {{For short-text and long-text questions}}
  shuffleOptions?: boolean;       // {{For choice questions - randomize option order}}
}

// {{Discriminated union for custom validation rules}}
// {{Note: short-text supports all validation types}}
// {{Note: long-text only supports LengthValidation and RegexValidation}}
type CustomValidationRule =
  | NumberValidation   // {{short-text only}}
  | TextValidation     // {{short-text only}}
  | LengthValidation   // {{short-text and long-text}}
  | RegexValidation;   // {{short-text and long-text}}

interface NumberValidation {
  type: "number";
  rule: "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "between" | "not_between" | "is_number" | "is_whole";
  value?: number;
  value2?: number;  // {{For 'between' and 'not_between' rules}}
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

// {{For multiple-choice questions}}
interface MultipleChoiceValidationRule {
  rule: "min" | "max" | "exact";
  value: number;
  customError?: string;
}
```

{{Example with email validation:}}

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

{{Example with number range validation:}}

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

{{Example with multiple choice validation (min/max selections):}}

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

## {{Environment Variables}}

{{Configure the following environment variables:}}

| {{Variable}} | {{Description}} | {{Required}} |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | {{Base URL for REST API endpoints}} | {{Yes}} |
| `NEXT_PUBLIC_TENANT_CODE` | {{Tenant code for x-tenant-code header (default: 'common')}} | {{No}} |
| `NEXT_PUBLIC_AWS_APPSYNC_GRAPHQLENDPOINT` | {{AWS AppSync GraphQL endpoint}} | {{Yes}} |
| `NEXT_PUBLIC_AWS_APPSYNC_APIKEY` | {{AWS AppSync API key for authentication}} | {{Yes}} |
| `NEXT_PUBLIC_AWS_APPSYNC_REGION` | {{AWS region for AppSync}} | {{Yes}} |

{{Example `.env.local` configuration:}}

```bash
# {{REST API Configuration}}
NEXT_PUBLIC_API_URL=https://api.example.com

# {{Tenant Configuration}}
NEXT_PUBLIC_TENANT_CODE=my-tenant

# {{AWS AppSync Configuration}}
NEXT_PUBLIC_AWS_APPSYNC_GRAPHQLENDPOINT=https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
NEXT_PUBLIC_AWS_APPSYNC_APIKEY=da2-xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_AWS_APPSYNC_REGION=us-east-1
```

## {{Styling}}

{{Import the package styles in your application:}}

```tsx
// {{In your layout or entry file}}
import "@mbc-cqrs-serverless/survey-web/styles.css";
```

{{The components use Tailwind CSS. Ensure your project has Tailwind CSS configured with the following requirements:}}

- {{Tailwind CSS 3.x}}
- {{tailwindcss-animate plugin}}

## {{Dependencies}}

{{Key dependencies used by this package:}}

- {{React 18.x}}
- {{Next.js 14.x}}
- {{@dnd-kit for drag and drop}}
- {{Apollo Client}}
- {{Radix UI components}}
- {{Tailwind CSS 3.x}}
- {{react-hook-form}}
- {{Zod for validation}}
- {{date-fns for date handling}}
- {{lucide-react for icons}}
