![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

Working with EBSI smart contracts.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
- [Linting](#linting)
  - [ESLint](#eslint)
  - [Prettier](#prettier)
  - [Solidity](#solidity)
- [Testing](#testing)
- [Compiling](#compiling)
- [Using Hardhat](#using-hardhat)

## Getting started

All the commands described below are run from the root folder.

### Prerequisites

Please read [the main documentation](../README.md) first.

## Linting

Run all lint tasks at once:

```sh
yarn nx lint {contract-project}
```

Or you can run the different linters independently:

### ESLint

```sh
yarn nx lint:eslint {contract-project}
```

### Prettier

```sh
yarn nx lint:prettier {contract-project}
```

### Solidity

```sh
yarn nx lint:sol {contract-project}
```

## Testing

```sh
yarn nx test {contract-project}
```

If you want to get the code coverage

```sh
yarn nx coverage {contract-project}
```

## Compiling

Compile a specific smart contract project:

```sh
yarn nx build {contract-project}
```

`yarn nx compile {contract-project}` is also an acceptable command. The command will prepare all the assets necessary for integrations with EBSI services: artifacts and TypeScript types.

If you want to clean previously compiled artifacts:

```sh
yarn nx clean {contract-project}
```

## Using Hardhat

To verify the accounts that will be used by hardhat

```sh
yarn workspace {contract-project} hardhat accounts
```

To verify the chainId that will be used by hardhat

```sh
yarn workspace {contract-project} hardhat --network local chainId
```

To get the latest block number on the specified network

```sh
yarn workspace {contract-project} hardhat --network local blockNumber
```

To get some information about a transaction

```sh
yarn workspace {contract-project} hardhat --network local tx --hash 0xd0f11a38650c987063b689b5384ae17e6506fbd179e50e47a84111695331302ds
```

for the complete list of available tasks run

```sh
yarn workspace {contract-project} hardhat
```
