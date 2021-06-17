# Changelog

All notable changes to this project will be documented in this file. 🤘

## [2.0.0-rc.3](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.2&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.3&targetRepoId=234) (2021-06-17)

### 🚀 Features

- validate hashes ([#72](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/72/overview)) - EBSIINT-3046 ([590bf62](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/590bf628c2f9f47352660bd9650baf92414f0d90))

### 🐛 Bug Fixes

- DID Registry API case sensitive support ([#69](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/69/overview)) - EBSIINT-3030 ([f96b2b0](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/f96b2b0990160a53ac9914d39f9d2ebb243b3405))
- try to fetch original DID if lowercase DID is not found ([#74](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/74/overview)) - EBSIINT-3118 ([5aba8af](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/5aba8af0c3414d9d595820dda67226ef5898a306))

## [2.0.0-rc.2](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.1&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.2&targetRepoId=234) (2021-06-08)

### 🚀 Features

- filter DID timestamps by identifier and version ID ([#65](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/65/overview)) - EBSIINT-2933 ([5f25d2b](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/5f25d2b432fa85be9055dafa2f03f90b1d115da1))
- intercept Axios requests and redirect them to the local network ([#66](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/66/overview)) - EBSIINT-3039 ([98a8b47](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/98a8b472318bda19fc71554f3f0f6ac6c2615ae6))

### 🐛 Bug Fixes

- check did:method is well registered in DID Registry API ([#67](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/67/overview)) - EBSIINT-3041 ([eda6628](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/eda66286a8f551eb623f1ecff7adef6b2b6287ed))
- handle local API 404 response ([#68](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/68/overview)) - EBSIINT-3039 ([103a172](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/103a17273c370ca7d798f8801364dbbcbbeed0f2))

## [2.0.0-rc.1](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.0&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.1&targetRepoId=234) (2021-05-20)

### 🚀 Features

- enable JWT Auth ([#60](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/60/overview)) - EBSIINT-2939 ([85c6532](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/85c6532c007fd173755197b495e8278baff17fd6))
- protect /jsonrpc with JWT ([#56](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/56/overview)) - EBSIINT-2939 ([1031d85](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/1031d85bb0617e9fdcc0be4c5f4ffca902e6473b))

### 🐛 Bug Fixes

- disable JWT auth([#58](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/58/overview)) - EBSIINT-2939 ([40b4792](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/40b4792bcf5544044f48940395c2c9f5ec289a05))
- fix e2e tests ([#61](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/61/overview)) - EBSIINT-2939 ([a9cae9c](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/a9cae9c1676a16d6b953f3183c77b5b7e51bec24))

## 2.0.0-rc.0 (2021-04-16)

Initial release.
