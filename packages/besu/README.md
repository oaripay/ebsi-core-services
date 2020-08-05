![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Hyperledger Besu API

API to interact with Besu RPC.

## Installation

Clone the repository and move to the project directory

```sh
git clone https://ec.europa.eu/cefdigital/code/scm/ebsi/ledger-api.git
```

Create a .env file with the private keys used in the api and the smart contract for notarization

```
API_LEDGER_PRIVATE_KEY=023e3d80808...
BESU_ADDRESS_NOTARY=0x3c5316F3223626f8D8Ea50Eed697F739c2778D3b

```

Also define the enviroment (integration, development, production)

```
EBSI_ENV=integration
```

For building you can choose to build with docker or to build from source directly.

### Build with docker

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

The api will be accesible at http://localhost:8080

## Tests

Create an `.env` file using `.env.example` and update the corresponding values.
For e2e tests, TEST_APP_NAME and TEST_APP_PRIVATE_KEY need to be a valid app registered in the Trusted App Registry.

Launch unit tests and e2e tests with:

```sh
yarn run test
```

To connect with a local api for e2e run:

```sh
EBSI_ENV=local EBSI_API=http://localhost:8080 yarn run test
```

To run only unit tests:

```sh
yarn run test:unit
```

To run only integration tests:

```sh
yarn run test:e2e
```

## Swagger documentation

You can read the documentation at https://api.intebsi.xyz/docs/?urls.primaryName=Ledger%20API

## Licensing

Copyright (c) 2019 European Commission
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
