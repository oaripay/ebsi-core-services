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

### Requirements:
 - node 12 (use nvm)
 - ganache-cli
Run
```sh
ganache-cli --gasLimit=8000000 --allowUnlimitedContractSize
truffle test
```




## Licensing

Copyright (c) 2019 European Commission  
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence"); 
You may not use this work except in compliance with the Licence. 
You may obtain a copy of the Licence at: 
* https://joinup.ec.europa.eu/page/eupl-text-11-12  

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.


#Migration intebsi info:

```
Compiling your contracts...
===========================
> Everything is up to date, there is nothing to compile.


Starting migrations...
======================
> Network name:    'intebsi'
> Network id:      6971
> Block gas limit: 0x1fffffffffffff


1_initial_migration.js
======================

   Replacing 'Migrations'
   ----------------------
   > transaction hash:    0x39f86b4d9385b9ac928984cc67d84adc19058b8d3dbbfc951552d64d4a2ca96f
   > Blocks: 0            Seconds: 0
   > contract address:    0x2E6499993037Bfd9F81f4C3e5a815e2Ce8FB0fb7
   > block number:        1641298
   > block timestamp:     1588161258
   > account:             0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73
   > balance:             0
   > gas used:            263741
   > gas price:           0 gwei
   > value sent:          0 ETH
   > total cost:          0 ETH


   > Saving migration to chain.
   > Saving artifacts
   -------------------------------------
   > Total cost:                   0 ETH


2_deploy_contracts.js
=====================
Deploying Universities Trusted Issuers smart contract on network:  intebsi

   Replacing 'UniversitiesTrustedIssuers'
   --------------------------------------
   > transaction hash:    0x1dd23a46de62d1876fdb9d24f713c6965acd568ba1a46cf1ba47fb3601e5dcd7
   > Blocks: 0            Seconds: 0
   > contract address:    0xcb29a1C8bf556047e164A51EB011B5b3047348f7
   > block number:        1641301
   > block timestamp:     1588161264
   > account:             0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73
   > balance:             0
   > gas used:            7054160
   > gas price:           0 gwei
   > value sent:          0 ETH
   > total cost:          0 ETH

Contract deployed at address 0xcb29a1C8bf556047e164A51EB011B5b3047348f7
Deploying Governments Trusted Issuers smart contract on network:  intebsi

   Replacing 'GovernmentsTrustedIssuers'
   -------------------------------------
   > transaction hash:    0x4e0bb7f092ae66e0ebd732cb13a9c1ca6083afaf135d6a4037089043b74dd30d
   > Blocks: 2            Seconds: 4
   > contract address:    0xCa5D58D19775dE8e14CF8a1aEeC880f7cC31f902
   > block number:        1641304
   > block timestamp:     1588161270
   > account:             0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73
   > balance:             0
   > gas used:            3454563
   > gas price:           0 gwei
   > value sent:          0 ETH
   > total cost:          0 ETH

Contract deployed at address 0xCa5D58D19775dE8e14CF8a1aEeC880f7cC31f902
Adding university Diploma Sample App: Issue Master's Diploma code did:ebsi:0x464190367BE948210608a46847bed183607f685A
Adding diploma Sample University - Master's Programme to the university Diploma Sample App: Issue Master's Diploma
Adding accreditation Europass Accreditation Database to the university Diploma Sample App: Issue Master's Diploma
Adding Government Sample Verifiable ID Issuer code did:ebsi:0x9f99F1f7482bC56735f8Df9f3Ffb280d54395c49
Adding Government Sample Verifiable ID Issuer document
Adding Flamish GOV Univ Sample Verifiable ID Issuer code did:ebsi:0x9f99F1f7482bC56735f8Df9f3Ffb280d54395c49
Adding diploma Diploma Sample App: Issue Bachelor's Diploma to the Universities Sample Verifiable ID Issuer
Adding accreditation Europass Accreditation Database to the government Sample Verifiable ID Issuer

   > Saving migration to chain.
   > Saving artifacts
   -------------------------------------
   > Total cost:                   0 ETH


Summary
=======
> Total deployments:   3
> Final cost:          0 ETH



```

