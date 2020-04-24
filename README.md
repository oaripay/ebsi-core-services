# Storage API

Storage API is a Core Service of the EBSI platform providing access to the Off-chain Storage services of the lower layer Chain & Storage. This API provides read and write storage capabilities of files and Key-Value.

File Storage API provides read and write files capabilities to off-chain distributed storage in v1 and in future to off-chain private (local) storage and off-chain external storage trusted providers.

- Data stored: uuid, filename, hash, binary data (max size 16MB)

Key-Value Storage API provides capabilities to save Key-Value (with data value in JSON format) in the off-chain distributed storage for v1.

- Data stored: key (max size 256 bytes), value (max size 1MB)

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

```
npm run test
```

## Swagger documentation

You can read the documentation at https://api.intebsi.xyz/docs/?urls.primaryName=Storage%20API
