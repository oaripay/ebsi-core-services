![Logo of the project](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Diploma Smart Contract
> Smart Contract for the Diploma Use Case

## Table of Contents

1. [Getting started](#Getting)
2. [Building](#Building)
3. [Deploying](#Deploying)
4. [Testing](#Testing)
5. [Licensing](#Licensing)


## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/en/download/)
- Truffle 
```npm install -g truffle```
- Ganache
```npm install -g ganache-cli```

### Installing
1. Install dependencies:
```sh
npm install
```
2. Then start ganache in a separate terminal:
```sh
ganache-cli
```

## Building
Build the smart contracts:
```sh
truffle build
```

## Deploying
Deploy the smart contracts
```sh
truffle migrate --network ebsi --reset
```

## Testing
Run
```sh
truffle test
```




## Licensing

Copyright (c) 2019 European Commission  
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence"); 
You may not use this work except in compliance with the Licence. 
You may obtain a copy of the Licence at: 
* https://joinup.ec.europa.eu/page/eupl-text-11-12  

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.