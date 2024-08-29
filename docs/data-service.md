---
description: { { Learn how to use DataService. } }
---

# {{DataService}}

## {{Description}}

{{The methods of this service are primarily used to query data from the data table.}}

{{Before jumping into the example, you need to set up the CommandModule as described in [the previous section](./command-module.md).}}

## {{Methods}}

### {{*async* `getItem(key: DetailKey)`}}

{{The `getItem` method returns a set of attributes for the item with the given detail/primary key. If there is no matching item, `getItem` does not return any data and there will be no item element in the response.}}

{{Example:}}

```ts
const item = await this.dataService.getItem(detailDto);

if (!item) {
  throw new NotFoundException();
}
return new CatDataEntity(item as CatDataEntity);
```

### {{*async* `listItemsByPk( pk: string, opts?: ...)`}}

{{The `listItemsByPk` method returns one or more items.}}

{{There are two common usage:}}

- {{List all item by primary key (`pk`)}}

{{Example:}}

```ts
const res = await this.dataService.listItemsByPk(pk);
return new CatListEntity(res as CatListEntity);
```

- {{List items by primary key (`pk`) and use a filter expression on the sort key (`sk`).}}

{{For example, if you want to get an item by its primary key (`pk`), where the sort key (`sk`)starts with the value `CAT#` and limit 100 item.}}

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
