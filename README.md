![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Storage API

Storage API is a Core Service of the EBSI platform providing access to the Off-chain Storage services of the lower layer Chain & Storage. This API provides read and write storage capabilities of files, Key-Value, and notifications (notifications only for wallet).

File Storage API provides read and write files capabilities to off-chain distributed storage in v1 and, in the future, to off-chain private (local) storage and off-chain external storage trusted providers.

- Data stored: uuid, filename, hash, binary data (max size 16MB)

Key-Value Storage API provides capabilities to save Key-Value (with data value in JSON format) in the off-chain distributed storage for v1.

- Data stored: key (max size 256 bytes), value (max size 1MB)

Notification Storage API provides capabilities to store notifications in the off-chain distributed storage for v1. This API is used by the wallet in order to handle notifications.

## Installation

Clone the repository and move to the project directory

```sh
git clone https://ec.europa.eu/cefdigital/code/scm/ebsi/storage-api.git
```

Create a .env file with the private key used in the API:

```
API_PRIVATE_KEY=023e3d80808...
```

This private key can be generated using ethers: https://docs.ethers.io/ethers.js/html/api-wallet.html or just taking a random string of 64 characters in hex format.

Also, define the enviroment (local, integration, development, production):

```
EBSI_ENV=integration
```

For building, you can choose to build with Docker (recommended) or to build from source directly.

### Build with docker

Run:

```sh
docker-compose up --build
```

Create the keyspace in Cassandra. First: enter into the container:

```sh
docker exec -it cassandradb bash
```

Enter into the cassandra command line:

```sh
cqlsh
```

And finally define the keyspace:

```sh
create keyspace ebsi_integration with replication = {'class':'SimpleStrategy','replication_factor':1};
```

For testing purposes, set `replication_factor` to 1, because there is only 1 node. For production, set a bigger number depending on the nodes in the network.

The API connects with this keyspace and create the tables automatically.

The API will be accesible at http://localhost:8080

### Build from source

Install libraries and dependencies:

```sh
yarn install
```

Edit `./src/config.js` to define the connection with cassandra. By default it will try to access the container "cassandradb" or "localhost".

Start the API:

```sh
yarn run start
```

The API will be accesible at http://localhost:8080

## Tests

Tests for File Storage, Key Value Storage, and Notification Storage and their connection with Cassandra. Create an `.env` file using `.env.example` and update the corresponding values.

For e2e tests, TEST_APP_NAME and TEST_APP_PRIVATE_KEY need to be a valid app registered in the Trusted App Registry.

Before launching the tests run cassandra using the docker in the tests folder:

```sh
cd tests
docker-compose up --build
```

Create the keyspace in Cassandra. First, enter into the container:

```sh
docker exec -it cassandradb_test bash
```

Enter to the cassandra command line:

```sh
cqlsh
```

And finally define the keyspace:

```sh
create keyspace ebsi_integration with replication = {'class':'SimpleStrategy','replication_factor':1};
```

Now, launch the unit tests and e2e tests:

```sh
yarn run test
```

To connect with a local API for e2e testing, run:

```sh
EBSI_ENV=local EBSI_API=http://localhost:8080 yarn run test
```

To run only unit tests (cassandra container is not necessary):

```sh
yarn run test:unit
```

To run only integration tests, launch cassandra and run:

```sh
yarn run test:e2e
```

## OpenAPI documentation

You can read the documentation at https://api.intebsi.xyz/docs/?urls.primaryName=Storage%20API

## Licensing

Copyright (c) 2019 European Commission
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
