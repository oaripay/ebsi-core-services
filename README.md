![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Authorisation API

The Authorisation API is a core EBSI service responsible to issue Short Term Access Tokens (JWS) to the EBSI Platform for entities (Natural Persons, Legal Entities) and trusted Applications (EBSI or third-party applications) in exchange of their presentation of a long term EBSI Verifiable Authorisation credential, plus their authentication/identification. Access tokens are required by entities and applications to access the protected resources of EBSI.

Users receive access tokens after they present a valid EBSI Verifiable Authorisation credential and prove ownership over their DID.

Trusted Applications receive access tokens if they are well registered in the Trusted Apps Registry (application public keys are listed), are authorised there to access the requested protected resources, and successfully prove their private key ownership. We implement the Authenticated Key Exchange cryptographic identification protocol.

For more information see:

- [Technical Specifications](https://ec.europa.eu/cefdigital/wiki/x/aoiWFQ)
- API catalogs:
  - [EBSI Pre-production network API Catalog](https://api.preprod.ebsi.eu/docs)
  - [EBSI Production network API Catalog](https://api.ebsi.eu/docs)

## Table of Contents

- [Authorisation API](#authorisation-api)
  - [Table of Contents](#table-of-contents)
  - [Getting started](#getting-started)
    - [Run the project locally](#run-the-project-locally)
    - [Run with Docker](#run-with-docker)
  - [Linting](#linting)
    - [ESLint](#eslint)
    - [OpenAPI](#openapi)
    - [Prettier](#prettier)
    - [tsc](#tsc)
    - [Extra: lint Dockerfile](#extra-lint-dockerfile)
  - [Auditing the dependencies](#auditing-the-dependencies)
  - [Testing](#testing)
  - [Load testing with k6](#load-testing-with-k6)
    - [Start the API server](#start-the-api-server)
    - [Run the tests](#run-the-tests)
  - [Serving the OpenAPI specification locally](#serving-the-openapi-specification-locally)
  - [Cutting a new release](#cutting-a-new-release)
  - [License](#license)

## Getting started

You can choose to run the project locally with your own Node.js environment, or you can use Docker Compose to run it.

First, create an `.env.local` file locally. You can duplicate the content of `.env` or only set the variables that you want to change.

Please note that you need to fill the API_PRIVATE_KEY and ADMIN_TEST_PRIVATE_KEY environment variable with secp256k1 elliptic curve private keys in hexadecimal.

You must at least set `API_PRIVATE_KEY`, `API_DID`, `API_TAR_ID` and `EBSI_ENV` to run the API. For e2e testing, you must also set `TEST_APP_NAME`, `TEST_APP_PRIVATE_KEY`, `TEST_CLIENT_DID` and `TEST_CLIENT_PRIVATE_KEY`.

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

The development server can also be started in Live-reload mode with: `yarn start:dev`. Every time you make a change, the server will automatically restart after compiling the code.

You can create a production build with:

```sh
yarn build
```

And then you can serve the production build with:

```sh
yarn start:prod
```

You can now open http://localhost:3000/authorisation/v1/health. If everything's working correctly, then you should see `"status":"ok"`.

### Run with Docker

After creating the `.env.local` file, run:

```sh
docker-compose up --build
```

Check http://localhost:3000/authorisation/v1/health to see if it's working.

## Linting

You can lint the files (ESLint, OpenAPI, tsc) and run Prettier with one command:

```sh
yarn lint
```

Or you can run the different linters independently:

### ESLint

```sh
yarn lint:eslint
```

or with yarn:

```sh
yarn eslint . --ext .js,.ts
```

Run eslint and precommit rules:

```sh
.git/hooks/pre-commit
```

### OpenAPI

```sh
yarn lint:openapi
```

### Prettier

```sh
yarn lint:prettier
```

or with yarn:

```sh
yarn prettier . --check
```

### tsc

```sh
yarn lint:tsc
```

or with yarn:

```sh
yarn tsc --noEmit --incremental false
```

### Extra: lint Dockerfile

You can run [hadolint](https://github.com/hadolint/hadolint) locally to lint your Dockerfile:

```sh
docker run --rm -i hadolint/hadolint < Dockerfile
```

## Auditing the dependencies

Using [audit-ci](https://github.com/IBM/audit-ci) (this is the one we run during CI):

```sh
yarn run audit
```

Or using Yarn's built-in `audit`command, to get more information:

```sh
yarn audit
```

## Testing

Reminder: you need to set `TEST_APP_NAME`, `TEST_APP_PRIVATE_KEY`, `TEST_CLIENT_DID` and `TEST_CLIENT_PRIVATE_KEY` (preferably in `.env.test.local`) before running the e2e tests!

Run all the tests:

```sh
yarn test
```

If you want to get the code coverage, use the `--coverage` parameter:

```sh
yarn test --coverage
```

Run the unit tests only:

```sh
yarn test:unit
```

Run the end-to-end tests only:

```sh
yarn test:e2e
```

In CI environments, we use a dedicated command that runs unit tests and automatically generates the code coverage and report for SonarQube:

```sh
yarn test:ci
```

## Load testing with k6

All the commands described below are run from the root folder.

In order to run the tests, you must start a local server and, in parallel, run k6.

### Start the API server

If you have installed all the dependencies locally, run:

```sh
yarn build
yarn start:prod
```

Or if you prefer using Docker Compose:

```sh
docker-compose up --build
```

### Run the tests

If you have [installed k6 locally](https://k6.io/docs/getting-started/installation), run:

```sh
k6 run tests/k6/script.js --no-usage-report
```

If you prefer to use Docker, first make sure to download the docker image:

```sh
docker pull loadimpact/k6
```

Then, run the tests:

```sh
docker run -i loadimpact/k6 run -e API_HOSTNAME=host.docker.internal --no-usage-report - <tests/k6/script.js
```

## Serving the OpenAPI specification locally

You can check the OpenAPI definition in a beautiful UI generated by Redoc with the following command:

```sh
yarn start:openapi
```

## Cutting a new release

Create a new release from the `staging` branch, when the code has been tested.

Check the version bump and changelog generation with:

```sh
yarn release --dry-run
```

If the output looks good, run the command without `--dry-run`:

```sh
yarn release
```

Note: if you are releasing the first version of the code, set the version in `package.json` manually, then run `yarn release --first-release`.

Check the changes, commit the code with the message `"chore: release {{currentTag}}"` and push it.

After the `staging` branch has been merged to `main`, create the corresponding tag on `main`, e.g. `v1.2.3`.

## License

Copyright (c) 2019 European Commission
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
