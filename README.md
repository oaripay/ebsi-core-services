![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Ledger API

Ledger API is a Core Service of the EBSI platform providing access to the EBSI Ledger Protocols and Smart Contracts services of the lower layer Chain & Storage. In v1 we provide capabilities to interact with Hyperledger Besu and Fabric ledgers.

For Besu, we are exposing a selected set of BESU RPC native APIs. Write operations require authentication.

For Fabric, we start in v1 by providing an initial set of read REST API to interact with the ledger.

## Installation

Clone the repository and move to the project directory

```sh
git clone https://ec.europa.eu/cefdigital/code/scm/ebsi/ledger-api.git
```

Create a copy of `.env.example` and name it `.env`. Set the environment variables accordingly.

Fabric requires certificates to connect with the different peers, copy the `peerOrganizations` folder in the root of the project.

For building you can choose to build with docker or to build from source directly.

## Run with Docker Compose

Run:

```sh
docker-compose up --build
```

The api will be accesible at http://localhost:8080

### Build from source

Install libraries and dependencies:

```sh
yarn install
```

Start the API:

```sh
yarn run start
```

The API will be accesible at http://localhost:8080

## Testing

### Unit Tests

```sh
yarn run test:unit
```

### e2e Tests

For e2e tests, TEST_APP_NAME and TEST_APP_PRIVATE_KEY need to be a valid app registered in the Trusted App Registry.

Launch the API with Docker, then set the environment to local and the url to access it:

```sh
EBSI_ENV=local EBSI_API=http://localhost:8080 yarn test:e2e
```

To test the integration environment run:

```sh
EBSI_ENV=integration yarn test:e2e
```

## Licensing

Copyright (c) 2019 European Commission
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
