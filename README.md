![Logo of the project](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Trusted Apps Registry Smart Contract

> Smart Contract to store the trusted Applications

## Table of Contents

1. [Getting started](#Getting)
2. [Building](#Building)
3. [Deploying](#Deploying)
4. [Testing](#Testing)
5. [Design](#Design)
6. [Licensing](#Licensing)
7. [Version](#Version)

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/en/download/)

### Installing

Install dependencies:

```sh
yarn install
```

## Building

Build the smart contracts:

```sh
yarn run build
```

## Deploying

Deploy the smart contracts on the ebsi network. You must be able to reach the ebsi network to run this command.
you have to specify in the .secret.privatekeys file an hex encoded private key to sign the besu transaction

```sh
npx truffle migrate --network ebsi --reset
```

## Testing

### Requirements:

- node 12 (use nvm)

### Launch all tests

```sh
yarn run test
```

if you experience some timeout issues try running tests one by one

## Design

We added a storage contract (see AdministratorStorage.sol) that leverages the storage reference variables from inline assembly. We can then use this contract to get all the information about Administrator. if used through a proxy this will be stored at the proxy contract storage slot and can be retrieved by any smart contract implementation. The data can be retrieved without the need to take extra cautious steps like required when using the unstructured storage pattern.

To avoid (bytecode size limitation)[https://github.com/ethereum/EIPs/blob/master/EIPS/eip-170.md] we have splitted the contracts into libraries. Each library handles a specific scope. Here is the smart contract bytecode size (output from `npx truffle run contract-size`)

| Contract              | Size      |
| --------------------- | --------- |
| Address               | 0.08 KiB  |
| AdminLib              | 7.41 KiB  |
| AdminStoreLib         | 0.17 KiB  |
| AdministratorDetailed | 3.22 KiB  |
| AdministratorStorage  | 0.06 KiB  |
| AppDetailed           | 5.60 KiB  |
| AppLib                | 11.38 KiB |
| AppStorage            | 0.06 KiB  |
| AppStoreLib           | 0.17 KiB  |
| AttributeStoreLib     | 0.08 KiB  |
| AuthLib               | 5.44 KiB  |
| AuthStoreLib          | 0.17 KiB  |
| AuthorizationDetailed | 2.87 KiB  |
| AuthorizationStorage  | 0.06 KiB  |
| Initializable         | 0.06 KiB  |
| Migrations            | 0.43 KiB  |
| Pagination            | 1.61 KiB  |
| PolicyDetailed        | 2.87 KiB  |
| PolicyLib             | 5.25 KiB  |
| PolicyStorage         | 0.06 KiB  |
| RevocationDetailed    | 1.04 KiB  |
| PolicyStoreLib        | 0.18 KiB  |
| RevocationLib         | 1.75 KiB  |
| RevocationStorage     | 0.06 KiB  |
| RevocationStoreLib    | 0.17 KiB  |
| Roles                 | 0.08 KiB  |
| SafeMath              | 0.08 KiB  |
| Tar                   | 11.16 K…  |
| TarDetailed           | 0.68 KiB  |
| TarStorage            | 0.16 KiB  |

### Attributes versioning

For policies and administrators we can have attributes wich are only bytes. We can't decode them although we should provide versioning for these attributes.
We decided to take the hash of the attribute as the unique identifier for the attribute. So the hash of initial version of the attribute will be used as an indentifer for the attribute. When we want to update the version of this attribute we will provide the last version hash and the new data.

Let's take an example and add new administrator. We will have to provide an attribute. We will store that first attribute hash in the Smart Contract.

Now we want to update that administrator attribute so we will call the `updateAdministrator()` method wich take three parameters the DID, a new version attribute's data, and the last version hash of this attribute known to the smart contract. In that case the last version will be the first version hash.

If we want to add a third version of that attribute, we will provide the second version hash as the last version hash parameter.

To add a new attribute to the administrator we will call the `updateAdministrator()` method but with only two parameters the DID and the new attribute's data. The Smart Contract will check if this attribute is new and throw an error if it is already known to the Smart Contract.

The `insertAdministrator()` method will make sure that the administrator DID and attribute is not known by the Smart Contract otherwise it will throw an error.

## Version

`npx truffle version`
Truffle v5.1.50 (core: 5.1.50)
Solidity - ^0.7.0 (solc-js)
Node v12.18.4
Web3.js v1.2.9

## Licensing

Copyright (c) 2019 European Commission  
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- https://joinup.ec.europa.eu/page/eupl-text-11-12

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
