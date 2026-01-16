---
sidebar_position: 6
description: バージョン競合の処理方法と並行性制御戦略の実装について学びます
---

# バージョン競合ガイド

このガイドでは、MBC CQRS サーバーレスフレームワークでバージョン競合がどのように発生するかを説明し、予防と回復のための戦略を提供します。

## バージョン競合の原因

バージョン競合は、2つ以上の操作が同時に同じアイテムを更新しようとしたときに発生します。サーバーレスアプリケーションのような分散システムでは、これは適切に処理する必要がある一般的なシナリオです。

### 競合シナリオ

```
ユーザーAがアイテムを読み取り（バージョン1）
ユーザーBがアイテムを読み取り（バージョン1）
ユーザーAがアイテムを更新（バージョン1 -> 2）- 成功
ユーザーBがアイテムを更新（バージョン1 -> 2）- 競合!
```

このシナリオでは、ユーザーBの更新は、ユーザーAによって既にアイテムが更新されているため失敗します。フレームワークはDynamoDBの条件付き書き込みを使用してこの状況を検出します。

## 楽観的ロックの仕組み

フレームワークは、各アイテムの`version`フィールドを通じて楽観的ロックを実装します。このアプローチは、競合はまれであると想定し、リソースを事前にロックするのではなく、発生したときに処理します。

### バージョン定数

```typescript
import { VERSION_FIRST, VERSION_LATEST } from '@mbc-cqrs-serverless/core';

// VERSION_FIRST = 0: 新規アイテム作成時に使用
// VERSION_LATEST = -1: 最新バージョンに自動解決
```

### 内部動作の仕組み

コマンドを発行する際、フレームワークは：

1. 入力バージョンを現在のアイテムのバージョンと照合します
2. バージョン番号を1増加させます
3. DynamoDBの条件式 `attribute_not_exists(pk) AND attribute_not_exists(sk)` を使用して一意性を確保します
4. 別の更新が先に発生した場合、DynamoDBは`ConditionalCheckFailedException`をスローします
5. フレームワークはこれをHTTP 409 Conflictレスポンスに変換します

```typescript
// 内部実装（簡略化）
await this.dynamoDbService.putItem(
  this.tableName,
  command,
  'attribute_not_exists(pk) AND attribute_not_exists(sk)', // 条件付き書き込み
);
```

## 予防戦略

### 1. 更新時に常にバージョンを含める

アイテムを更新する際は、常に現在のバージョン番号を含めてください：

```typescript
import { CommandPartialInputModel } from '@mbc-cqrs-serverless/core';

// まず、現在のアイテムを取得してバージョンを確認
const currentItem = await this.dataService.getItem({ pk, sk });

const updateCommand: CommandPartialInputModel = {
  pk: currentItem.pk,
  sk: currentItem.sk,
  version: currentItem.version, // 現在のバージョンを含める
  name: 'Updated Name',
};

await this.commandService.publishPartialUpdateAsync(updateCommand, {
  source: 'updateItem',
  invokeContext,
});
```

### 2. 自動解決にVERSION_LATESTを使用する

正確なバージョン番号を気にせずに常に最新バージョンを更新したい場合：

```typescript
import { VERSION_LATEST, CommandInputModel } from '@mbc-cqrs-serverless/core';

const command: CommandInputModel = {
  pk: catPk,
  sk: catSk,
  id: generateId(catPk, catSk),
  code,
  type: 'CAT',
  name: 'Updated Name',
  version: VERSION_LATEST, // 最新バージョンに自動解決
  attributes,
};

await this.commandService.publishAsync(command, {
  source: 'updateCat',
  invokeContext,
});
```

### 3. 新規アイテムにはVERSION_FIRSTを使用する

新規アイテムを作成する際は、VERSION_FIRST（0）を使用して最初のバージョンであることを示します：

```typescript
import { VERSION_FIRST, CommandDto } from '@mbc-cqrs-serverless/core';

const newCatCommand = new CatCommandDto({
  pk: catPk,
  sk: catSk,
  id: generateId(catPk, catSk),
  code,
  type: 'CAT',
  name: 'New Cat',
  version: VERSION_FIRST, // 0 - 新規アイテムを示す
  attributes,
});

await this.commandService.publishAsync(newCatCommand, {
  source: 'createCat',
  invokeContext,
});
```

## 回復パターン

### 基本的なリトライロジック

一時的な競合を処理するためのリトライロジックを実装します：

```typescript
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

async function updateWithRetry(
  commandService: CommandService,
  dataService: DataService,
  pk: string,
  sk: string,
  updateData: Partial<CommandInputModel>,
  invokeContext: IInvoke,
  maxRetries = 3,
): Promise<CommandModel> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 最新バージョンを取得
      const currentItem = await dataService.getItem({ pk, sk });

      const command: CommandPartialInputModel = {
        pk,
        sk,
        version: currentItem?.version || VERSION_FIRST,
        ...updateData,
      };

      return await commandService.publishPartialUpdateAsync(command, {
        source: 'updateWithRetry',
        invokeContext,
      });
    } catch (error) {
      if (
        error instanceof ConditionalCheckFailedException ||
        error.statusCode === 409
      ) {
        if (attempt === maxRetries) {
          throw new Error(
            `Failed to update after ${maxRetries} attempts due to version conflicts`,
          );
        }
        // リトライ前に待機（指数バックオフ）
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 100),
        );
        continue;
      }
      throw error;
    }
  }
}
```

