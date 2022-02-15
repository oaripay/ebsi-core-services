![Logo of the project](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Trusted Issuers Registry Smart Contract

> Smart Contract to store the trusted Issuers

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

Compile the smart contracts:

```sh
yarn run compile
```

To verify the accounts that will be used by hardhat

```sh
npx hardhat accounts
```

## Deployment

To deploy the smart contracts on a network defined in the `hardhat.config.ts`

```sh
npx hardhat run --network <your-network> scripts/deployment.ts
```

Note that by default smart contracts will be deployed locally using hardhat development node.

## Testing

### Requirements:

- node 14.15 (use nvm)

### Launch all tests

```sh
yarn run test
```

if you experience some timeout issues try running tests one by one

## Design

We added a storage contract (see IssuerStorage.sol) that leverages the storage reference variables from inline assembly. We can then use this contract to get all the information about Issuer. if used through a proxy this will be stored at the proxy contract storage slot and can be retrieved by any smart contract implementation. The data can be retrieved without the need to take extra cautious steps like required when using the unstructured storage pattern.

### Attributes versioning

For issuer and administrators we can have attributes wich are only bytes. We can't decode them although we should provide versioning for these attributes.
We decided to take the hash of the attribute as the unique identifier for the attribute. So the hash of initial version of the attribute will be used as an indentifer for the attribute. When we want to update the version of this attribute we will provide the last version hash and the new data.

Let's take an example and add new issuer. We will have to provide an attribute. We will store that first attribute hash in the Smart Contract.

Now we want to update that issuer attribute so we will call the `updateIssuer()` method wich take three parameters the DID, a new version attribute's data, and the last version hash of this attribute known to the smart contract. In that case the last version will be the first version hash.

If we want to add a third version of that attribute, we will provide the second version hash as the last version hash parameter.

To add a new attribute to the issuer we will call the `updateIssuer()` method but with only two parameters the DID and the new attribute's data. The Smart Contract will check if this attribute is new and throw an error if it is already known to the Smart Contract.

The `insertIssuer()` method will make sure that the issuer DID and attribute is not known by the Smart Contract otherwise it will throw an error.

## Licensing

Copyright (c) 2019 European Commission  
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- https://joinup.ec.europa.eu/page/eupl-text-11-12

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.

## Version

`npx truffle version`
Truffle v5.1.50 (core: 5.1.50)
Solidity - ^0.7.0 (solc-js)
Node v12.18.4
Web3.js v1.2.9
