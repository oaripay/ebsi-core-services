![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

# EBSI Core Services

## Table of Contents

- [EBSI Core Services](#ebsi-core-services)
  - [Table of Contents](#table-of-contents)
  - [Getting started](#getting-started)
    - [Downloading dependencies](#downloading-dependencies)
    - [Executing tasks](#executing-tasks)
    - [Developing smart contracts](#developing-smart-contracts)
    - [Developing services](#developing-services)
    - [Managing changelogs and release version bumps](#managing-changelogs-and-release-version-bumps)
  - [Auditing the dependencies](#auditing-the-dependencies)
    - [Further details](#further-details)
  - [License](#license)

## Getting started

The monorepo uses [Nx](https://nx.dev/) as a task runner in combination with [Yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/).

### Downloading dependencies

System requirements:

- Node.js: check the version number in the `.nvmrc` file
- yarn >= 1.22.0

We recommend the use of [Node Version Manager](https://github.com/creationix/nvm). With it, run `nvm install` followed by `nvm use` to get the right Node.js version.

Install the required libraries and packages dependencies:

```sh
yarn install
```

Pre-commit hooks are also running [gitleaks](https://github.com/gitleaks/gitleaks). To install it, please check their GitHub README page:
[https://github.com/gitleaks/gitleaks?tab=readme-ov-file#installing](https://github.com/gitleaks/gitleaks?tab=readme-ov-file#installing)

### Executing tasks

To list the most commonly used commands, run:

```sh
yarn run
```

To build all packages:

```sh
yarn build:all
```

Whereas building only ["affected"](https://nx.dev/concepts/affected) packages is done with `yarn build`.

To execute a specific package npm task, use the following pattern `yarn nx [npm-task] [package-name]`

```sh
yarn nx build @ebsiint-sc/trusted-policies-registry-v3
```

### Developing smart contracts

Please refer to a more detailed documentation regarding how to [work on EBSI smart contracts](/docs/Contracts.md).

### Developing services

Please refer to a more detailed documentation regarding how to [work on EBSI services](/docs/APIs.md).

### Managing changelogs and release version bumps

When working on a PR, run `yarn changeset add` to create a new changeset file, or run `yarn changeset add --empty` to create an empty changeset (i.e. no changes). Rename the file with the jira ticket, e.g. `.changeset/EBSIINT-4242.md`

When creating a new release, run `yarn changeset version`, open a PR, and merge it.

## Auditing the dependencies

Using [audit-ci](https://github.com/IBM/audit-ci) (this is the one we run during CI):

```sh
yarn run audit
```

### Further details

Please refer to services' `README` files for more information regarding specifics.

## License

Copyright (C) 2026 European Union

This program is free software: you can redistribute it and/or modify it under the terms of the EUROPEAN UNION PUBLIC LICENCE v. 1.2 as published by the European Union.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the EUROPEAN UNION PUBLIC LICENCE v. 1.2 for further details.

You should have received a copy of the EUROPEAN UNION PUBLIC LICENCE v. 1.2. along with this program. If not, see <https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12>.
