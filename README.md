# Storage API

Storage API is a Core Service of the EBSI platform providing access to the Off-chain Storage services of the lower layer Chain & Storage. This API provides read and write storage capabilities of files and Key-Value.

File Storage API provides read and write files capabilities to off-chain distributed storage in v1 and in future to off-chain private (local) storage and off-chain external storage trusted providers.

Key-Value Storage API provides capabilities to save Key-Value (with data value in JSON format) in the off-chain distributed storage for v1.

## Installation

Clone the repository and move to the project directory

```
git clone https://ec.europa.eu/cefdigital/code/scm/ebsi/storage-api.git
cd storage-api/api/besu
```

Create a .env file with the private key used in the api

```
API_STORAGE_PRIVATE_KEY=023e3d80808...
```

Also define the enviroment (integration, development, production)

```
EBSI_ENV=integration
```

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
npm install
```

Start the api

```
npm run start
```

The api will be accesible at http://localhost:8080

## Test

Set the environmental variable `EBSI_ENV` to integration, development or production to determine the location of Besu RPC node.

Then run

```
npm run test
```

## Swagger documentation

You can read the documentation at https://api.intebsi.xyz/docs/?urls.primaryName=Storage%20API
