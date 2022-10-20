![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

# EBSI core services

This is the monorepo combining core services. They are divided into 3 categories

- [contracts](/contracts/): solidity-based smart contracts
- [apis](/apis/): services abstracting smart contracts methods as well other specific purposes (notifications, storage, etc.)

## Table of Contents

- [EBSI core services](#ebsi-core-services)
  - [Table of Contents](#table-of-contents)
  - [Getting started](#getting-started)
    - [Downloading dependencies](#downloading-dependencies)
    - [Executing tasks](#executing-tasks)
    - [Developing services](#developing-services)
    - [Managing changelogs and release version bumps](#managing-changelogs-and-release-version-bumps)
  - [Auditing the dependencies](#auditing-the-dependencies)
    - [Further details](#further-details)
  - [License](#license)

## Getting started

The monorepo uses [NX](https://nx.dev/) as a task runner in combination with [yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/). Projects' structures of pre-monorepo work has been maintained.

### Downloading dependencies

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

### Developing services

Please refer to a more detailed documentation regarding how to [work on EBSI services](/docs/APIs.md).

### Managing changelogs and release version bumps

When working on a PR, run `yarn changeset add` to create a new changeset file, or run `yarn changeset add --empty` to create an empty changeset (i.e. no changes). Rename the file with the jira ticket, e.g. `.changeset/EBSIINT-4242.md`

When creating a new release, run `yarn changeset version`, open a PR, and merge it.

For details on changesets please see [this excellent evaluation](https://ec.europa.eu/digital-building-blocks/tracker/browse/EBSIINT-4611).

## Auditing the dependencies

Using [audit-ci](https://github.com/IBM/audit-ci) (this is the one we run during CI):

```sh
yarn run audit
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
