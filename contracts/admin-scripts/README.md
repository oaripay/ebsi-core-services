# Admin scripts for smart contract

![Logo of the project](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

> Smart contract utility scripts.

## Compiling

Compile the smart contracts:

```sh
yarn nx compile @ebsiint-sc/admin-scripts
```

This will take all the latest solidity source code from smart contracts projects (worskpace packages under `@ebsiint-sc/` namespace) and create an output `src` folder with all the information related to the smart contracts:

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
yarn hardhat --network local chainId
```

To get the lastest block number on the specified network:

```sh
yarn hardhat --network local blockNumber
```

To get some inforamtion about a transaction:

```sh
yarn hardhat --network local tx --hash 0xd0f11a38650c987063b689b5384ae17e6506fbd179e50e47a84111695331302ds
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

### Deployment 1a

To deploy the smart contract without upgrade-ability use the deploy script with the contract deployment tag.

```sh
yarn hardhat --network local deploy --tags <TAG>  --gasprice 0 --reset
```

Note: For TAG please see Deployment Appendix

### Deployment 1b

Step 1: deploy the proxy

```bash
yarn hardhat --network local deploy --tags OwnedUpgradeabilityProxy --gasprice 0 --reset
```

Step2: init the proxy

```bash
yarn hardhat --network local initProxy --proxy PROXY_ADDRESS --implementation TAG --storage STORAGE
```

PROXY_ADDRESS = the output of the proxy deploy
TAG = Deployment Tag from the appendix below
STORAGE = Storage of version location from the appendix below

Step3: Update one deployment

```bash
yarn hardhat --network local changeImplementation --proxy PROXY_ADDRESS --implementation TAG --storage STORAGE --increment true

```

PROXY_ADDRESS = the output of the proxy deploy
TAG = Deployment Tag from the appendix below
STORAGE = Storage of version location from the appendix below

### Deployment Appendix

           | App Name              	| Deployment Tag   	| Storage of version location                             	|
           :-----:|:-----:|:-----:
           | TrustedAppsRegistry   	| Tar              	| diamond.standard.tar.storage                            	|
           | TrustedIssuersRegistry | Tir              	| diamond.standard.tir.storage                            	|
           | DidRegistry           	| DidRegistry      	| diamond.standard.did.registry.storage                   	|
           | TrustedSchemaRegistry 	| SchemaSCRegistry 	| diamond.standard.trusted.schema.smart.contracts.storage 	|
           | TrustedLedgerRegistry 	| LedgerSCRegistry 	| diamond.standard.trusted.ledger.smart.contracts.storage 	|
           | Timestamp             	| Timestamp        	| diamond.standard.timestamp.storage                      	|
           | PolicyRegisty         	| PolicyRegistry   	| diamond.standard.policy.registry.storage                 	|

## Scripts

you can run scripts with the following command `hardhat --network <networkName> run <script>`.
Scripts are located in the `scripts` folder.

e.g.

```sh
yarn hardhat --network local run ./scripts/proxy/changeOwnership.ts
```

### Update Apps

To create or update apps in the Trusted Apps Registry go to the folder `scripts/trusted-apps-registry`, create a copy of `apps.example.ts` with the name it `apps.ts`, and define the Apps to be inserted or updated. Then run:

```sh
yarn hardhat --network local run scripts/trusted-apps-registry/updateApps.ts
```

### Update Tar Statuses from 0 to 1 for accepted

```
npx hardhat --network localWithData fixTarStatus --proxy <PROXY OF TAR> --app <APP_TO_BE_UPDATED> --auth <APP_AUTH>
```

Note:
PROXY OF TAR: address of the proxy of TAR
APP_TO_BE_UPDATED: the name of the app to be updated, i.e. : users-onboarding-api
APP_AUTH: list of apps with comma or all to update all, i.e. : users-onboarding-api,ledger-api or all (this parameter can be ommited and it will take all by default)

####APPENDIX LIST OF APPS:
user-wallet-web-client
enterprise-wallet-back-end
iossvat-web-client
iossvat-back-end
notaris-web-client
notaris-back-end
trusted-issuers-registry-api
trusted-schemas-registry-api
trusted-apps-registry-api
trusted-iam-registry-api
trusted-ledgers-sc-registry-api
verifiable-credential-api
verifiable-presentation-api
identity-hub-api
did-registry-api
eidas-bridge-api
authorisation-api
users-onboarding-api
reverse-proxy
wallet-api
timestamp-api
storage-api
ledger-api
notifications-api
fabric-root-ca
fabric-ica
fabric-peer
fabric-peer-db
fabric-orderer
fabric-cli
proxy-data-hub-api

### Insert Administrators

Add new administrators to the desired Registries (registries must implement `insertAdministrator(string,bytes)` and `getAdministrator(string)`)

```
npx hardhat --network localWithData insertAdministrator --proxy PROXY_ADDRESS --contract CONTRACT_ARTIFACT
```

### Insert Administrator Appendix

           | App Name              	| Deployment Tag   	| Contract ABI artifact                             	|
           :-----:|:-----:|:-----:
           | TrustedIssuersRegistry | Tir              	| contracts/trusted-issuers-registry-ethereum-sc/contracts/tir/Tir.sol:Tir                            	|

### Insert App Hash Algo

Add the default hash algorithms to the ledgers (contract ABIs: `DidRegistry`, `Timestamp`)

```
npx hardhat --network localWithData addHashAlgo --proxy PROXY_ADDRESS --contract CONTRACT
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
