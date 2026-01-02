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
    SurveyTemplateModule.register({
      enableController: true,  // Enable REST API endpoints
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

  async createTemplate(
    tenantCode: string,
    dto: CreateSurveyTemplateDto,
    invokeContext: IInvoke,
  ): Promise<SurveyTemplateEntity> {
    return this.surveyTemplateService.create(tenantCode, dto, { invokeContext });
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
async searchTemplates(
  tenantCode: string,
  searchDto: SearchDto,
): Promise<SurveyTemplateEntity[]> {
  return this.surveyTemplateService.searchData(tenantCode, searchDto);
}

async getTemplate(key: DetailKey): Promise<SurveyTemplateEntity> {
  return this.surveyTemplateService.findOne(key);
}
```

## Updating Templates

```typescript
async updateTemplate(
  key: DetailKey,
  dto: UpdateSurveyTemplateDto,
  invokeContext: IInvoke,
): Promise<SurveyTemplateEntity> {
  return this.surveyTemplateService.update(key, dto, { invokeContext });
}
```

## Deleting Templates

```typescript
async deleteTemplate(
  key: DetailKey,
  invokeContext: IInvoke,
): Promise<SurveyTemplateEntity> {
  return this.surveyTemplateService.remove(key, { invokeContext });
}
```

## Multi-tenant Usage

Templates are automatically isolated by tenant through the invoke context:

```typescript
@Controller('api/survey-template')
export class SurveyTemplateController {
  constructor(
    private readonly surveyTemplateService: SurveyTemplateService,
  ) {}

  @Get()
  async searchData(
    @Query() searchDto: SearchDto,
    @INVOKE_CONTEXT() invokeContext: IInvoke,
  ): Promise<SurveyTemplateEntity[]> {
    const { tenantCode } = getUserContext(invokeContext);
    return this.surveyTemplateService.searchData(tenantCode, searchDto);
  }
}
```

## Event Handling

Handle survey template data synchronization using data sync handlers:

```typescript
import { IDataSyncHandler, DataEntity } from '@mbc-cqrs-serverless/core';

export class SurveyTemplateDataSyncHandler implements IDataSyncHandler {
  async onCreated(data: DataEntity): Promise<void> {
    console.log('Survey template created:', data.name);
    // Sync to RDS, notify users, etc.
  }

  async onUpdated(data: DataEntity): Promise<void> {
    console.log('Survey template updated:', data.name);
  }

  async onDeleted(data: DataEntity): Promise<void> {
    console.log('Survey template deleted:', data.name);
  }
}
```

## Best Practices

1. **Use Sections**: Organize questions into logical sections for better user experience
2. **Validate Questions**: Ensure required fields are properly marked
3. **Limit Options**: For multiple choice, keep options to a reasonable number
4. **Version Templates**: Create new versions instead of modifying existing templates in use
5. **Test Templates**: Preview templates before deployment
