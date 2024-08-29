---
description: { { description } }
---

# {{title}}

## {{description_title}}

{{description_text}}

{{setup_info}}

## {{methods_title}}

### {{getItem_method_title}}

{{getItem_method_description}}

{{getItem_example}}

```ts
const item = await this.dataService.getItem(detailDto);

if (!item) {
  throw new NotFoundException();
}
return new CatDataEntity(item as CatDataEntity);
```

### {{listItemsByPk_method_title}}

{{listItemsByPk_method_description}}

{{listItemsByPk_usage}}

- {{usage_1}}

{{usage_1_example}}

```ts
const res = await this.dataService.listItemsByPk(pk);
return new CatListEntity(res as CatListEntity);
```

- {{usage_2}}

{{usage_2_example}}

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
