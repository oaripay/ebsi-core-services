![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

# Proxy Data Hub API

Proxy Data Hub API is a Core Service of the EBSI platform providing the capability of securely storing W3C Verifiable Credentials/Attestations.

For more information see:

- [Technical Specifications](https://ec.europa.eu/digital-building-blocks/wikis/x/HoiWFQ)
- API catalogs:
  - [EBSI Pre-production network API Catalog](https://api.preprod.ebsi.eu/docs)
  - [EBSI Production network API Catalog](https://api.ebsi.eu/docs)

## Getting started

You can choose to run the project locally with your own Node.js environment, or you can use Docker Compose to run it.

First, create an `.env.local` file locally. You can duplicate the content of `.env` or only set the variables that you want to change.

Please note that you need to fill the `API_PRIVATE_KEY` environment variable with secp256k1 elliptic curve private keys in hexadecimal.

You must at least set `API_PRIVATE_KEY`, `EBSI_ENV` and `DOMAIN` to run the API.

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

You can now open http://localhost:3000/proxy-data-hub/v3/health. If everything's working correctly, then you should see `"status":"ok"`.

### Run with Docker

Make sure you have an instance of cassandra running and configure the connection by creating the `.env.local` file (for testing purposes see Testing section). Then, run:

```sh
docker-compose up --build
```

Check http://localhost:3000/proxy-data-hub/v3/health to see if it's working.

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

To run all the tests, type:

```sh
yarn test
```

If you want to get the code coverage, use the `--coverage` parameter:

```sh
yarn test --coverage
```

Run the unit tests only (you don't need to start Cassandra for them):

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

Note: if you are releasing the first version of the code, set the version in `package.json` manually, then run `yarn release --first-release`.

Check the changes, commit the code with the message `"chore: release {{currentTag}}"` and push it.

After the `staging` branch has been merged to `main`, create the corresponding tag on `main`, e.g. `v1.2.3`.

## Troubleshooting

If a node crashes, try to restart it again. If you see the error `Not marking nodes down due to local pause` this is probably related to limitations in the hardware. Create a network with only 2 nodes and try again.

Refs:

- https://support.datastax.com/hc/en-us/articles/360002677617-FAQ-What-does-FailureDetector-Not-marking-nodes-down-due-to-local-pause-mean-
- https://docs.datastax.com/en/dse-planning/doc/planning/capacityPlanning.html

## License

Copyright (c) 2019 European Commission
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
