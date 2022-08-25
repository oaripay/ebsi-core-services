![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

# Storage API

The Storage API is a generic supporting Core Service of the EBSI platform
providing access to the Off-chain Storage services of the lower layer Chain &
Storage, but will limit in terms of storage capacity, as EBSI Project doesn't
have the vocation of being a storage cloud provider.

This API provides read and write storage capabilities of files and Key-Value
for multiple storage systems:

- File Storage API: provides CRUD operations for files in the off-chain distributed storage.

- Key-Value Storage API: provides CRUD operations for Key-Value (with data value in JSON format) in the off-chain distributed storage.

It also has a special JSON-RPC endpoint that serves as a proxy between Core
APIs and the distributed storage. Only the Storage API has direct access to
distributed storage infrastructure (Cassandra for v2.0).

The EBSI MS nodes are not an off-chain or cloud storage provider
infrastructure. The off-chain storage capabilities provided by EBSI are
limited to the available resources of the MS Node infrastructure. The storage
capabilities have the goal to support the deployment and integration of the
exposed core services and approved business applications.

For more information see:

- [Technical Specifications](https://ec.europa.eu/digital-building-blocks/wikis/x/VYiWFQ)
- API catalogs:
  - [EBSI Pre-production network API Catalog](https://api.preprod.ebsi.eu/docs)
  - [EBSI Production network API Catalog](https://api.ebsi.eu/docs)

## Table of Contents

- [Storage API](#storage-api)
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
    - [Test consistency level in a network](#test-consistency-level-in-a-network)
  - [Load testing with k6](#load-testing-with-k6)
    - [Start the API server](#start-the-api-server)
    - [Run the tests](#run-the-tests)
  - [Cutting a new release](#cutting-a-new-release)
  - [Troubleshooting](#troubleshooting)
  - [License](#license)

## Getting started

You can choose to run the project locally with your own Node.js environment, or you can use Docker Compose to run it.

First, create an `.env.local` file locally. You can duplicate the content of `.env.default` or only set the variables that you want to change.

You must at least set `EBSI_ENV` to run the API. For e2e testing, you must also set `TEST_APP_NAME`, `TEST_APP_PRIVATE_KEY`, `TEST_CLIENT_KID` and `TEST_CLIENT_PRIVATE_KEY`.

You can also define consistency desired for read/write operations in cassandra (this API is not using lightweight transactions).

```
CONSISTENCY=one
```

There are 10 possible values for consistency and serial consistency.

- **any**. Writing: A write must be written to at least one node. If all replica nodes for the given row key are down, the write can still succeed after a hinted handoff has been written. If all replica nodes are down at write time, an ANY write is not readable until the replica nodes for that row have recovered.
- **one**. Returns a response from the closest replica, as determined by the snitch.
- **two**. Returns the most recent data from two of the closest replicas.
- **three**. Returns the most recent data from three of the closest replicas.
- **quorum**. Reading: Returns the record with the most recent storage after a quorum of replicas has responded regardless of data center. Writing: A write must be written to the commit log and memory table on a quorum of replica nodes.
- **all**. Reading: Returns the record with the most recent storage after all replicas have responded. The read operation will fail if a replica does not respond. Writing: A write must be written to the commit log and memory table on all replica nodes in the cluster for that row.
- **localQuorum**. Reading: Returns the record with the most recent storage once a quorum of replicas in the current data center as the coordinator node has reported. Writing: A write must be written to the commit log and memory table on a quorum of replica nodes in the same data center as the coordinator node. Avoids latency of inter-data center communication.
- **eachQuorum**. Reading: Returns the record once a quorum of replicas in each data center of the cluster has responded. Writing: Strong consistency. A write must be written to the commit log and memtable on a quorum of replica nodes in all data centers.
- **localOne**. Similar to One but only within the DC the coordinator is in.

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

You can now open http://localhost:3000/storage/v3/health. If everything's working correctly, then you should see `"status":"ok"`.

### Run with Docker

Make sure you have an instance of cassandra running and configure the connection by creating the `.env.local` file (for testing purposes see Testing section). Then, run:

```sh
docker-compose up --build
```

Check http://localhost:3000/storage/v3/health to see if it's working.

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

Reminder: you need to set `TEST_APP_NAME`, `TEST_APP_PRIVATE_KEY`, `TEST_CLIENT_KID` and `TEST_CLIENT_PRIVATE_KEY` (preferably in `.env.test.local`) before running the e2e tests! They must refer to a valid app registered in the Trusted Apps Registry.

Before launching the e2e tests, make sure to run Cassandra using the docker-compose.yml in the tests folder:

```sh
cd tests
docker-compose up --build
```

Create the keyspace and tables:

```sh
cd ..
yarn configure:cassandra
```

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

### Test consistency level in a network

Consistency refers to the level of replication we want to achieve for each write/read in cassandra. Start the network defined in `tests/docker-compose-network.yml`.

```sh
docker-compose -f tests/docker-compose-network.yml up --build
```

This compose will start 3 nodes in cassandra with the following topology: One node in the datacenter `datacenter1` and two nodes in the datacenter `datacenter2`, and all of them in the cluster `c1`.

Enter to the first node and define the network strategy:

```
docker exec -it cassandra-node1 bash
cqlsh
create keyspace ebsi_integration with replication = { 'class':'NetworkTopologyStrategy', 'datacenter1' : 1, 'datacenter2' : 2};
```

The setup is ready to test the network. Run the e2e tests defining quorum consistency:

```
EBSI_ENV=local CONSISTENCY=quorum yarn test:e2e
```

If you stop 2 nodes in the network and run again the tests it will fail.

Now use local consistency

```
EBSI_ENV=local CONSITENCY=localQuorum yarn test:e2e
```

Using this consistency the API will only accept the confirmation of the datacenter `datacenter1`, which is the local datacenter defined in the api.

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
