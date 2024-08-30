# MBC CQRS serverless documentation

This website serves as the official documentation for [the MBC CQRS Serverless Framework](https://github.com/mbc-net/mbc-cqrs-serverless). It provides comprehensive information and resources to help developers understand and effectively utilize the framework.

### Installation

```
$ npm install
```

### Build

```
$ npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Serve

```
$ npm run serve
```

After the build command, you can run a local server that will serve your website in build folder.

### Contributing

#### Support more language

1. Append country code to `i18n.locales` in docusaurus.config.ts.

2. Run command `npm run translate:extract-placeholder {{country-code}}` and `npm run write-translations -- --locale {{country-code}}`: extract the translation JSON file in the `i18n/{{country-code}}` folder

3. Translate

4. Run command `npm run translate:replace-placeholders {{country-code}}`: create docs for the language (if key is not translated, the content will fallback to EN language).

#### Write documentation

1. Create .md file in docs/ and write with placeholder

2. Edit sidebar.ts file. For more information, please follow this guide: https://docusaurus.io/docs/sidebar/items

3. Run command `npm run translate:extract-placeholder`: extract the translation JSON file in the `i18n` folder

4. Update the JSON for translation.

5. Run command `npm run translate:replace-placeholders`

6. Run command `npm run build` and `npm run serve`: build static website and serve website in local

7. Check result.

We can summary the contributing process as the bellow image:

<p align="center">
  <img src="./static/img/contributing.png" />
</p>
