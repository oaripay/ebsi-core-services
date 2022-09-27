![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

# EBSI Core Services

This is the monorepo combining core services. They are divided into 3 categories

- [contracts](./contracts/): solidity-based smart contracts
- [apis](./apis/): services abstracting smart contracts methods as well other specific purposes (notifications, storage, etc.)
- [apps](./apps/): client-side (frontend) applications

## Table of Contents

- [EBSI Core Services](#ebsi-core-services)
  - [Table of Contents](#table-of-contents)
  - [Getting started](#getting-started)
    - [Download dependencies](#download-dependencies)
    - [Executing tasks](#executing-tasks)
    - [Further details](#further-details)
  - [License](#license)

## Getting started

The monorepo uses [NX](https://nx.dev/) as a task runner in combination with [yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/). Projects' structures of pre-monorepo work has been maintained.

<<<<<<< HEAD
### Download dependencies
=======
First, create an `.env.local` file locally. You can duplicate the content of `.env` or only set the variables that you want to change.

Please note that you need to fill the `API_PRIVATE_KEY` (secp256k1 elliptic curve private keys in hexadecimal), `API_NAME` (as registered in the Trusted Apps Registry), `DOMAIN` and `CONTRACT_ADDR`.

For e2e testing, you must also set an admin regitered as administrator in the Trusted Apps Registry (`TEST_ADMIN_KID`, `TEST_ADMIN_PRIVATE_KEY`) and a user registered in the Did Registry (`TEST_USER_KID`, `TEST_USER_PRIVATE_KEY`).

After cloning the repository, make sure to update the submodules:

```sh
git submodule update --init --recursive
```

### Run the project locally
>>>>>>> timestamp-api/develop

Install the required libraries and packages dependencies:

```sh
yarn install
```

Keep in mind that libraries' source code will be stored centrally in the root `node_modules` folder whereas binaries required by sub-projects will be stored in nested `node_modules` folders.

### Executing tasks

To revise most commonly used commands please run:

```sh
yarn run
```

To build all packages

```sh
yarn build:all
```

Whereas building only ["affected"](https://nx.dev/concepts/affected) packages is done with `yarn build`.

To execute a specific package npm task, use the following pattern `yarn nx [npm-task] [package-name]`

```sh
yarn nx build @ebsiint-sc/trusted-policies-registry
```

### Further details

Please refer to services' `README` files for more information regarding specifics.

## License

Copyright (c) 2019 European Commission
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
