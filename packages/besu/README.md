# Hyperledger Besu API

API to interact with Besu RPC.

## Installation

Clone the repository and move to the project directory

```
git clone https://ec.europa.eu/cefdigital/code/scm/ebsi/ledger-api.git
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

Integration tests can be done locally or connecting to an existing api deployed.

- Run `EBSI_ENV=local npm run test:e2e` to run the tests without launching the api.
- Run `EBSI_ENV=integration npm run test:e2e` to run the tests connecting to the api in the integration environment.
- Run `EBSI_ENV=local EBSI_API=http://localhost:8080 npm run test:e2e` to run the tests connecting to a particular api already launched and listening in the url `EBSI_API`

If you run it locally you can add `EBSI_TEST_MODE=true` to not connect to the Trusted App Registry when doing `/sessions`. If this variable is not set then both `TEST_APP_NAME` and `TEST_APP_PRIVATE_KEY` must correspond with an app registered and authorized in the Trusted App Registry.

## Swagger documentation

You can read the documentation at https://api.intebsi.xyz/docs/?urls.primaryName=Ledger%20API
