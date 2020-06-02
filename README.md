![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Notarisation

This repository contains the code of EBSI trusted issuers registry.

## Table of Contents

1. [Getting started](#Getting-started)
2. [Linting](#Linting)
3. [Auditing the dependencies](#Auditing-the-dependencies)
4. [Testing](#Testing)

## Getting started

You can choose to run the project locally with your own Node.js environment, or you can use Docker Compose to run it.

First, create an `.env` file locally. You can duplicate `.env.example` and name the new copy `.env`. Adapt the variables to your needs.

You will need to fill the WALLET_PRIV_KEY env variable. This private key is needed to be identified into besu

Please note that you need to fill the APP_PRIVATE_KEY env variable with a base64 encode private key. The private key is of the form
`-----BEGIN PRIVATE KEY-----\nXXXXXXXXXXXXXXXXXXXXXXXXXX\n-----END PRIVATE KEY-----`

### Run the project locally

Install the required libraries and packages dependencies:

```sh
npm install
```

Run the development server:

```sh
npm run start
```

This command starts the web app at http://localhost:3000

You can create a production build with:

```sh
npm run build
```

### Run with Docker

After creating the local `.env` file, run:

```sh
docker-compose up --build
```

You can now open http://localhost:3000/demo/notarisation

```bash
$ npm install
```

You need to fill the WALLET_PRIV_KEY env variable with a private key

## Linting

You can lint the files (ESLint + stylelint) and run Prettier with one command:

```sh
npm run lint
```

Or you can run the different linters independently:

### ESLint

```sh
npm run lint:ts
```

or with npx:

```sh
npx eslint . --ext .ts
```

run eslint and precommit rules

```sh
.git/hooks/pre-commit
```

### Prettier

```sh
npm run lint:prettier
```

or with npx:

```sh
npx prettier --check "**/*.{md,mdx,html,json,yml,ts,tsx,css,scss}"
```

## Auditing the dependencies

```sh
npm run audit
```

## Testing

Run the tests

```sh
npm run test
```

Run the end to end tests

```sh
npm run test:e2e
```

Run all the tests

```sh
npm run test:all
```

## Licensing

Copyright (c) 2019 European Commission  
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
