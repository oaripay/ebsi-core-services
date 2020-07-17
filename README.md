![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Timestamp API

Timestamp API is a Core Service of the EBSI platform providing the capability of checking the authenticity of a digital document by verifying the presence and the timestamp of the document's hash in a specific smart contract.

## Installation

Clone the repository and move to the project directory

```
git clone https://ec.europa.eu/cefdigital/code/scm/ebsi/timestamp-api.git
```

Copy `.env.example` and rename it as `.env`. Set there corresponding besu address for notarization.

For building you can choose to build with docker or to build from source directly.

### Build with docker

run

```
docker-compose up --build
```

The api will be accesible at http://localhost:8080

### Build from source

Install libraries and dependencies

```
yarn install
```

Start the api

```
yarn run start
```

The api will be accesible at http://localhost:8080

## Unit Tests

```
yarn run test:unit
```

## Integration tests

Define `EBSI_ENV` to select the location of the timestamp api to test. Run:

```
yarn run test:e2e
```

## OpenAPI documentation

You can read the documentation at https://api.ebsi.xyz/docs/?urls.primaryName=Timestamp%20API

## Licensing

Copyright (c) 2019 European Commission  
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
