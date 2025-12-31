---
sidebar_position: 7
---

# ディレクトリ

MBC CQRS ServerlessフレームワークのためのS3統合を備えたディレクトリ管理機能です。

## インストール

```bash
npm install @mbc-cqrs-serverless/directory
```

## 概要

Directoryパッケージは、マルチテナントCQRSアーキテクチャにおける包括的なファイルとフォルダの管理を提供します。Amazon S3と統合してファイルストレージを管理し、詳細なアクセス権限をサポートします。

## 機能

- **ディレクトリCRUD操作**: フォルダとファイルの作成、読み取り、更新、削除
- **S3統合**: Amazon S3との完全なファイル管理
- **アクセス権限**: 特定のフォルダとファイルに対する詳細な権限
- **マルチテナントサポート**: テナント分離されたディレクトリ管理
- **イベント駆動アーキテクチャ**: コマンド/イベントハンドリングを備えたCQRSパターン上に構築
- **RESTful API**: ディレクトリ操作のための完全なREST API

## 基本セットアップ

### モジュール設定

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

## APIエンドポイント

| メソッド | エンドポイント | 説明 |
|--------|----------|-------------|
| GET | `/api/directory/` | ファイルとフォルダの検索と一覧表示 |
| POST | `/api/directory/` | 新しいファイルまたはフォルダを作成 |
| GET | `/api/directory/:id` | 特定のファイルまたはフォルダの詳細を取得 |
| PUT | `/api/directory/:id` | 特定のファイルまたはフォルダを更新 |
| DELETE | `/api/directory/:id` | 特定のファイルまたはフォルダを削除 |

## フォルダの作成

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

## ファイルのアップロード

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

## コンテンツの一覧表示

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

## ファイルのダウンロード

```typescript
async downloadFile(fileId: string): Promise<Buffer> {
  const file = await this.directoryService.getById(fileId);
  return this.directoryService.download(file.s3Key);
}
```

## 権限の管理

### 権限の設定

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

### 権限の確認

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

## 移動とコピー

### アイテムの移動

```typescript
async moveItem(itemId: string, newParentId: string): Promise<Directory> {
  return this.directoryService.move(itemId, newParentId);
}
```

### アイテムのコピー

```typescript
async copyItem(itemId: string, newParentId: string): Promise<Directory> {
  return this.directoryService.copy(itemId, newParentId);
}
```

## ディレクトリ構造

ディレクトリ構造の例：

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

## マルチテナント分離

ディレクトリはテナントによって自動的に分離されます：

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

## イベント処理

ディレクトリイベントをリッスン：

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

## ベストプラクティス

1. **整理のためにフォルダを使用**: 簡単なナビゲーションのための論理的なフォルダ構造を作成
2. **早期に権限を設定**: ディレクトリ作成時に権限を設定
3. **大きなファイルの処理**: 大きなファイルには、S3への直接アップロード用の署名付きURLを使用
4. **クリーンアップ**: 一時ファイルの保持ポリシーを実装
5. **監査証跡**: すべての操作の監査証跡を維持するためにイベントを使用
