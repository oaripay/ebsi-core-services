# Hyperledger Besu API

API to interact with Besu RPC.

## Installation

Clone the repository and move to the project directory

```
git clone https://ec.europa.eu/cefdigital/code/scm/ebsi/ledger-api.git
```

This repo contains Fabric and Besu APIs. Go to the folder for Besu:

```
cd ledger-api/api/besu
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

## Unit tests

Set the environmental variable `EBSI_ENV` to integration, development or production to determine the location of Besu RPC node.

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

You can read the documentation at https://api.intebsi.xyz/docs/?urls.primaryName=Ledger%20API
