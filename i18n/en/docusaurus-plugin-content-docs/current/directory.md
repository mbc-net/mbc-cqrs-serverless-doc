---
sidebar_position: 7
---

# Directory

Directory management functionality with S3 integration for the MBC CQRS Serverless framework.

## Installation

```bash
npm install @mbc-cqrs-serverless/directory
```

## Overview

The Directory package provides comprehensive file and folder management in a multi-tenant CQRS architecture. It integrates with Amazon S3 for file storage and supports granular access permissions.

## Features

- **Directory CRUD Operations**: Create, read, update, and delete folders and files
- **S3 Integration**: Full file management with Amazon S3
- **Access Permissions**: Granular permissions for specific folders and files
- **Multi-tenant Support**: Tenant-isolated directory management
- **Event-Driven Architecture**: Built on CQRS pattern with command/event handling
- **RESTful API**: Complete REST API for directory operations

## Basic Setup

### Module Configuration

```typescript
import { DirectoryModule } from '@mbc-cqrs-serverless/directory';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    DirectoryModule.forRoot({
      tableName: 'directory',
      s3Bucket: process.env.S3_BUCKET,
      region: 'ap-northeast-1',
    }),
  ],
})
export class AppModule {}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/directory/` | Search and list files and folders |
| POST | `/api/directory/` | Create a new file or folder |
| GET | `/api/directory/:id` | Get details for a specific file or folder |
| PUT | `/api/directory/:id` | Update a specific file or folder |
| DELETE | `/api/directory/:id` | Delete a specific file or folder |

## Creating Folders

```typescript
import { DirectoryService } from '@mbc-cqrs-serverless/directory';

@Injectable()
export class FolderService {
  constructor(private readonly directoryService: DirectoryService) {}

  async createFolder(name: string, parentId?: string): Promise<Directory> {
    return this.directoryService.create({
      name,
      type: 'folder',
      parentId,
    });
  }
}
```

## Uploading Files

```typescript
async uploadFile(
  file: Buffer,
  fileName: string,
  folderId: string,
): Promise<Directory> {
  return this.directoryService.create({
    name: fileName,
    type: 'file',
    parentId: folderId,
    content: file,
    contentType: 'application/pdf',
  });
}
```

## Listing Contents

```typescript
async listFolder(folderId: string): Promise<Directory[]> {
  return this.directoryService.list({
    parentId: folderId,
  });
}

async searchFiles(keyword: string): Promise<Directory[]> {
  return this.directoryService.search({
    keyword,
    type: 'file',
  });
}
```

## Downloading Files

```typescript
async downloadFile(fileId: string): Promise<Buffer> {
  const file = await this.directoryService.getById(fileId);
  return this.directoryService.download(file.s3Key);
}
```

## Managing Permissions

### Setting Permissions

```typescript
async setPermission(
  directoryId: string,
  userId: string,
  permission: 'read' | 'write' | 'admin',
): Promise<void> {
  await this.directoryService.setPermission({
    directoryId,
    userId,
    permission,
  });
}
```

### Checking Permissions

```typescript
async canAccess(
  directoryId: string,
  userId: string,
  action: 'read' | 'write',
): Promise<boolean> {
  return this.directoryService.checkPermission({
    directoryId,
    userId,
    action,
  });
}
```

## Moving and Copying

### Move Item

```typescript
async moveItem(itemId: string, newParentId: string): Promise<Directory> {
  return this.directoryService.move(itemId, newParentId);
}
```

### Copy Item

```typescript
async copyItem(itemId: string, newParentId: string): Promise<Directory> {
  return this.directoryService.copy(itemId, newParentId);
}
```

## Directory Structure

Example directory structure:

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

## Multi-tenant Isolation

Directories are automatically isolated by tenant:

```typescript
@Controller('api/directory')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get()
  @UseTenant()
  async list(@TenantContext() tenantId: string): Promise<Directory[]> {
    // Automatically scoped to tenant
    return this.directoryService.list();
  }
}
```

## Event Handling

Listen for directory events:

```typescript
import { DirectoryCreatedEvent } from '@mbc-cqrs-serverless/directory';

@EventsHandler(DirectoryCreatedEvent)
export class DirectoryCreatedHandler
  implements IEventHandler<DirectoryCreatedEvent> {
  async handle(event: DirectoryCreatedEvent): Promise<void> {
    console.log('Directory created:', event.directory.name);
    // Notify users, update indexes, etc.
  }
}
```

## Best Practices

1. **Use Folders for Organization**: Create a logical folder structure for easy navigation
2. **Set Permissions Early**: Configure permissions when creating directories
3. **Handle Large Files**: For large files, use presigned URLs for direct S3 upload
4. **Clean Up**: Implement retention policies for temporary files
5. **Audit Trail**: Use events to maintain an audit trail of all operations
