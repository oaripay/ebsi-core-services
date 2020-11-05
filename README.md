![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Notifications API

This repository contains the code of Notifications API.

## Table of Contents

1. [Getting started](#getting-started)
2. [Linting](#linting)
3. [Auditing the dependencies](#auditing-the-dependencies)
4. [Testing](#testing)
5. [Serving the OpenAPI specification locally](#serving-the-openapi-specification-locally)
6. [Cutting a new release](#cutting-a-new-release)
7. [License](#license)

## Getting started

You can choose to run the project locally with your own Node.js environment, or you can use Docker Compose to run it.

First, create an `.env.local` file locally. You can duplicate the content of `.env` or only set the variables that you want to change.

Please note that you need to fill the API_PRIVATE_KEY env variable with a secp256k1 elliptic curve private key in hexadecimal.

You must at least set `API_PRIVATE_KEY`, `EBSI_ENV`, `CASSANDRA_USER`, and `CASSANDRA_PASSWORD`.

### Consistency

Read and write consistencies can be defined independently by setting `CASSANDRA_CONSISTENCY_READ` and `CASSANDRA_CONSISTENCY_WRITE` respectively. There are 10 possible values:

- **any**. Writing: A write must be written to at least one node. If all replica nodes for the given row key are down, the write can still succeed after a hinted handoff has been written. If all replica nodes are down at write time, an ANY write is not readable until the replica nodes for that row have recovered.
- **one**. Returns a response from the closest replica, as determined by the snitch.
- **two**. Returns the most recent data from two of the closest replicas.
- **three**. Returns the most recent data from three of the closest replicas.
- **quorum**. Reading: Returns the record with the most recent timestamp after a quorum of replicas has responded regardless of data center. Writing: A write must be written to the commit log and memory table on a quorum of replica nodes.
- **all**. Reading: Returns the record with the most recent timestamp after all replicas have responded. The read operation will fail if a replica does not respond. Writing: A write must be written to the commit log and memory table on all replica nodes in the cluster for that row.
- **localQuorum**. Reading: Returns the record with the most recent timestamp once a quorum of replicas in the current data center as the coordinator node has reported. Writing: A write must be written to the commit log and memory table on a quorum of replica nodes in the same data center as the coordinator node. Avoids latency of inter-data center communication.
- **eachQuorum**. Reading: Returns the record once a quorum of replicas in each data center of the cluster has responded. Writing: Strong consistency. A write must be written to the commit log and memtable on a quorum of replica nodes in all data centers.
- **localOne**. Similar to One but only within the DC the coordinator is in.

By default both of them are defined as `one`.

### Run the project locally

Install the required dependencies:

```sh
yarn install
```

Define the contact points of cassadra using CASSANDRA_CONTACT_POINTS env variable. By default it will try to access the container "cassandradb" or "localhost".

Run the development server:

```sh
yarn start
```

This command starts the web app at http://localhost:3000

The development server can also be started in Live-reload mode with: `yarn start:dev`. Every time you make a change, the server will automatically restart after compiling the code.

Additionally, you can run the server with Hot-Module Replacement with: `yarn start:hmr`. When you make a change, only the changed files are recompiled.

You can create a production build with:

```sh
yarn build
```

And then you can serve the production build with:

```sh
yarn start:prod
```

### Run with Docker

After creating the `.env.local` file, run:

```sh
docker-compose up --build
```

The compose file will start two containers: cassandradb and notifications api.

Run the script to configure the keyspace in cassandra, the table and user permissions (the CASSANDRA_KEYSPACE variable must be defined in the env file):

```sh
yarn configure:cassandra
```

You can now open http://localhost:3000/notifications/v1/health. If everything's working correctly, then you should see "ok".

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
