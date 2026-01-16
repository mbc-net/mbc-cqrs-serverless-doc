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

## 基本セットアップ

### モジュール設定

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

  async createFolder(
    dto: DirectoryCreateDto,
    invokeContext: IInvoke,
  ): Promise<DirectoryDataEntity> {
    return this.directoryService.create(dto, { invokeContext });
  }
}
```

## ファイルのアップロード

```typescript
async uploadFile(
  dto: DirectoryCreateDto,
  invokeContext: IInvoke,
): Promise<DirectoryDataEntity> {
  // File upload is handled through the create method with file content (ファイルアップロードはcreateメソッドを通じて処理されます)
  return this.directoryService.create(dto, { invokeContext });
}
```

## コンテンツの一覧表示

```typescript
async getDirectory(
  key: DetailDto,
  invokeContext: IInvoke,
  queryDto: DirectoryDetailDto,
): Promise<DirectoryDataEntity> {
  return this.directoryService.findOne(key, { invokeContext }, queryDto);
}

async getDirectoryHistory(
  key: DetailDto,
  invokeContext: IInvoke,
  queryDto: DirectoryDetailDto,
): Promise<DirectoryDataListEntity> {
  return this.directoryService.findHistory(key, { invokeContext }, queryDto);
}
```

## ファイル操作

```typescript
// Get file attributes (ファイル属性を取得)
async getFileAttributes(key: DetailDto): Promise<DirectoryAttributes> {
  return this.directoryService.getItemAttributes(key);
}

// Remove file and delete from S3 (ファイルを削除してS3からも削除)
async removeFile(
  key: DetailDto,
  invokeContext: IInvoke,
  queryDto: DirectoryDetailDto,
): Promise<DirectoryDataEntity> {
  return this.directoryService.removeFile(key, { invokeContext }, queryDto);
}
```

## 権限の管理

### 権限の更新

```typescript
async updatePermission(
  key: DetailDto,
  dto: DirectoryUpdatePermissionDto,
  invokeContext: IInvoke,
): Promise<DirectoryDataEntity> {
  return this.directoryService.updatePermission(key, dto, { invokeContext });
}
```

### 権限の確認

```typescript
async hasPermission(
  key: DetailDto,
  requiredRole: FileRole[],
  user?: { email?: string; tenant?: string },
): Promise<boolean> {
  return this.directoryService.hasPermission(key, requiredRole, user);
}

async getEffectiveRole(
  key: DetailDto,
  user?: { email?: string; tenant?: string },
): Promise<FileRole | null> {
  return this.directoryService.getEffectiveRole(key, user);
}
```

## 移動とコピー

### アイテムの移動

```typescript
async moveItem(
  key: DetailDto,
  dto: DirectoryMoveDto,
  invokeContext: IInvoke,
): Promise<DirectoryDataEntity> {
  return this.directoryService.move(key, dto, { invokeContext });
}
```

### アイテムのコピー

```typescript
async copyItem(
  key: DetailDto,
  dto: DirectoryCopyDto,
  invokeContext: IInvoke,
): Promise<DirectoryDataEntity> {
  return this.directoryService.copy(key, dto, { invokeContext });
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

  @Get(':pk/:sk')
  async findOne(
    @INVOKE_CONTEXT() invokeContext: IInvoke,
    @Param('pk') pk: string,
    @Param('sk') sk: string,
    @Query() queryDto: DirectoryDetailDto,
  ): Promise<DirectoryDataEntity> {
    // Tenant isolation is handled through the pk structure (テナント分離はpk構造を通じて処理されます)
    return this.directoryService.findOne({ pk, sk }, { invokeContext }, queryDto);
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

## ベストプラクティス

1. **整理のためにフォルダを使用**: 簡単なナビゲーションのための論理的なフォルダ構造を作成
2. **早期に権限を設定**: ディレクトリ作成時に権限を設定
3. **大きなファイルの処理**: 大きなファイルには、S3への直接アップロード用の署名付きURLを使用
4. **クリーンアップ**: 一時ファイルの保持ポリシーを実装
5. **監査証跡**: すべての操作の監査証跡を維持するためにイベントを使用
