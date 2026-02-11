![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

Working with EBSI services.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Run a project locally](#run-a-project-locally)
- [Linting](#linting)
  - [ESLint](#eslint)
  - [OpenAPI](#openapi)
  - [Prettier](#prettier)
  - [TypeScript Compiler (tsc)](#typescript-compiler--tsc-)
- [Testing](#testing)
- [Load testing with k6](#load-testing-with-k6)
  - [Start the API server](#start-the-api-server)
  - [Run the tests](#run-the-tests)

## Getting started

All the commands described below are run from the root folder.

Ensure correct `.env.default.local` file for the specific service you will be working on. Please refer to the service's subfolder `README.md` file for details regarding which values are required.

### Prerequisites

Please read [the main documentation](../README.md) first.

### Run a project locally

Run the development server:

```sh
yarn nx start {service-name}
```

This command starts the web app at http://localhost:3000

The development server can also be started in Live-reload mode with: `yarn nx start:dev {service-name}`. Every time you make a change, the server will automatically restart after compiling the code.

You can create a production build with:

```sh
yarn nx build {service-name}
```

And then you can serve the production build with:

```sh
yarn nx start:prod {service-name}
```

You can now open http://localhost:3000/{service-name}/{version}/health. If everything's working correctly, then you should see `"status":"ok"`.

## Linting

You can lint the files (ESLint, OpenAPI, tsc) and run Prettier with one command:

```sh
yarn nx lint {service-name}
```

Or you can run the different linters independently:

### ESLint

```sh
yarn nx lint:eslint {service-name}
```

### OpenAPI

```sh
yarn nx lint:openapi {service-name}
```

### Prettier

```sh
yarn nx lint:prettier {service-name}
```

### TypeScript Compiler (tsc)

```sh
yarn nx lint:tsc {service-name}
```

## Testing

Reminder: you need to set the environment variables before running the e2e tests!

Run all the tests:

```sh
yarn nx test {service-name}
```

If you want to get the code coverage, use the `--coverage` parameter:

```sh
yarn nx test {service-name} --coverage
```

Run the unit tests only:

```sh
yarn nx test:unit {service-name}
```

Run the end-to-end tests only:

```sh
yarn nx test:e2e {service-name}
```

In CI environments, we use a dedicated command that runs unit tests and automatically generates the code coverage and report for SonarQube:

```sh
yarn nx test:ci {service-name}
```

### Loading secrets from 1Password

Install and configure the [1Password CLI](https://developer.1password.com/docs/cli), and get access to the shared vaults.

You can then run the e2e tests of any API by loading the `.env.op` file in the corresponding folder. For instance, for Authorisation API v4, run:

```sh
EBSI_ENV=test op run --env-file="apis/authorisation-v4/.env.op" -- yarn nx run @ebsiint-api/authorisation-api-v4:test:e2e
```

## Load testing with k6

In order to run the tests, you must start a local server and, in parallel, run k6.

### Start the API server

Please see above the guide on how to [run a project locally](#run-a-project-locally)

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
docker run -i loadimpact/k6 run -e BASE_URL=http://host.docker.internal:3000 --no-usage-report - <tests/k6/script.js
```

Note: you can also use k6 to test the remote API by configuring BASE_URL:

```sh
BASE_URL=https://api-test.ebsi.eu k6 run tests/k6/script.js --no-usage-report
```
