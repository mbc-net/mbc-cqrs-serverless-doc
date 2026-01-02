---
sidebar_position: 7
---

# {{Directory}}

{{Directory management functionality with S3 integration for the MBC CQRS Serverless framework.}}

## {{Installation}}

```bash
npm install @mbc-cqrs-serverless/directory
```

## {{Overview}}

{{The Directory package provides comprehensive file and folder management in a multi-tenant CQRS architecture. It integrates with Amazon S3 for file storage and supports granular access permissions.}}

## {{Features}}

- **{{Directory CRUD Operations}}**: {{Create, read, update, and delete folders and files}}
- **{{S3 Integration}}**: {{Full file management with Amazon S3}}
- **{{Access Permissions}}**: {{Granular permissions for specific folders and files}}
- **{{Multi-tenant Support}}**: {{Tenant-isolated directory management}}
- **{{Event-Driven Architecture}}**: {{Built on CQRS pattern with command/event handling}}
- **{{RESTful API}}**: {{Complete REST API for directory operations}}

## {{Basic Setup}}

### {{Module Configuration}}

```typescript
import { DirectoryStorageModule } from '@mbc-cqrs-serverless/directory';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    DirectoryStorageModule.register({
      enableController: true,  // Enable REST API endpoints
    }),
  ],
})
export class AppModule {}
```

## {{API Endpoints}}

| {{Method}} | {{Endpoint}} | {{Description}} |
|--------|----------|-------------|
| GET | `/api/directory/` | {{Search and list files and folders}} |
| POST | `/api/directory/` | {{Create a new file or folder}} |
| GET | `/api/directory/:id` | {{Get details for a specific file or folder}} |
| PUT | `/api/directory/:id` | {{Update a specific file or folder}} |
| DELETE | `/api/directory/:id` | {{Delete a specific file or folder}} |

## {{Creating Folders}}

```typescript
import { DirectoryStorageService } from '@mbc-cqrs-serverless/directory';

@Injectable()
export class FolderService {
  constructor(private readonly directoryService: DirectoryStorageService) {}

  async createFolder(
    tenantCode: string,
    dto: CreateDirectoryDto,
    invokeContext: IInvoke,
  ): Promise<DirectoryEntity> {
    return this.directoryService.create(tenantCode, dto, { invokeContext });
  }
}
```

## {{Uploading Files}}

```typescript
async uploadFile(
  tenantCode: string,
  dto: CreateDirectoryDto,
  invokeContext: IInvoke,
): Promise<DirectoryEntity> {
  // File upload is handled through the create method with file content
  return this.directoryService.create(tenantCode, dto, { invokeContext });
}
```

## {{Listing Contents}}

```typescript
async getDirectory(key: DetailKey): Promise<DirectoryEntity> {
  return this.directoryService.findOne(key);
}

async getDirectoryHistory(key: DetailKey): Promise<DirectoryEntity[]> {
  return this.directoryService.findHistory(key);
}
```

## {{File Operations}}

```typescript
// Get file attributes
async getFileAttributes(key: DetailKey): Promise<any> {
  return this.directoryService.getItemAttributes(key);
}

// Remove file from S3
async removeFile(s3Key: string): Promise<void> {
  await this.directoryService.removeFile(s3Key);
}
```

## {{Managing Permissions}}

### {{Updating Permissions}}

```typescript
async updatePermission(
  key: DetailKey,
  dto: UpdatePermissionDto,
  invokeContext: IInvoke,
): Promise<DirectoryEntity> {
  return this.directoryService.updatePermission(key, dto, { invokeContext });
}
```

### {{Checking Permissions}}

```typescript
async hasPermission(
  key: DetailKey,
  userId: string,
  action: DirectoryAction,
): Promise<boolean> {
  return this.directoryService.hasPermission(key, userId, action);
}

async getEffectiveRole(
  key: DetailKey,
  userId: string,
): Promise<DirectoryRole | null> {
  return this.directoryService.getEffectiveRole(key, userId);
}
```

## {{Moving and Copying}}

### {{Move Item}}

```typescript
async moveItem(
  key: DetailKey,
  dto: MoveDirectoryDto,
  invokeContext: IInvoke,
): Promise<DirectoryEntity> {
  return this.directoryService.move(key, dto, { invokeContext });
}
```

### {{Copy Item}}

```typescript
async copyItem(
  key: DetailKey,
  dto: CopyDirectoryDto,
  invokeContext: IInvoke,
): Promise<DirectoryEntity> {
  return this.directoryService.copy(key, dto, { invokeContext });
}
```

## {{Directory Structure}}

{{Example directory structure:}}

```
/
├── documents/
│   ├── reports/
│   │   ├── 2024-Q1-report.pdf
│   │   └── 2024-Q2-report.pdf
│   └── contracts/
│       └── contract-001.pdf
├── images/
│   ├── logo.png
│   └── banner.jpg
└── templates/
    └── invoice-template.docx
```

## {{Multi-tenant Isolation}}

{{Directories are automatically isolated by tenant through the invoke context:}}

```typescript
@Controller('api/directory')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryStorageService) {}

  @Get(':pk/:sk')
  async findOne(
    @INVOKE_CONTEXT() invokeContext: IInvoke,
    @Param('pk') pk: string,
    @Param('sk') sk: string,
  ): Promise<DirectoryEntity> {
    // Tenant isolation is handled through the pk structure
    return this.directoryService.findOne({ pk, sk });
  }
}
```

## {{Event Handling}}

{{Handle directory data synchronization using data sync handlers:}}

```typescript
import { IDataSyncHandler, DataEntity } from '@mbc-cqrs-serverless/core';

export class DirectoryDataSyncHandler implements IDataSyncHandler {
  async onCreated(data: DataEntity): Promise<void> {
    console.log('Directory created:', data.name);
    // Sync to RDS, notify users, update indexes, etc.
  }

  async onUpdated(data: DataEntity): Promise<void> {
    console.log('Directory updated:', data.name);
  }

  async onDeleted(data: DataEntity): Promise<void> {
    console.log('Directory deleted:', data.name);
  }
}
```

## {{Best Practices}}

1. **{{Use Folders for Organization}}**: {{Create a logical folder structure for easy navigation}}
2. **{{Set Permissions Early}}**: {{Configure permissions when creating directories}}
3. **{{Handle Large Files}}**: {{For large files, use presigned URLs for direct S3 upload}}
4. **{{Clean Up}}**: {{Implement retention policies for temporary files}}
5. **{{Audit Trail}}**: {{Use events to maintain an audit trail of all operations}}
