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





Starting migrations...
======================
> Network name:    'intebsi'
> Network id:      6971
> Block gas limit: 0x1fffffffffffff


1_initial_migration.js
======================

   Deploying 'Migrations'
   ----------------------
   > transaction hash:    0x68403616b03e6ad28b5a4711efe38b52a56d43047a692209dfa9dac0f04daadd
   > Blocks: 0            Seconds: 0
   > contract address:    0x3b7f51aBe2E8e6Af03e1571dB791DDA7B5a68cE6
   > block number:        49687
   > block timestamp:     1581423404
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
Deploying Ethereum Did Registry on the network

   Deploying 'EthereumDIDRegistry'
   -------------------------------
   > transaction hash:    0xb6913fbaa27e10295b0138051c255d718b654e49b85449582f43aa0e296d60ae
   > Blocks: 0            Seconds: 0
   > contract address:    0x47b33c2D3e928FDf2c0A82FcD7042Ae0cFd5862A
   > block number:        49689
   > block timestamp:     1581423408
   > account:             0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73
   > balance:             0
   > gas used:            2356520
   > gas price:           0 gwei
   > value sent:          0 ETH
   > total cost:          0 ETH

Registry Deployed at 0x47b33c2D3e928FDf2c0A82FcD7042Ae0cFd5862A
Deploying Universities Trusted Issuers smart contract on network:  intebsi

   Deploying 'UniversitiesTrustedIssuers'
   --------------------------------------
   > transaction hash:    0x1bdbf910f5fe4ace432e8704218ede668aa805be52c9beab42e619a726590255
   > Blocks: 0            Seconds: 0
   > contract address:    0xed78Cb21Ce10A086a7973fB44e96d34F31D45cF1
   > block number:        49691
   > block timestamp:     1581423412
   > account:             0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73
   > balance:             0
   > gas used:            6704695
   > gas price:           0 gwei
   > value sent:          0 ETH
   > total cost:          0 ETH

Contract deployed at address 0xed78Cb21Ce10A086a7973fB44e96d34F31D45cF1
Deploying Governments Trusted Issuers smart contract on network:  intebsi

   Deploying 'GovernmentsTrustedIssuers'
   -------------------------------------
   > transaction hash:    0x40ead1e36745a9e6a9783e6271acd4dc1453cae31750848b5fce0703035c37bb
   > Blocks: 0            Seconds: 0
   > contract address:    0x218d5fe2E168656eBDE49e7a4A3C97E699D0be78
   > block number:        49693
   > block timestamp:     1581423416
   > account:             0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73
   > balance:             0
   > gas used:            3205079
   > gas price:           0 gwei
   > value sent:          0 ETH
   > total cost:          0 ETH

Contract deployed at address 0x218d5fe2E168656eBDE49e7a4A3C97E699D0be78
Adding university Universitat Rovira i Virgili code 0x5B7a2FC380cb6f6389779c9FCCed050533FB21bb
Adding diploma Máster en bioinformática to the university Universitat Rovira i Virgili
Adding accreditation Europass Accreditation Database to the university Universitat Rovira i Virgili
Adding Government Government of Belgium code 0x4D1A5522D2823941340d965b685a811483Bc7359
Adding Government Government of Belgium document
Adding Flamish GOV Univ Government of Belgium code 0x4D1A5522D2823941340d965b685a811483Bc7359
Adding diploma Bachelor en bioinformática to the Universities Government of Belgium
Adding accreditation Europass Accreditation Database to the government Government of Belgium

   > Saving migration to chain.
   > Saving artifacts
   -------------------------------------
   > Total cost:                   0 ETH


