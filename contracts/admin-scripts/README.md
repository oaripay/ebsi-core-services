![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

# Admin scripts for smart contract

> Smart contract utility scripts.

## Prerequisites

Copy `.env.example` file to `.env` and configure the necessary settings.

## Compiling

Compile the smart contracts:

```sh
yarn nx compile @ebsiint-sc/admin-scripts
```

This will take all the latest solidity source code from smart contracts projects (workspace packages under `@ebsiint-sc/` namespace) and create an output `src` folder with all the information related to the smart contracts:

- `abi`
- `artifacts`
- `types`

## Running tasks

Tasks which are run through npm scripts (defined within `package.json`) can be run through `nx` as documented in [SC docs](../../docs/Contracts.md). The compile task mentioned in the previous section is a perfect example.

In order to run non-npm tasks for tool within the project and not part of `package.json` scripts, change directory to the current project and run commands directly without `nx` prefix.

To verify the accounts that will be used by hardhat:

```sh
yarn hardhat accounts
```

To verify the chainId that will be used by hardhat:

```sh
yarn hardhat --network pilot chainId
```

To get the latest block number on the specified network:

```sh
yarn hardhat --network pilot blockNumber
```

To get some information about a transaction:

```sh
yarn hardhat --network pilot tx --hash 0xd0f11a38650c987063b689b5384ae17e6506fbd179e50e47a84111695331302ds
```

List all available tasks:

```sh
yarn hardhat
```

## Deployment

To deploy the smart contracts on a network defined in the `hardhat.config.ts` use the `--tag` option to specify the deployment script that you want to run. The tag is exported at the end of the deployment file e.g. `func.tags = ["Timestamp"];`

Note that by default smart contracts will be deployed locally using hardhat development node.

Deployment scripts are located in the `scripts/deployment` folder

```sh
yarn hardhat --network ebsi deploy --tags OwnedUpgradeabilityProxy --gasprice 0
```

Running a deployment script will add information about deployment like the smart contract addresses per network inside the `deployments` folder.

If you want to deploy again the smart contract add the `--reset` option.

### Bootstrap network

Here we present how to deploy the different contracts in test env. For pilot or conformance change `--network` param.

**Trusted Policies Registry**

First deploy the proxy

```sh
yarn hardhat --network test deploy --tags OwnedUpgradeabilityProxy --gasprice 0 --reset
```

Copy the address of the proxy and use it to deploy the implementation:

```sh
yarn hardhat --network test initProxy --proxy PROXY_ADDRESS_TPR --implementation PolicyRegistryV2
```

Grant the role operator to some addresses. This operator will have the right to insert data (policies and users) in this registry (see the [CLI bootstrap script](https://code.europa.eu/ebsi/public/cli/-/tree/main/src/scripts/bootstrap)):

```sh
yarn hardhat --network test grantRole --proxy PROXY_ADDRESS_TPR --operator OPERATOR_ADDRESS
```

Change the admin to the multisig wallet

```sh
yarn hardhat --network test changeOwnership --proxy PROXY_ADDRESS_TPR
```

Update the `scripts/deployment/dependencies.ts` with the new proxy address. This address will be linked in the deployment of the other contracts.

**DID Registry**

Follow a similar process like the previous contract to deploy the DID Registry (expect the grantRole, which doesn't apply here):

```sh
yarn hardhat --network test deploy --tags OwnedUpgradeabilityProxy --gasprice 0 --reset
yarn hardhat --network test initProxy --proxy PROXY_ADDRESS_DIDR --implementation DidRegistryV5
yarn hardhat --network test changeOwnership --proxy PROXY_ADDRESS_DIDR
```

Update the `scripts/deployment/dependencies.ts` with the new proxy address. This address will be linked in the deployment of Trusted Apps Registry and Trusted Issuers Registry.

**Trusted Issuers Registry**

Deploy proxy and implementation for Trusted Issuers Registry, and change the admin to the multisig wallet:

```sh
yarn hardhat --network test deploy --tags OwnedUpgradeabilityProxy --gasprice 0 --reset
yarn hardhat --network test initProxy --proxy PROXY_ADDRESS_TIR --implementation TirV3
yarn hardhat --network test changeOwnership --proxy PROXY_ADDRESS_TIR
```

**Trusted Apps Registry**

Deploy proxy and implementation for Trusted Apps Registry, and change the admin to the multisig wallet:

```sh
yarn hardhat --network test deploy --tags OwnedUpgradeabilityProxy --gasprice 0 --reset
yarn hardhat --network test initProxy --proxy PROXY_ADDRESS_TAR --implementation TarV3
yarn hardhat --network test changeOwnership --proxy PROXY_ADDRESS_TAR
```

**Trusted Schemas Registry**

Deploy proxy and implementation for Trusted Schemas Registry, and change the admin to the multisig wallet:

```sh
yarn hardhat --network test deploy --tags OwnedUpgradeabilityProxy --gasprice 0 --reset
yarn hardhat --network test initProxy --proxy PROXY_ADDRESS_TSR --implementation SchemaSCRegistryV2
yarn hardhat --network test changeOwnership --proxy PROXY_ADDRESS_TSR
```

**Timestamp**

Deploy proxy and implementation for Timestamp, and change the admin to the multisig wallet:

```sh
yarn hardhat --network test deploy --tags OwnedUpgradeabilityProxy --gasprice 0 --reset
yarn hardhat --network test initProxy --proxy PROXY_ADDRESS_TIMESTAMP --implementation TimestampV2
yarn hardhat --network test changeOwnership --proxy PROXY_ADDRESS_TIMESTAMP
```

### Other Deployments

To deploy the smart contract without upgrade-ability use the deploy script with the contract deployment tag.

```sh
yarn hardhat --network pilot deploy --tags <TAG>  --gasprice 0 --reset
```

To deploy an new implementation use `changeImplementation`:

```sh
yarn hardhat --network pilot changeImplementation --proxy PROXY_ADDRESS --implementation TAG
```

## Scripts

you can run scripts with the following command `hardhat --network <networkName> run <script>`.
Scripts are located in the `scripts` folder.

e.g.

```sh
yarn hardhat --network local run ./scripts/proxy/changeOwnership.ts
```

### Insert Administrator Appendix

           | App Name              	| Deployment Tag   	| Contract ABI artifact                             	|
           :-----:|:-----:|:-----:
           | TrustedIssuersRegistry | Tir              	| contracts/trusted-issuers-registry-ethereum-sc/contracts/tir/Tir.sol:Tir                            	|

### Insert App Hash Algo

Add the default hash algorithms to Timestamp:

```
npx hardhat --network localWithData addHashAlgo --proxy PROXY_ADDRESS --contract CONTRACT
```

Deploy/upgrade/ upgrade with reinitialize new TrackAndTrace

```
yarn hardhat --network <test|pilot|prod|conformance> trackAndTrace --admin  <address|0x28774ee74a79e27af87f4a7668542be43e2f742b> --upgrader <address|0x28774ee74a79e27af87f4a7668542be43e2f742b> --registry <address|0x76C8190D7422e5fa2A0190Bc2313bab0b2afEC78> --tpr <address|0x61b6AD18C74C2158445F524E9f868Da13Aba8E2F>
yarn hardhat trackAndTraceUpgrade --network <test|pilot|prod|conformance>
yarn hardhat --network <test|pilot|prod|conformance> trackAndTrace --admin  <address|0x28774ee74a79e27af87f4a7668542be43e2f742b> --upgrader <address|0x28774ee74a79e27af87f4a7668542be43e2f742b> --registry <address|0x76C8190D7422e5fa2A0190Bc2313bab0b2afEC78> --tpr <address|0x61b6AD18C74C2158445F524E9f868Da13Aba8E2F>
```

###

Deploy new TrustedSchemaRegistryV3

```
yarn hardhat --network <test|pilot|prod|conformance> trustedSchemaRegistryV3 --upgrader <address of admin> --tpr <address of tpr>
```

Deploy new TrustedIssuersRegistryV4

```
yarn hardhat --network <test|pilot|prod|conformance> trustedIssuersRegistryV4 --upgrader <address of admin> --tpr <address of tpr> --did <address of did registry>
```

# Hardhat console

Hardhat comes built-in with an interactive JavaScript console. You can use it by running yarn hardhat console. Anything that has been injected into the Hardhat Runtime Environment will be available in the global scope.

Hardhat's console supports await top-level await (i.e. `console.log(await web3.eth.getBalance()`).

you can also launch it on a specific network

```sh
yarn hardhat --network local console
```

## Licensing

Copyright (c) 2019 European Commission  
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- https://joinup.ec.europa.eu/page/eupl-text-11-12

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
