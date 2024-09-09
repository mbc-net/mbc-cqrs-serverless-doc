---
description: データサービスの使用方法を学びましょう。
---

# DataService

## 説明

このサービスのメソッドは主に、データテーブルのデータを検索するために使用されます。

例に移る前に、[前のセクション](./command-module.md) で説明されているように CommandModule をセットアップする必要があります。

## メソッド

### *async* `getItem(key: DetailKey)`

`getItem` メソッドは、指定された詳細キー/主キーを持つアイテムの属性のセットを返します。一致するアイテムがない場合、`getItem` はデータを返さず、応答には item 要素がありません。

例

```ts
const item = await this.dataService.getItem(detailDto);

if (!item) {
  throw new NotFoundException();
}
return new CatDataEntity(item as CatDataEntity);
```

### *async* `listItemsByPk( pk: string, opts?: ...)`

`listItemsByPk` メソッドは 1 つ以上の項目を返します。

使い方は2つあります

- Primary Key (`pk`) ごとにすべての項目をリストします。

例

```ts
const res = await this.dataService.listItemsByPk(pk);
return new CatListEntity(res as CatListEntity);
```

- Primary Key (`pk`) によって項目をリストし、ソートキー (`sk`) でフィルター式を使用します。

たとえば、Primary Key (`pk`) によって項目を取得したい場合、ソートキー (`sk`) は値 `CAT#` で始まり、項目数は 100 に制限されます。

```ts
const query = {
  sk: {
    skExpession: "begins_with(sk, :typeCode)",
    skAttributeValues: {
      ":typeCode": `CAT${KEY_SEPARATOR}`,
    },
  },
  limit: 100,
};
const res = await this.dataService.listItemsByPk(pk, query);
return new CatDataListEntity(res as CatDataListEntity);
```
