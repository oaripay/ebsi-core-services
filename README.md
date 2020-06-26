## requirements

Optionally: ganache-cli
https://www.npmjs.com/package/ganache-cli


## install application

```
npm install
cp .env.dist .env
```

## Run

#### Build Contract
```
truffle build
```

#### Deploy Contracts
availble networks (development, intebsi, ebsi) - for the development network it is required to run a ganache-cli
```
truffle migrate --network <network> 
```

usage ganache-cli
```
ganache-cli
```
migrate to localhost:
```
truffle migrate --network development
```

#### Run Tests
```
ganache-cli
truffle test
```

Note: tests can be run in a different network, command `truffle test --network <network>`

## Deployment information

Registry Deployed at `0x72eC77b6d1e52C874e18CeD062bd0b465eDBc870`
