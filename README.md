![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Identity Hub API

> Identity Hub API is a Core Service of the EBSI platform providing the capability of securely storing W3C Verifiable Credentials/Attestations.

## Table of Contents

1. [Getting started](#Getting)
2. [Building](#Building)
3. [Testing](#Testing)
4. [Swagger Documentation](#Swagger-Documentation)
5. [Licensing](#Licensing)

## Getting started

### Prerequisites

Required libraries:

- typescript

### Installing

Clone the repository and move to the project directory

```sh
git clone https://ec.europa.eu/cefdigital/code/scm/ebsi/identity-hub-api.git
cd identity-hub-api
```

#### Docker Build and Up

Copy `.env.example.docker` to `.env` and set the following environment variables:

- `component_keystore`= <-- TYPE HERE COMPONENT KEYSTORE
- `component_password`= <-- TYPE HERE COMPONENT PASSWORD
- `did_registry_sc_address`= <-- TYPE HERE DID REGISTRY SC ADDRESS

Build and Run ebsi-identity-hub-api Docker Image

```sh
docker-compose up --build
```

To stop the container, just press `Ctrl^C` and to remove the container:

```sh
docker-compose down
```

## Building

Clone the repository and move to the project directory:

```sh
git clone https://ec.europa.eu/cefdigital/code/scm/ebsi/identity-hub-api.git
cd identity-hub-api
```

Install the required libraries and packages dependencies

```sh
npm i
```

Build project

```sh
npm run build
```

Start the swagger service API

```sh
npm run start
```

This command starts a node server exposing the EBSI Swagger API at <http://localhost:9000/identity-hub/v1/api-docs/> where you can play with the EBSI API.

## Testing

Copy .env.example to .env and set the following environment variables:

- `EBSI_ENV` : set to test, local, integration, development or production
- `COMPONENT_PASSWORD` <-- TYPE HERE COMPONENT PASSWORD
- `COMPONENT_KEYSTORE` <-- TYPE HERE COMPONENT KEYSTORE
- `DID_REGISTRY_SC_ADDRESS` <-- TYPE HERE DID REGISTRY SC ADDRESS

### Unit tests

Run

```sh
npm run test
```

### Integration tests

Run

```sh
npm run test:e2e
```

### Unit & Integration tests

Run

```sh
npm run test:all
```

## Swagger Documentation

This projects contains the Identity Hub API EBSI Service:

Identity Hub API is a Core Service of the EBSI platform providing the capability of securely storing W3C Verifiable Credentials/Attestations.
You can read the documentation at <https://api.ebsi.xyz/identity-hub/v1/api-docs>.

## Licensing

Copyright (c) 2019 European Commission  
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
