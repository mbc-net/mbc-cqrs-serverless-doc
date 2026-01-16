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
- **{{Version History}}**: {{Track and restore previous versions of files and folders}}

## {{Basic Setup}}

### {{Module Configuration}}

```typescript
import { DirectoryStorageModule } from '@mbc-cqrs-serverless/directory';
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    DirectoryStorageModule.register({
      enableController: true,  // {{Enable REST API endpoints}}
      prismaService: PrismaService,  // {{Required when enableController is true}}
      dataSyncHandlers: [],  // {{Optional data sync handlers}}
    }),
  ],
})
export class AppModule {}
```

## {{API Endpoints}}

| {{Method}} | {{Endpoint}} | {{Description}} |
|--------|----------|-------------|
| POST | `/api/directory/` | {{Create a new file or folder}} |
| GET | `/api/directory/summary` | {{Get tenant file size summary}} |
| GET | `/api/directory/:id` | {{Get details for a specific file or folder}} |
| GET | `/api/directory/:id/history` | {{Get version history of a file or folder}} |
| POST | `/api/directory/:id/history/:version/restore` | {{Restore a specific version}} |
| PUT | `/api/directory/:id/restore` | {{Restore a temporarily deleted item}} |
| PATCH | `/api/directory/:id` | {{Update a specific file or folder}} |
| PATCH | `/api/directory/:id/permission` | {{Update permissions for a file or folder}} |
| PATCH | `/api/directory/:id/rename` | {{Rename a file or folder}} |
| PATCH | `/api/directory/:id/copy` | {{Copy a file or folder}} |
| PATCH | `/api/directory/:id/move` | {{Move a file or folder}} |
| DELETE | `/api/directory/:id` | {{Soft delete a file or folder}} |
| DELETE | `/api/directory/:id/bin` | {{Permanently delete a file and remove from S3}} |
| POST | `/api/directory/file/view` | {{Generate a presigned URL for viewing a file}} |
| POST | `/api/directory/file` | {{Generate a presigned URL for uploading a file}} |

## {{Creating Folders}}

```typescript
import { DirectoryService, DirectoryCreateDto, DirectoryDataEntity } from '@mbc-cqrs-serverless/directory';
import { IInvoke } from '@mbc-cqrs-serverless/core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FolderService {
  constructor(private readonly directoryService: DirectoryService) {}

  async createFolder(
    createDto: DirectoryCreateDto,
    invokeContext: IInvoke,
  ): Promise<DirectoryDataEntity> {
    return this.directoryService.create(createDto, { invokeContext });
  }
}
```

## {{Uploading Files}}

```typescript
async uploadFile(
  createDto: DirectoryCreateDto,
  invokeContext: IInvoke,
): Promise<DirectoryDataEntity> {
  // {{File upload is handled through the create method with file content}}
  return this.directoryService.create(createDto, { invokeContext });
}
```

## {{Listing Contents}}

```typescript
async getDirectory(
  detailDto: DetailDto,
  invokeContext: IInvoke,
  queryDto: DirectoryDetailDto,
): Promise<DirectoryDataEntity> {
  return this.directoryService.findOne(detailDto, { invokeContext }, queryDto);
}

async getDirectoryHistory(
  detailDto: DetailDto,
  invokeContext: IInvoke,
  queryDto: DirectoryDetailDto,
): Promise<DirectoryDataListEntity> {
  return this.directoryService.findHistory(detailDto, { invokeContext }, queryDto);
}
```

## {{File Operations}}

```typescript
// {{Get file attributes}}
async getFileAttributes(detailDto: DetailDto): Promise<DirectoryAttributes> {
  return this.directoryService.getItemAttributes(detailDto);
}

// {{Get file item}}
async getFile(detailDto: DetailDto): Promise<DirectoryDataEntity> {
  return this.directoryService.getItem(detailDto);
}

// {{Soft delete (marks as deleted)}}
async removeItem(
  detailDto: DetailDto,
  invokeContext: IInvoke,
  queryDto: DirectoryDetailDto,
): Promise<DirectoryDataEntity> {
  return this.directoryService.remove(detailDto, { invokeContext }, queryDto);
}

// {{Permanently remove file and delete from S3}}
async removeFile(
  detailDto: DetailDto,
  invokeContext: IInvoke,
  queryDto: DirectoryDetailDto,
): Promise<DirectoryDataEntity> {
  return this.directoryService.removeFile(detailDto, { invokeContext }, queryDto);
}
```

## {{Renaming Items}}

```typescript
import { DirectoryRenameDto } from '@mbc-cqrs-serverless/directory';

async renameItem(
  detailDto: DetailDto,
  renameDto: DirectoryRenameDto,
  invokeContext: IInvoke,
): Promise<DirectoryDataEntity> {
  return this.directoryService.rename(detailDto, renameDto, { invokeContext });
}
```

## {{Managing Permissions}}

### {{Permission Types}}

{{The directory package supports different permission types:}}

