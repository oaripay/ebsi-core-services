# EBSI Core Services

![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

## Notes on monorepo

### Environment variables

Nest.js `forRoot` static method from `ConfigModule` does not play well with workspaces and merging node processes at the moment. For this, it's necessary pay attention on how environment configurations are loaded.

Use `NODE_ENV` for Nest.js configuration module to properly read .env files:

```
NODE_ENV=test yarn workspace @ebsiint-api/trusted-apps-registry start
```

Or 

```
NODE_ENV=test yarn start
```

From within the given project folder.

Long story short, this line is not patched, but left as-is to avoid unnecessary changes in Nest.js core

```
config = Object.assign(Object.assign({}, config), process.env); // config are loaded .env files
```
