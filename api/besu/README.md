# EBSI API

The EBSI API is a set of different APIs inside the node that provide services like off-chain storage and interaction with the blockchain.

## Installation

Clone the repository and move to the project directory

```
git clone https://ec.europa.eu/cefdigital/code/scm/ebsi/4-ebsi-api.git
cd 4-ebsi-api
```

Create a .env file with the private keys used in the api and the smart contract for notarization

```
API_BESU_PRIVATE_KEY=023e3d80808...
API_STORAGE_PRIVATE_KEY=5e2446e04ec...
BESU_ADDRESS_NOTARY_V1=0x9a3DBCa554e9f6b9257aAa24010DA8377C57c17e
BESU_ADDRESS_NOTARY_V2=0x3c5316F3223626f8D8Ea50Eed697F739c2778D3b

```

For building you can choose to build with docker or to build from source directly.

### Build with docker

run

```
docker-compose up --build
```

The api will be accesible at http://localhost:8080

### Build from source

Clone the repository and move to the project directory

```
git clone https://ec.europa.eu/cefdigital/code/scm/ebsi/4-ebsi-api.git
cd 4-ebsi-api
```

Install libraries and dependencies

```
npm install
```

Start the api

```
npm run start
```

The api will be accesible at http://localhost:8080

### Cassandra setup

Follow the instructions in `./apis/cassandra-setup.md` to create the tables in cassandra. For testing purposes change the `replication_factor` to 1.

## Swagger documentation

You can read the documentation at https://api.ebsi.xyz/api-docs
