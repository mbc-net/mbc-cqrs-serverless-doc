# MBC CQRS serverless documentation

This website serves as the official documentation for [the MBC CQRS Serverless Framework](https://github.com/mbc-net/mbc-cqrs-serverless). It provides comprehensive information and resources to help developers understand and effectively utilize the framework.

### Installation

```
$ npm install
```

### Local Development

```
$ npm run start:watch

or

$ npm run start:watch -- --locale {{country-code}}
```

This command starts a local development server. Most changes are reflected live without having to restart the server.

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

2. Edit the content using the translation JSON file in the `i18n/{{country-code}}` folder

#### Write documentation

1. Run command `npm run start:watch -- --locale {{country-code}}`

2. Create .md file in docs/ and write with placeholder

3. Edit sidebar.ts file. For more information, please follow this guide: https://docusaurus.io/docs/sidebar/items

4. Update the JSON for translation.

5. Run command `npm run build` and `npm run serve`: build static website and serve website in local

6. Check result.

We can summary the contributing process as the bellow image:

<p align="center">
  <img width="250px" src="./static/img/contributing.png" />
</p>

Note: Extract the theme translation JSON file with command: `npm run write-translations -- --locale {{country-code}}`
