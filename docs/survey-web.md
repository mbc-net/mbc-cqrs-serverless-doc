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

## {{Question Types}}

{{The Survey Web package supports 9 question types:}}

### {{1. Short Text}}

{{Single-line text input for brief responses.}}

```json
{
  "type": "short_text",
  "text": "What is your name?",
  "required": true,
  "placeholder": "Enter your name"
}
```

### {{2. Long Text}}

{{Multi-line text area for detailed responses.}}

```json
{
  "type": "long_text",
  "text": "Please describe your experience",
  "required": false,
  "maxLength": 1000
}
```

### {{3. Single Choice}}

{{Radio button selection for mutually exclusive options.}}

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

### {{4. Multiple Choice}}

{{Checkbox selection for multiple options.}}

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

### {{5. Dropdown}}

{{Select dropdown for choosing from a list.}}

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

### {{6. Linear Scale}}

{{Numeric scale for rating responses.}}

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

### {{7. Rating}}

{{5-star rating input.}}

```json
{
  "type": "rating",
  "text": "Rate your overall satisfaction",
  "required": true
}
```

### {{8. Date}}

{{Date picker for date selection.}}

```json
{
  "type": "date",
  "text": "When did you first use our service?",
  "required": false
}
```

### {{9. Time}}

{{Time picker for time selection.}}

```json
{
  "type": "time",
  "text": "What time works best for a callback?",
  "required": false
}
```

## {{Custom Hooks}}

### {{useSurveyTemplates}}

{{Fetch and manage survey templates.}}

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

### {{useEditSurveyTemplate}}

{{Hook for editing survey templates.}}

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

### {{useDeleteSurveyTemplate}}

{{Hook for deleting survey templates.}}

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

## {{Survey Template Structure}}

{{Survey templates follow this structure:}}

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

## {{Validation Rules}}

{{Define custom validation rules for questions:}}

```typescript
interface ValidationRule {
  type: "min_length" | "max_length" | "pattern" | "email" | "number_range";
  value: string | number;
  message: string;
}
```

{{Example with validation:}}

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

## {{Environment Variables}}

{{Configure the following environment variables:}}

| {{Variable}} | {{Description}} |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | {{Base URL for REST API endpoints}} |
| `NEXT_PUBLIC_AWS_APPSYNC_GRAPHQLENDPOINT` | {{AWS AppSync GraphQL endpoint}} |
| `NEXT_PUBLIC_AWS_APPSYNC_REGION` | {{AWS region for AppSync}} |

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
