![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Ledger API

API to interact with Besu API and Hyperledger Fabric API. In the `packages/` folder, you will find both apis.
Besu API is based on NodeJS. Fabric API is based on Java.

In development, you can run both project separately. Refer to their own documentation for more information.

## Installing

```sh
yarn install
yarn run bootstrap
```

## Run with Docker Compose

Before starting Docker Compose, create a copy of `.env.example` and name it `.env`. Set the environment variables accordingly.

Copy into `packages/fabric/ssl/tlsca.pem` the corresponding certificate to connect with Hyperledger Fabric.

Now, run:

```sh
docker-compose up --build
```

The api will be accesible at http://localhost:8080

## Testing

Test Besu

```sh
yarn run test:besu
```

Test Fabric
Launch the api with docker

```sh
yarn run test:fabric-e2e
```

## Licensing

Copyright (c) 2019 European Commission  
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
