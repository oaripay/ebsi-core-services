# Storage API

Storage API is a Core Service of the EBSI platform providing access to the Off-chain Storage services of the lower layer Chain & Storage. This API provides read and write storage capabilities of files, Key-Value, and notifications (notifications only for wallet).

File Storage API provides read and write files capabilities to off-chain distributed storage in v1 and in future to off-chain private (local) storage and off-chain external storage trusted providers.

- Data stored: uuid, filename, hash, binary data (max size 16MB)

Key-Value Storage API provides capabilities to save Key-Value (with data value in JSON format) in the off-chain distributed storage for v1.

- Data stored: key (max size 256 bytes), value (max size 1MB)

Notification Storage API provides capabilities to store notifications in the off-chain distributed storage for v1. This API is used by the wallet in order to handle notifications.

## Installation

Clone the repository and move to the project directory

```
git clone https://ec.europa.eu/cefdigital/code/scm/ebsi/storage-api.git
```

Create a .env file with the private key used in the api

```
API_STORAGE_PRIVATE_KEY=023e3d80808...
```

This private key can be generated using ethers: https://docs.ethers.io/ethers.js/html/api-wallet.html or just taking a random string of 64 characters in hex format.

Also define the enviroment (local, integration, development, production)

```
EBSI_ENV=integration
```

For building you can choose to build with docker (recommended) or to build from source directly.

### Build with docker

run

```
docker-compose up --build
```

Create the keyspace in Cassandra. First enter to the container

```
docker exec -it cassandradb bash
```

Enter to the cassandra command line

```
cqlsh
```

And finally define the keyspace:

```
create keyspace ebsi_integration with replication = {'class':'SimpleStrategy','replication_factor':1};
```

The api connects with this keyspace and create the tables automatically.

The api will be accesible at http://localhost:8080

### Build from source

Install libraries and dependencies

```
npm install
```

Edit `./src/config.js` to define the connection with cassandra. By default it is defined as the container "cassandradb".

Start the api

```
npm run start
```

The api will be accesible at http://localhost:8080

## Unit Tests

Unit tests do not include tests that requires access to Cassandra.

```
npm run test
```

## Integration tests

Integration tests for File Storage, Key Value Storage, and Notification Storage and their connection with Cassandra.

- Create an .env file using .env.example
- Deploy the api `docker-compose up --build`
- Run `npm run test:e2e`

These tests can be used to check a local api or an api deployed in integration or development environment.
To test it locally deploy the api using EBSI_TEST_MODE=true and EBSI_ENV=local. In this case, the api will not check the Trusted App Registry for sessions.
To test the integration or development environment define in TEST_APP_NAME and TEST_APP_PRIVATE_KEY with a valid app registered in the Trusted App Registy.

## Swagger documentation

You can read the documentation at https://api.intebsi.xyz/docs/?urls.primaryName=Storage%20API
