---
sidebar_position: 7
---

# ディレクトリモジュール

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
- **バージョン履歴**: ファイルとフォルダの以前のバージョンを追跡および復元

## 基本セットアップ

### モジュール設定

```typescript
import { DirectoryStorageModule } from '@mbc-cqrs-serverless/directory';
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    DirectoryStorageModule.register({
      enableController: true,  // Enable REST API endpoints (REST APIエンドポイントを有効化)
      prismaService: PrismaService,  // Required when enableController is true (enableControllerがtrueの場合に必須)
      dataSyncHandlers: [],  // Optional data sync handlers (オプションのデータ同期ハンドラー)
    }),
  ],
})
export class AppModule {}
```

## APIエンドポイント

| メソッド | エンドポイント | 説明 |
|--------|----------|-------------|
| POST | `/api/directory/` | 新しいファイルまたはフォルダを作成 |
| GET | `/api/directory/summary` | テナントのファイルサイズサマリーを取得 |
| GET | `/api/directory/:id` | 特定のファイルまたはフォルダの詳細を取得 |
| GET | `/api/directory/:id/history` | ファイルまたはフォルダのバージョン履歴を取得 |
| POST | `/api/directory/:id/history/:version/restore` | 特定のバージョンを復元 |
| PUT | `/api/directory/:id/restore` | 一時削除されたアイテムを復元 |
| PATCH | `/api/directory/:id` | 特定のファイルまたはフォルダを更新 |
| PATCH | `/api/directory/:id/permission` | ファイルまたはフォルダの権限を更新 |
| PATCH | `/api/directory/:id/rename` | ファイルまたはフォルダの名前を変更 |
| PATCH | `/api/directory/:id/copy` | ファイルまたはフォルダをコピー |
| PATCH | `/api/directory/:id/move` | ファイルまたはフォルダを移動 |
| DELETE | `/api/directory/:id` | ファイルまたはフォルダを論理削除 |
| DELETE | `/api/directory/:id/bin` | ファイルを完全に削除してS3からも削除 |
| POST | `/api/directory/file/view` | ファイル閲覧用の署名付きURLを生成 |
| POST | `/api/directory/file` | ファイルアップロード用の署名付きURLを生成 |

## フォルダの作成

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

## ファイルのアップロード

```typescript
async uploadFile(
  createDto: DirectoryCreateDto,
  invokeContext: IInvoke,
): Promise<DirectoryDataEntity> {
  // File upload is handled through the create method with file content (ファイルアップロードはcreateメソッドを通じて処理されます)
  return this.directoryService.create(createDto, { invokeContext });
}
```

## コンテンツの一覧表示

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

## ファイル操作

```typescript
// Get file attributes (ファイル属性を取得)
async getFileAttributes(detailDto: DetailDto): Promise<DirectoryAttributes> {
  return this.directoryService.getItemAttributes(detailDto);
}

// Get file item (ファイルアイテムを取得)
async getFile(detailDto: DetailDto): Promise<DirectoryDataEntity> {
  return this.directoryService.getItem(detailDto);
}

// Soft delete (marks as deleted) (論理削除、削除済みとしてマーク)
async removeItem(
  detailDto: DetailDto,
  invokeContext: IInvoke,
  queryDto: DirectoryDetailDto,
): Promise<DirectoryDataEntity> {
  return this.directoryService.remove(detailDto, { invokeContext }, queryDto);
}

// Permanently remove file and delete from S3 (ファイルを完全に削除してS3からも削除)
async removeFile(
  detailDto: DetailDto,
  invokeContext: IInvoke,
  queryDto: DirectoryDetailDto,
): Promise<DirectoryDataEntity> {
  return this.directoryService.removeFile(detailDto, { invokeContext }, queryDto);
}
```

## アイテムの名前変更

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

## 権限の管理

### 権限タイプ

ディレクトリパッケージは以下の権限タイプをサポートしています：

```typescript
enum FilePermission {
  GENERAL = 'GENERAL',      // General access for everyone (全員に対する一般アクセス)
  RESTRICTED = 'RESTRICTED', // Restricted to specific users (特定ユーザーに制限)
  DOMAIN = 'DOMAIN',        // Restricted to specific email domain (特定メールドメインに制限)
  TENANT = 'TENANT',        // Restricted to tenant members (テナントメンバーに制限)
}

enum FileRole {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  CHANGE_PERMISSION = 'CHANGE_PERMISSION',
  TAKE_OWNERSHIP = 'TAKE_OWNERSHIP',
}
```

### 権限の更新

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

### 権限の確認

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

## 移動とコピー

### アイテムの移動

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

### アイテムのコピー

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

## バージョン履歴

### 以前のバージョンを復元

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

### 一時削除されたアイテムを復元

```typescript
async restoreTemporary(
  detailDto: DetailDto,
  queryDto: DirectoryDetailDto,
  invokeContext: IInvoke,
): Promise<DirectoryDataEntity> {
  return this.directoryService.restoreTemporary(detailDto, queryDto, { invokeContext });
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

ディレクトリはinvokeコンテキストを通じてテナントごとに自動的に分離されます：

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
    // Tenant isolation is handled through the pk structure (テナント分離はpk構造を通じて処理されます)
    return this.directoryService.findOne(detailDto, { invokeContext }, queryDto);
  }
}
```

## イベント処理

データ同期ハンドラーを使用してディレクトリデータの同期を処理：

```typescript
import { IDataSyncHandler, DataEntity } from '@mbc-cqrs-serverless/core';

export class DirectoryDataSyncHandler implements IDataSyncHandler {
  async onCreated(data: DataEntity): Promise<void> {
    console.log('Directory created:', data.name);
    // Sync to RDS, notify users, update indexes, etc. (RDSへの同期、ユーザーへの通知、インデックスの更新など)
  }

  async onUpdated(data: DataEntity): Promise<void> {
    console.log('Directory updated:', data.name);
  }

  async onDeleted(data: DataEntity): Promise<void> {
    console.log('Directory deleted:', data.name);
  }
}
```

## ベストプラクティス

1. **整理のためにフォルダを使用**: 簡単なナビゲーションのための論理的なフォルダ構造を作成
2. **早期に権限を設定**: ディレクトリ作成時に権限を設定
3. **大きなファイルの処理**: 大きなファイルには、S3への直接アップロード用の署名付きURLを使用
4. **クリーンアップ**: 一時ファイルの保持ポリシーを実装
5. **監査証跡**: すべての操作の監査証跡を維持するためにイベントを使用
6. **論理削除を使用**: データ復旧のために完全削除（removeFile）よりも論理削除（remove）を推奨
