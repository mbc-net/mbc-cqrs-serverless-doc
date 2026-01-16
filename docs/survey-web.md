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

```tsx
import { EditSurveyTemplatePage } from "@mbc-cqrs-serverless/survey-web/EditSurveyTemplatePage";

export default function EditSurveyPage({ params }: { params: { id: string } }) {
  return <EditSurveyTemplatePage id={params.id} />;
}
```

### {{SurveyForm}}

{{Renders a survey template as a fillable form for respondents.}}

```tsx
import { SurveyForm } from "@mbc-cqrs-serverless/survey-web/SurveyForm";

export default function SurveyResponsePage({ schema }) {
  const handleSubmit = (responses) => {
    console.log("Survey responses:", responses);
  };

  return (
    <SurveyForm
      schema={schema}
      onSubmit={handleSubmit}
    />
  );
}
```

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

### {{useSurveyTemplates}}

{{Fetch and manage survey templates with pagination and search support.}}

```tsx
import { useSurveyTemplates } from "@mbc-cqrs-serverless/survey-web";

function TemplateList() {
  const {
    surveys,        // {{Array of survey templates}}
    totalItems,     // {{Total number of templates}}
    isLoading,
    error,
    refetch         // {{Function to refresh the list}}
  } = useSurveyTemplates({
    page: 1,
    pageSize: 10,
    keyword: "",           // {{Optional: search keyword}}
    orderBy: "createdAt",  // {{Optional: sort field}}
    orderType: "DESC"      // {{Optional: sort direction}}
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
import { useEditSurveyTemplate } from "@mbc-cqrs-serverless/survey-web";

function TemplateEditor({ id }: { id?: string }) {
  const {
    surveyData,           // {{Current survey data from server}}
    currentSchema,        // {{Current editable schema}}
    originalSchema,       // {{Original schema for change detection}}
    isLoading,
    isSubmitting,
    error,
    setCurrentSchema,     // {{Function to update current schema}}
    handleCreateSurvey,   // {{Function to create new survey}}
    handleUpdateSurvey,   // {{Function to update existing survey}}
    retryFetchSurvey,     // {{Function to retry fetching survey data}}
    isSchemaChanged,      // {{Boolean indicating if schema has changes}}
    isButtonDisabled,     // {{Boolean for submit button disabled state}}
    submitButtonRef       // {{Ref for submit button}}
  } = useEditSurveyTemplate({ id });

  const handleSave = async () => {
    if (id) {
      await handleUpdateSurvey();
    } else {
      await handleCreateSurvey();
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
import { useDeleteSurveyTemplate } from "@mbc-cqrs-serverless/survey-web";

function DeleteButton({ surveyId }: { surveyId: string }) {
  const { handleDeleteSurvey, isDeleting } = useDeleteSurveyTemplate({
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
  options?: Option[];  // {{For choice-based questions}}
  validation?: ValidationRules;
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
type CustomValidationRule =
  | NumberValidation
  | TextValidation
  | LengthValidation
  | RegexValidation;

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

{{Import the package styles:}}

```tsx
import "@mbc-cqrs-serverless/survey-web/styles.css";
```

{{The components use Tailwind CSS. Ensure your project has Tailwind CSS configured.}}

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