### 指数バックオフパターン

高競合シナリオでは、ジッターを伴う指数バックオフを使用します：

```typescript
async function exponentialBackoff(attempt: number): Promise<void> {
  const baseDelay = 100; // ミリ秒単位の基本遅延
  const maxDelay = 5000; // 最大遅延

  // 指数バックオフで遅延を計算
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

  // サンダリングハードを防ぐためにランダムジッターを追加
  const jitter = Math.random() * delay * 0.1;

  await new Promise((resolve) => setTimeout(resolve, delay + jitter));
}
```

### コントローラーでの競合処理

APIコントローラーでバージョン競合を適切に処理します：

```typescript
import {
  Controller,
  Put,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Controller('cats')
export class CatController {
  constructor(private readonly catService: CatService) {}

  @Put(':id')
  async updateCat(
    @Param('id') id: string,
    @Body() updateDto: UpdateCatDto,
    @InvokeContext() invokeContext: IInvoke,
  ) {
    try {
      return await this.catService.update(id, updateDto, invokeContext);
    } catch (error) {
      if (error.statusCode === 409) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            message: 'Version conflict. Please refresh and try again.',
            error: 'Conflict',
          },
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }
}
```

## VERSION_FIRSTとVERSION_LATESTの使い分け

| シナリオ | 使用 | 理由 |
|---|---|---|
| 新規アイテム作成 | `VERSION_FIRST` (0) | アイテムの最初のバージョンであることを示す |
| 既知のバージョンで更新 | 実際のバージョン番号 | 期待するバージョンを更新していることを確認 |
| 最新に更新（競合チェックなし） | `VERSION_LATEST` (-1) | 最新に自動解決するが、同時変更を上書きする可能性あり |
| 部分更新 | 現在のアイテムのバージョン | 更新が現在の状態に基づいていることを確認 |

### VERSION_FIRST (0)

使用する場合：
- まだ存在しない新規アイテムを作成する場合
- 作成後にアイテムはバージョン1になる

```typescript
const newCommand = {
  pk: 'CAT#tenant1',
  sk: 'cat#001',
  version: VERSION_FIRST, // version 0 (バージョン0)
  // ... その他のフィールド
};
```

### VERSION_LATEST (-1)

使用する場合：
- 現在のバージョンに関係なく更新したい場合
- 競合が許容され、最新データが優先される場合
- 「最後の書き込みが勝つ」セマンティクスを実装する場合

```typescript
const updateCommand = {
  pk: 'CAT#tenant1',
  sk: 'cat#001',
  version: VERSION_LATEST, // -1、自動解決
  // ... その他のフィールド
};
```

:::warning VERSION_LATESTの注意点
`VERSION_LATEST`を使用すると競合検出がバイパスされます。同時変更を意図的に上書きしたい場合にのみ使用してください。ほとんどのユースケースでは、現在のアイテムの実際のバージョン番号を使用する必要があります。
:::

## ベストプラクティス

### 1. 並行性を考慮した設計

- トランザクションを短く、焦点を絞る
- 読み取りと書き込みの間の時間を最小化する
- 読み取りと更新の間に長時間の操作を避ける

### 2. 競合を適切に処理する

- バージョン競合エラーを常にキャッチして処理する
- ユーザーに明確なエラーメッセージを提供する
- 適切なリトライ戦略を実装する

### 3. 適切なバージョン戦略を使用する

- 厳密な並行性制御には明示的なバージョン番号を使用する
- 「最後の書き込みが勝つ」が許容される場合にのみVERSION_LATESTを使用する
- 部分更新では常にバージョンを検証する

### 4. クライアント側の考慮事項

- データ取得時にバージョン番号を保存する
- 更新リクエストにバージョンを含める
- 409 Conflictレスポンスをデータ更新とリトライで処理する

```typescript
// フロントエンド例
async function updateItem(item, changes) {
  try {
    const response = await fetch(`/api/items/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...changes,
        version: item.version, // バージョンを含める
      }),
    });

    if (response.status === 409) {
      // 競合を処理 - 更新してユーザーに変更を表示
      const latestItem = await fetchItem(item.id);
      throw new ConflictError('Item was modified. Please review changes.', latestItem);
    }

    return response.json();
  } catch (error) {
    // その他のエラーを処理
    throw error;
  }
}
```

### 5. モニタリングとアラート

- アプリケーションの競合率を監視する
- 高い競合率は設計上の問題を示している可能性がある
- データの再構成や競合の軽減を検討する

## 関連ドキュメント

- [バージョン管理ルール](./version-rules.md)
- [CommandService](./command-service.md)
- [エラーカタログ](./error-catalog.md)
