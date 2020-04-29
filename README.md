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
   > transaction hash:    0x65604cc6f8e96754a1b78cb59247825a9eab22c726b00b6014d76c821e4ab711
   > Blocks: 0            Seconds: 0
   > contract address:    0x2F2ccEFbc991BC8A1f71D9cDF7E918c787A2ba27
   > block number:        1638181
   > block timestamp:     1588155024
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
   > transaction hash:    0x65242130a507391f5782368c154c72b1938733bf45771c68a0c24475c8e58f13
   > Blocks: 0            Seconds: 0
   > contract address:    0xB4299D7596529fF8dF496e53fFD77944bCCA3AE1
   > block number:        1638185
   > block timestamp:     1588155032
   > account:             0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73
   > balance:             0
   > gas used:            7054160
   > gas price:           0 gwei
   > value sent:          0 ETH
   > total cost:          0 ETH

Contract deployed at address 0xB4299D7596529fF8dF496e53fFD77944bCCA3AE1
Deploying Governments Trusted Issuers smart contract on network:  intebsi

   Replacing 'GovernmentsTrustedIssuers'
   -------------------------------------
   > transaction hash:    0x234f9f0df85be449191f379c895ef0223f640ee6e7eece4524bc68a928368e0d
   > Blocks: 0            Seconds: 0
   > contract address:    0xa48dA31871b0cf9dbdE82184a8Dcd0f44f338bBe
   > block number:        1638187
   > block timestamp:     1588155036
   > account:             0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73
   > balance:             0
   > gas used:            3454563
   > gas price:           0 gwei
   > value sent:          0 ETH
   > total cost:          0 ETH

Contract deployed at address 0xa48dA31871b0cf9dbdE82184a8Dcd0f44f338bBe
Adding university Diploma Sample App: Issue Master's Diploma code did:ebsi:0xAa54d8B05f6EE6e57bDC1008F48EbCBC4dEaE831
Adding diploma Sample University - Master's Programme to the university Diploma Sample App: Issue Master's Diploma
Adding accreditation Europass Accreditation Database to the university Diploma Sample App: Issue Master's Diploma
Adding Government Sample Verifiable ID Issuer code did:ebsi:0xdE3d8e8f30B425ACe6F6549D3188Ae9F0047Ea1A
Adding Government Sample Verifiable ID Issuer document
Adding Flamish GOV Univ Sample Verifiable ID Issuer code did:ebsi:0xdE3d8e8f30B425ACe6F6549D3188Ae9F0047Ea1A
Adding diploma Diploma Sample App: Issue Bachelor's Diploma to the Universities Sample Verifiable ID Issuer
Adding accreditation Europass Accreditation Database to the government Sample Verifiable ID Issuer
Adding Government Sample Verifiable ID Issuer code did:ebsi:0xdE3d8e8f30B425ACe6F6549D3188Ae9F0047Ea1A0
Adding Government Sample Verifiable ID Issuer document

   > Saving migration to chain.
   > Saving artifacts
   -------------------------------------
   > Total cost:                   0 ETH


Summary
=======
> Total deployments:   3
> Final cost:          0 ETH

```

