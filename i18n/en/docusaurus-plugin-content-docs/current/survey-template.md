---
sidebar_position: 8
---

# Survey Template

Survey template management functionality for the MBC CQRS Serverless framework.

## Installation

```bash
npm install @mbc-cqrs-serverless/survey-template
```

## Overview

The Survey Template package provides comprehensive survey template management in a multi-tenant CQRS architecture. It enables the creation, management, and storage of survey templates with flexible JSON-based definitions supporting various question types.

## Features

- **Survey Template CRUD Operations**: Create, read, update, and delete survey templates
- **Multi-tenant Support**: Tenant-isolated survey template management
- **Flexible Survey Structure**: JSON-based survey template definitions
- **Various Question Types**: Support for text, multiple choice, rating, and more
- **Search and Filtering**: Advanced search capabilities with keyword matching
- **Event-Driven Architecture**: Built on CQRS pattern with command/event handling
- **RESTful API**: Complete REST API for survey template operations

## Basic Setup

### Module Configuration

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

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/survey-template/` | Search and list survey templates |
| POST | `/api/survey-template/` | Create a new survey template |
| GET | `/api/survey-template/:id` | Get a specific survey template |
| PUT | `/api/survey-template/:id` | Update a survey template |
| DELETE | `/api/survey-template/:id` | Delete a survey template |

## Creating a Survey Template

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

## Question Types

### Text Question

```json
{
  "type": "text",
  "text": "Please describe your experience",
  "required": true,
  "maxLength": 1000,
  "placeholder": "Enter your response..."
}
```

### Multiple Choice

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

### Rating Scale

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

### Yes/No Question

```json
{
  "type": "boolean",
  "text": "Would you recommend us to a friend?",
  "required": true
}
```

### Date Question

```json
{
  "type": "date",
  "text": "When did you first use our service?",
  "required": false,
  "minDate": "2020-01-01",
  "maxDate": "today"
}
```

## Survey Template Structure

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

## Searching Templates

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

## Updating Templates

```typescript
async updateTemplate(
  id: string,
  updates: Partial<SurveyTemplate>,
): Promise<SurveyTemplate> {
  return this.surveyTemplateService.update(id, updates);
}
```

## Cloning Templates

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

## Multi-tenant Usage

Templates are automatically isolated by tenant:

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

## Event Handling

Listen for template events:

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

## Best Practices

1. **Use Sections**: Organize questions into logical sections for better user experience
2. **Validate Questions**: Ensure required fields are properly marked
3. **Limit Options**: For multiple choice, keep options to a reasonable number
4. **Version Templates**: Create new versions instead of modifying existing templates in use
5. **Test Templates**: Preview templates before deployment
