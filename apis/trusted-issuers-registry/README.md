![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

# Trusted Issuers Registry

Trusted Issuers Registry (TIR) is a generic decentralised registry holding information about trusted issuers, like public information, accreditations and other. All information is stored in the smart contract in form of Attribute envelops (like Verifiable Credentials) that are issued by Trusted Issuers or self-issued. Generic Envelop (like Verifiable Credential) validation is performed outside EBSI.

EBSI Trusted Issuers Registry (TIR) is a generic decentralised registry component and is used as a core component of the European Self Sovereign Identity Framework (ESSIF) that enables to validate the identity and accreditations of Trusted Issuers.

TIR smart contract is deployed on the permissioned EBSI ledger that has the advantages of being public while at the same time ensuring the highest level of trust and transparency. Furthermore, TIR has high availability due to the redundancy of the EBSI Ledger; has no single point of failure; is transparent, traceable, immutable and cryptographically secure. The immutable nature of the ledger enables one to validate whether an issuer was eligible to issue a specific Verifiable Credential/Claim/Attestation at a certain time.

The TIR service consists of a smart contract (TIR SC) and API (TIR API). The TIR SC is an Ethereum SC is deployed on the EBSI ledger. All public smart contract methods are exposed via APIs. Two types of APIs are delivered, JSON-RPC for write and REST for the read operations. The TIR API enables to manage and verify Trusted Issuers information and accreditations. Accreditation of trusted issuers domain-specific and is outside the EBSI scope.

For more information see:

- [TIR API Technical Specifications](https://ec.europa.eu/digital-building-blocks/wikis/x/S4iWFQ)
- [TIR Smart Contract Technical Specifications](https://ec.europa.eu/digital-building-blocks/wikis/x/tYiWFQ)
- API catalogs:
  - [EBSI Pre-production network API Catalog](https://api.preprod.ebsi.eu/docs)
  - [EBSI Production network API Catalog](https://api.ebsi.eu/docs)

## Table of Contents

- [Trusted Issuers Registry](#trusted-issuers-registry)
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
  - [Cutting a new release](#cutting-a-new-release)
  - [License](#license)

## Getting started

You can choose to run the project locally with your own Node.js environment, or you can use Docker Compose to run it.

First, create an `.env.default.local` file locally. You can duplicate the content of `.env.default` or only set the variables that you want to change.

Please note that you need to fill the `API_PRIVATE_KEY`, `TEST_USER_PRIVATE_KEY` and `TEST_ADMIN_PRIVATE_KEY` environment variables with secp256k1 elliptic curve private keys in hexadecimal.

You must at least set `API_NAME`, `API_PRIVATE_KEY`, `BESU_TRUSTED_ISSUERS_REGISTRY_ADDRESS`, and `DOMAIN` to run the API. For e2e testing, you must also set `TEST_ADMIN_PRIVATE_KEY`, `TEST_ADMIN_KID`, `TEST_USER_PRIVATE_KEY`, `TEST_USER_KID`, `TEST_ISSUER_WITH_PROXY_KID`, and `TEST_ISSUER_WITH_PROXY_PRIVATE_KEY`.

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

### Run with Docker

After creating the `.env.default.local` file, run:

```sh
docker-compose up --build
```

You can now open http://localhost:3000/trusted-issuers-registry/v3/health. If everything's working correctly, then you should see "ok".

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
yarn eslint . --ext .ts
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

### Extra: lint Dockerfile

You can run [hadolint](https://github.com/hadolint/hadolint) locally to lint your Dockerfile:

```sh
docker run --rm -i hadolint/hadolint < Dockerfile
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
docker run -i loadimpact/k6 run -e BASE_URL=http://host.docker.internal:3000 --no-usage-report - <tests/k6/script.js
```

Note: you can also use k6 to test the remote API by configuring BASE_URL:

```sh
BASE_URL=https://test.intebsi.xyz k6 run tests/k6/script.js --no-usage-report
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

Note: if you are releasing the first version of the code, set the version in `package.json` to `1.0.0` manually, then run `yarn release --first-release`.

Check the changes, commit the code with the message `"chore: release {{currentTag}}"` and push it.

After the `staging` branch has been merged to `main`, create the corresponding tag on `main`, e.g. `v1.2.3`.

## License

Copyright (c) 2019 European Commission
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
