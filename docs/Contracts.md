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
pnpm exec nx lint {contract-project}
```

Or you can run the different linters independently:

### ESLint

```sh
pnpm exec nx lint:eslint {contract-project}
```

### Prettier

```sh
pnpm exec nx lint:prettier {contract-project}
```

### Solidity

```sh
pnpm exec nx lint:sol {contract-project}
```

## Testing

```sh
pnpm exec nx test {contract-project}
```

If you want to get the code coverage

```sh
pnpm exec nx coverage {contract-project}
```

## Compiling

Compile a specific smart contract project:

```sh
pnpm exec nx build {contract-project}
```

`pnpm exec nx compile {contract-project}` is also an acceptable command. The command will prepare all the assets necessary for integrations with EBSI services: artifacts and TypeScript types.

If you want to clean previously compiled artifacts:

```sh
pnpm exec nx clean {contract-project}
```

## Using Hardhat

To verify the accounts that will be used by hardhat

```sh
pnpm -r --filter <package_name> exec hardhat accounts
```

To verify the chainId that will be used by hardhat

```sh
pnpm -r --filter <package_name> exec hardhat --network local chainId
```

To get the latest block number on the specified network

```sh
pnpm -r --filter <package_name> exec hardhat --network local blockNumber
```

To get some information about a transaction

```sh
pnpm -r --filter <package_name> exec hardhat --network local tx --hash 0xd0f11a38650c987063b689b5384ae17e6506fbd179e50e47a84111695331302ds
```

for the complete list of available tasks run

```sh
pnpm -r --filter <package_name> exec hardhat
```
