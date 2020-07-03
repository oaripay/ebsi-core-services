![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Hyperledger Fabric API

API to interact with Hyperledger Fabric. This code is written in Java.

### Build with docker

Create a copy of `.env.example` and name it `.env`. Set the environment variables accordingly. Copy into `packages/fabric/ssl/tlsca.pem` the corresponding certificate to connect with Hyperledger Fabric.

Now, run:

```sh
docker-compose up --build
```

The api will be accesible at http://localhost:8081

## e2e Tests

Tests are done using nodejs with jest. Go to the test folder and install dependencies:

```
cd tests
npm install
```

Run the api in a docker container as presented in the previous section.

Create a copy of `.env` file. Set `EBSI_ENV=local` and the url of the api in `EBSI_API` (example `http://localhost:8081`).

Run the tests

```
npm run test
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
