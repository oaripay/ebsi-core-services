# Timestamp API

Timestamp API is a Core Service of the EBSI platform providing the capability of checking the authenticity of a digital document by verifying the presence and the timestamp of the document's hash in a specific smart contract.

## Installation

Clone the repository and move to the project directory

```
git clone https://ec.europa.eu/cefdigital/code/scm/ebsi/timestamp-api.git
cd timestamp-api/api/besu
```

Create a .env file with the smart contract for notarization

```
BESU_ADDRESS_NOTARY=0x3c5316F3223626f8D8Ea50Eed697F739c2778D3b
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

## Unit Tests

Set the environmental variable `EBSI_ENV` to integration, development or production to determine the location of the Ledger API.

Then run

```
npm run test
```

## Integration tests

Define `EBSI_ENV` to select the location of the timestamp api to test. Run:

```
npm run test:e2e
```

## Swagger documentation

You can read the documentation at https://api.ebsi.xyz/docs/?urls.primaryName=Timestamp%20API
