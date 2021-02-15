# Admin scripts for smart contract

![Logo of the project](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

> Smart contract utility scripts.

## Table of Contents

1. [Getting started](#Getting)
2. [Compiling](#Compiling)
3. [Run tasks](#Run-tasks)
4. [Deployment](#Deployment)
5. [Scripts](#Scripts)
6. [Hardhat console](#Hardhat-console)
7. [Licensing](#Licensing)

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/en/download/)

### Installing

Install dependencies:

```sh
yarn install
```

retrieve the submodules

```
git submodule update --init --recursive
```

## Compiling

Compile the smart contracts:

```sh
yarn run compile
```

this will create an `artifcats` folder with all the information related to the smart contracts
and `src/types`,`src/abi` folder for the typechain object representing the contracts.

## Run tasks

To verify the accounts that will be used by hardhat

```sh
npx hardhat accounts
```

To verify the chainId that will be used by hardhat

```sh
npx hardhat --network local chainId
```

To get the lastest block number on the specified network

```sh
npx hardhat --network local blockNumber
```

To get some inforamtion about a transaction

```sh
npx hardhat --network local tx --hash 0xd0f11a38650c987063b689b5384ae17e6506fbd179e50e47a84111695331302ds
```

for the complete list of available tasks run

```sh
npx hardhat
```

## Deployment

To deploy the smart contracts on a network defined in the `hardhat.config.ts`
use the `--tag` option to specify the deployment script that you want to run. The tag is exported at the end of the deployment file e.g. `func.tags = ["Timestamp"];`

Note that by default smart contracts will be deployed locally using hardhat development node.

Deployment scripts are located in the `scripts/deployment` folder

```sh
npx hardhat --network ebsi deploy --tags OwnedUpgradeabilityProxy --gasprice 0
```

running deployment script will add information about deployment like the smart contract addresses per network inside the `deployments` folder

if you want to deploy again the smart contract add the `--reset` option

```sh
npx hardhat --network local deploy --tags Timestamp  --gasprice 0 --reset
```

## Scripts

you can run scripts with the following command `hardhat --network <networkName> run <script>`.
Scripts are located in the `scripts` folder.

e.g.

```sh
npx hardhat --network local run ./scripts/proxy/changeOwnership.ts
```

# Hardhat console

Hardhat comes built-in with an interactive JavaScript console. You can use it by running npx hardhat console. Anything that has been injected into the Hardhat Runtime Environment will be available in the global scope.

Hardhat's console supports await top-level await (i.e. `console.log(await web3.eth.getBalance()`).

you can also launch it on a specific network

```sh
npx hardhat --network local console
```

## Licensing

Copyright (c) 2019 European Commission  
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- https://joinup.ec.europa.eu/page/eupl-text-11-12

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
