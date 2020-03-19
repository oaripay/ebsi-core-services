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
Deploying ethr did registry smart contract on network:  intebsi

   Deploying 'EthereumDIDRegistry'
   -------------------------------
   > transaction hash:    0x46d43618e84206200dbcdd7d816dfc7f64054ec80e0afe63ec026b9e2cafd556
   > Blocks: 3            Seconds: 4
   > contract address:    0x9a3DBCa554e9f6b9257aAa24010DA8377C57c17e
   > block number:        3197
   > block timestamp:     1584625144
   > account:             0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73
   > balance:             0
   > gas used:            2356456
   > gas price:           0 gwei
   > value sent:          0 ETH
   > total cost:          0 ETH

Deploying Universities Trusted Issuers smart contract on network:  intebsi

   Replacing 'UniversitiesTrustedIssuers'
   --------------------------------------
   > transaction hash:    0x44eff06c7c11eec3a293c884d44eecf9bf527b0caa4842e3d16f562d4e0e63ef
   > Blocks: 0            Seconds: 0
   > contract address:    0x9B8397f1B0FEcD3a1a40CdD5E8221Fa461898517
   > block number:        3199
   > block timestamp:     1584625148
   > account:             0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73
   > balance:             0
   > gas used:            6704695
   > gas price:           0 gwei
   > value sent:          0 ETH
   > total cost:          0 ETH

Contract deployed at address 0x9B8397f1B0FEcD3a1a40CdD5E8221Fa461898517
Deploying Governments Trusted Issuers smart contract on network:  intebsi

   Replacing 'GovernmentsTrustedIssuers'
   -------------------------------------
   > transaction hash:    0xa99ff8bb01ea259ffa8249b6379400e3ad25c5f87c1a67c88c0288e7afa5bed4
   > Blocks: 0            Seconds: 0
   > contract address:    0x2E1f232a9439C3D459FcEca0BeEf13acc8259Dd8
   > block number:        3200
   > block timestamp:     1584625150
   > account:             0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73
   > balance:             0
   > gas used:            3205207
   > gas price:           0 gwei
   > value sent:          0 ETH
   > total cost:          0 ETH

Contract deployed at address 0x2E1f232a9439C3D459FcEca0BeEf13acc8259Dd8
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


Summary
=======
> Total deployments:   4
> Final cost:          0 ETH

```

