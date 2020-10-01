![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Trusted Issuers Registry

This repository contains the code of EBSI Trusted Issuers Registry.

## Table of Contents

1. [Getting started](#Getting-started)
2. [Linting](#Linting)
3. [Auditing the dependencies](#Auditing-the-dependencies)
4. [Testing](#Testing)

## Getting started

You can choose to run the project locally with your own Node.js environment, or you can use Docker Compose to run it.

Adapt the variables in `.env` file to your needs, or update the variables in a copy named `.env.local`.

Please note that you need to fill the API_PRIVATE_KEY env variable with a secp256k1 elliptic curve private key in hexadecimal.

### Run the project locally

Install the required libraries and packages dependencies:

```sh
yarn install
```

Run the development server:

```sh
yarn start
```

This command starts the web app at http://localhost:3000

You can create a production build with:

```sh
yarn build
```

### Run with Docker

After creating the local `.env` file, run:

```sh
docker-compose up --build
```

You can now open http://localhost:3000/trusted-issuers-registry/v2/health. If everything's working correctly, then you should see "ok".

## Linting

You can lint the files (ESLint + stylelint) and run Prettier with one command:

```sh
yarn lint
```

Or you can run the different linters independently:

### ESLint

```sh
yarn lint:ts
```

or with yarn:

```sh
yarn eslint . --ext .ts
```

Run eslint and precommit rules:

```sh
.git/hooks/pre-commit
```

### Prettier

```sh
yarn lint:prettier
```

or with yarn:

```sh
yarn prettier --check "**/*.{md,mdx,html,json,yml,ts,tsx,css,scss}"
```

### tsc

```sh
yarn lint:tsc
```

## Auditing the dependencies

```sh
yarn run audit
```

## Testing

Run all the tests:

```sh
yarn test
```

Run the unit tests only:

```sh
yarn test:unit
```

Run the end-to-end tests only:

```sh
yarn test:e2e
```

## Licensing

Copyright (c) 2019 European Commission
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