```typescript
enum FilePermission {
  GENERAL = 'GENERAL',      // {{General access for everyone}}
  RESTRICTED = 'RESTRICTED', // {{Restricted to specific users}}
  DOMAIN = 'DOMAIN',        // {{Restricted to specific email domain}}
  TENANT = 'TENANT',        // {{Restricted to tenant members}}
}

enum FileRole {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  CHANGE_PERMISSION = 'CHANGE_PERMISSION',
  TAKE_OWNERSHIP = 'TAKE_OWNERSHIP',
}

enum EmailType {
  EMAIL = 'EMAIL',           // {{Individual email address}}
  EMAIL_GROUP = 'EMAIL_GROUP', // {{Email group or distribution list}}
}
```

### {{Directory Attributes}}

{{The DirectoryAttributes interface defines the metadata for files and folders:}}

```typescript
interface DirectoryAttributes {
  expirationTime?: string;   // {{Expiration time for the item}}
  fileSize?: number;         // {{File size in bytes}}
  fileType?: string;         // {{MIME type of the file}}
  parentId?: string;         // {{Parent folder ID}}
  owner: OwnerDto;           // {{Owner information}}
  s3Key?: string;            // {{S3 object key}}
  ancestors?: string[];      // {{Array of ancestor folder IDs}}
  inheritance?: boolean;     // {{Whether to inherit parent permissions}}
  tags?: string[];           // {{Tags for categorization}}
  permission?: PermissionDto; // {{Permission settings}}
}

interface OwnerDto {
  email: string;   // {{Owner's email address}}
  ownerId: string; // {{Owner's user ID}}
}

interface PermissionDto {
  type: FilePermission;        // {{Permission type}}
  role: FileRole;              // {{Default role for this permission}}
  domain?: DomainDto;          // {{Domain restriction (for DOMAIN type)}}
  users?: UserPermissionDto[]; // {{User-specific permissions (for RESTRICTED type)}}
}

interface DomainDto {
  email: string; // {{Email domain (e.g., "example.com")}}
}

interface UserPermissionDto {
  email: string;    // {{User's email address}}
  role: FileRole;   // {{Role assigned to this user}}
  id: string;       // {{User ID}}
  type: EmailType;  // {{Email type (EMAIL or EMAIL_GROUP)}}
}
```

### {{Updating Permissions}}

```typescript
import { DirectoryUpdatePermissionDto } from '@mbc-cqrs-serverless/directory';

async updatePermission(
  detailDto: DetailDto,
  updateDto: DirectoryUpdatePermissionDto,
  invokeContext: IInvoke,
): Promise<DirectoryDataEntity> {
  return this.directoryService.updatePermission(detailDto, updateDto, { invokeContext });
}
```

### {{Checking Permissions}}

```typescript
async hasPermission(
  itemId: DetailDto,
  requiredRole: FileRole[],
  user?: { email?: string; tenant?: string },
): Promise<boolean> {
  return this.directoryService.hasPermission(itemId, requiredRole, user);
}

async getEffectiveRole(
  itemId: DetailDto,
  user?: { email?: string; tenant?: string },
): Promise<FileRole | null> {
  return this.directoryService.getEffectiveRole(itemId, user);
}
```

## {{Moving and Copying}}

### {{Move Item}}

```typescript
import { DirectoryMoveDto } from '@mbc-cqrs-serverless/directory';

async moveItem(
  detailDto: DetailDto,
  moveDto: DirectoryMoveDto,
  invokeContext: IInvoke,
): Promise<DirectoryDataEntity> {
  return this.directoryService.move(detailDto, moveDto, { invokeContext });
}
```

### {{Copy Item}}

```typescript
import { DirectoryCopyDto } from '@mbc-cqrs-serverless/directory';

async copyItem(
  detailDto: DetailDto,
  copyDto: DirectoryCopyDto,
  invokeContext: IInvoke,
): Promise<DirectoryDataEntity> {
  return this.directoryService.copy(detailDto, copyDto, { invokeContext });
}
```

## {{Version History}}

### {{Restore Previous Version}}

```typescript
async restoreVersion(
  detailDto: DetailDto,
  version: string,
  queryDto: DirectoryDetailDto,
  invokeContext: IInvoke,
): Promise<DirectoryDataEntity> {
  return this.directoryService.restoreHistoryItem(detailDto, version, queryDto, { invokeContext });
}
```

### {{Restore Temporarily Deleted Item}}

```typescript
async restoreTemporary(
  detailDto: DetailDto,
  queryDto: DirectoryDetailDto,
  invokeContext: IInvoke,
): Promise<DirectoryDataEntity> {
  return this.directoryService.restoreTemporary(detailDto, queryDto, { invokeContext });
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
  constructor(private readonly directoryService: DirectoryService) {}

  @Get(':id')
  async findOne(
    @INVOKE_CONTEXT() invokeContext: IInvoke,
    @DetailKeys() detailDto: DetailDto,
    @Query() queryDto: DirectoryDetailDto,
  ): Promise<DirectoryDataEntity> {
    // {{Tenant isolation is handled through the pk structure}}
    return this.directoryService.findOne(detailDto, { invokeContext }, queryDto);
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
    // {{Sync to RDS, notify users, update indexes, etc.}}
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
6. **{{Use Soft Delete}}**: {{Prefer soft delete (remove) over permanent delete (removeFile) for data recovery}}
