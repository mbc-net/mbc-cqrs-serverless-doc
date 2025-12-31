---
sidebar_position: 10
---

# エラーカタログ

このカタログでは、MBC CQRS Serverlessで発生する一般的なエラー、その原因、および解決策を説明します。

## コマンドサービスエラー

### BadRequestException: "The input is not a valid, item not found or version not match"

**場所**: `packages/core/src/commands/command.service.ts`

**原因**: 楽観的ロックの失敗。リクエストのバージョン番号がデータベースの現在のバージョンと一致しません。

**解決策**:
```typescript
// 1. Fetch latest version before update
const latest = await dataService.getItem({ pk, sk });

// 2. Use the current version
await commandService.publishPartialUpdateSync({
  pk,
  sk,
  version: latest.version,
  name: 'Updated Name',
}, options);

// 3. Or use version: -1 for auto-fetch (async mode only)
await commandService.publishPartialUpdateAsync({
  pk,
  sk,
  version: -1,
  name: 'Updated Name',
}, options);
```

---

### BadRequestException: "The input key is not a valid, item not found"

**場所**: `packages/core/src/commands/command.service.ts`

**原因**: データベースに存在しないアイテムを更新しようとしています。

**解決策**:
```typescript
// Check if item exists first
const existing = await dataService.getItem({ pk, sk });
if (!existing) {
  await commandService.publishAsync(newItem, options);
}
```

---

### BadRequestException: "Invalid input version"

**場所**: `packages/core/src/commands/command.service.ts`

**原因**: publishSyncで最新の保存バージョンと一致しないバージョンを使用しています。

**解決策**: 最新のアイテムを取得してそのバージョンを使用するか、非同期メソッドでversion: -1を使用してください。

---

## テナントエラー

### BadRequestException: "Tenant not found"

**場所**: `packages/tenant/src/services/tenant.service.ts`

**原因**: 指定されたテナントが存在しないか削除されています。

**解決策**:
```typescript
const tenants = await tenantService.listTenants();
```

---

### BadRequestException: "Tenant code already existed"

**場所**: `packages/tenant/src/services/tenant.service.ts`

**原因**: 既に存在するコードでテナントを作成しようとしています。

**解決策**: 別のテナントコードを使用するか、削除後に再作成する場合は既存のコードを再利用できます。

---

## バリデーションエラー

### BadRequestException: "Validation failed"

**場所**: `packages/core/src/pipe/class.validation.pipe.ts`

**原因**: リクエストDTOがclass-validatorのバリデーションに失敗しました。

**解決策**:
```typescript
const dto: CreateOrderDto = {
  name: 'Order Name',
  code: 'ORD001',
};
```

---

## DynamoDBエラー

### ProvisionedThroughputExceededException

**場所**: AWS DynamoDB

**原因**: 読み取りまたは書き込み容量を超過しました。

**解決策**:
```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.name === 'ProvisionedThroughputExceededException') {
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 100));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

### ConditionalCheckFailedException

**場所**: AWS DynamoDB

**原因**: 楽観的ロック条件が失敗しました（バージョン不一致）。

**解決策**: 上記の「version not match」エラーと同じ - リフレッシュしてリトライしてください。

---

## HTTPステータスコードリファレンス

| ステータス | 例外 | 意味 |
|--------|-----------|---------|
| 400 | BadRequestException | 無効な入力またはビジネスルール違反 |
| 401 | UnauthorizedException | 認証が欠落しているか無効 |
| 403 | ForbiddenException | 認証済みだが権限がない |
| 404 | NotFoundException | リソースが見つからない |
| 409 | ConflictException | バージョン競合（楽観的ロック） |
| 500 | InternalServerErrorException | 予期しないサーバーエラー |

---

## デバッグのヒント

効果的なデバッグのためのヒントを紹介します。

1. **デバッグログを有効にする**:
   ```bash
   DEBUG=* npm run offline
   ```

2. **Lambdaエラーについては**CloudWatchログ**を確認**

3. **トレーシングには**リクエストID**を使用**:
   ```typescript
   console.log('RequestId:', context.awsRequestId);
   ```

4. ****環境変数**が正しく設定されていることを確認**

5. ****DynamoDBテーブル**が存在し、正しいスキーマであることを確認**
