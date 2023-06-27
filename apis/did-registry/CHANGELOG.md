# Changelog

## 3.0.0-rc.6

### Minor Changes

- [38b9d313](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/38b9d313): Support custom trusted hostnames.

### Patch Changes

- [f0d3dde3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f0d3dde3): Improve error handling
- [f520c43a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f520c43a): Bump dependencies and update Node.js to v16.20.1
- Updated dependencies [f0d3dde3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f0d3dde3)
- Updated dependencies [38b9d313](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/38b9d313)
- Updated dependencies [f520c43a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f520c43a)
- Updated dependencies [07e3176d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/07e3176d)
  - @ebsiint-api/shared@1.1.0-rc.3
  - @ebsiint-sc/did-registry@1.1.0-rc.3

## 3.0.0-rc.5

### Minor Changes

- [70631f93](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/70631f93): bump VC/VP libraries

### Patch Changes

- [2966fa3c](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/2966fa3c): Expose service OpenAPI specification
- [443664aa](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/443664aa): Bump EBSI libraries.
- [34384586](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/34384586): Check if the smart contract address environment variable is defined.
- [a623008a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/a623008a): Rename DID Document to DID document
- [357775c1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/357775c1): Fix vulnerabilities related to the Docker image.
- [1fb98741](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1fb98741): Bump dependencies.
- [8a245129](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/8a245129): Bump EBSI libraries.
- [44412117](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/44412117): Prevent connecting multiple times to Ledger API concurrently.
- [cdfb5f61](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/cdfb5f61): Wait for dependencies to be up and running.
- Updated dependencies [443664aa](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/443664aa)
- Updated dependencies [70631f93](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/70631f93)
- Updated dependencies [a623008a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/a623008a)
- Updated dependencies [1fb98741](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1fb98741)
- Updated dependencies [8a245129](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/8a245129)
  - @ebsiint-api/shared@1.1.0-rc.2
  - @ebsiint-sc/did-registry@1.1.0-rc.2

## 3.0.0-rc.4

### Minor Changes

- [f2257d7d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f2257d7d): connect APIs with DID Registry API v4
- [4a7ea0a5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4a7ea0a5): remove DID policies

### Patch Changes

- [adc663ea](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/adc663ea): Bump dependencies.
- [78ee438b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/78ee438b): Bump dependencies.
- Updated dependencies [adc663ea](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/adc663ea)
- Updated dependencies [a6a1f685](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/a6a1f685)
- Updated dependencies [f2257d7d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f2257d7d)
- Updated dependencies [4a7ea0a5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4a7ea0a5)
- Updated dependencies [78ee438b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/78ee438b)
  - @ebsiint-sc/did-registry@1.1.0-rc.1
  - @ebsiint-api/shared@1.1.0-rc.1

## 3.0.0-rc.3

### Patch Changes

- [2f8b1686](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/2f8b1686): Bump dependencies.
- [c9f6e302](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/c9f6e302): Refactor common code with Sonar-reported high complexity.
  Update rules for http patch path attribute args to have any order.
- [79b2951e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/79b2951e): Fix connection with ethers provider when there is no token.
- [6d699188](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6d699188): Bump dependencies, refactor tests.
- [1e62e0cc](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1e62e0cc): Move custom errors from `@cef-ebsi/problem-details-errors` to `@ebsiint-api/shared`
- Updated dependencies [1be2b488](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1be2b488)
- Updated dependencies [2f8b1686](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/2f8b1686)
- Updated dependencies [6d699188](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6d699188)
- Updated dependencies [be8604c9](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/be8604c9)
- Updated dependencies [1e62e0cc](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1e62e0cc)
  - @ebsiint-sc/did-registry@1.0.1-rc.0
  - @ebsiint-sc/bootstrap@1.0.1-rc.0
  - @ebsiint-api/shared@1.1.0-rc.0

## [3.0.0-rc.2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv3.0.0-rc.1&sourceBranch=refs%2Ftags%2Fv3.0.0-rc.2&targetRepoId=234) (2022-09-21)

### 🚀 Features

- add timeout to http requests ([#165](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/165/overview)) - EBSIINT-4529 ([0521ef0](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/0521ef00fcc963b569f25eb25d15e981cdbe77cd))

## [3.0.0-rc.1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv3.0.0-rc.0&sourceBranch=refs%2Ftags%2Fv3.0.0-rc.1&targetRepoId=234) (2022-07-06)

### 🚀 Features

- show docker version tag in header for test env ([#149](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/149/overview)) - EBSIINT-4321 ([701647b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/701647bfda331f08f4af94a887665cbde44f3b4b))

### 🐛 Bug Fixes

- accept only EBSI DIDs ([#156](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/156/overview)) - EBSIINT-4346 ([a411b2c](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/a411b2cf383c43d8570794552aba8d6db445df9e))
- remove did-methods ([#157](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/157/overview)) - EBSIINT-4358 ([27b9aea](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/27b9aea9d92385f00fb946adf1102df0d08d9413))

## [3.0.0-rc.0](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.9&sourceBranch=refs%2Ftags%2Fv3.0.0-rc.0&targetRepoId=234) (2022-06-08)

### ⚠ BREAKING CHANGES

- releases DIDR API v3

### 🐛 Bug Fixes

- check DID in missing functions ([#142](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/142/overview)) - EBSIINT-3984 ([13eb95d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/13eb95d6ef3ef456741b6858c8b7cb9bd6265ecc))
- fix DID Document's `[@context](https://ec.europa.eu/context)` validation ([#144](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/144/overview)) - EBSIINT-4203 ([a57b096](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/a57b096a8505825f47f89add85e54aaf868d4b43))
- update Node.js to v16.14.2 ([#140](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/140/overview)) - EBSIINT-3981 ([c9220b8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/c9220b8e942d7f4961e07f1ea5992b9a902f0a24))

### 🚀 Features

- bump dependencies - EBSIINT-4226 ([0ee8f5f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/0ee8f5f2dfa0cec970283e8557c58f668f2fa15e))
- update libs, use Authorisation API v2, Ledger v3 and TAR v3 - EBSIINT-3995 ([3f82ed5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/3f82ed5cb7e018adac79e92f8c5f1c2a79c55aa7))

## [2.0.0-rc.9](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.8&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.9&targetRepoId=234) (2022-03-16)

### 🚀 Features

- implement TPR changes ([#130](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/130/overview)) - EBSIINT-3843 ([af9b0cc](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/af9b0cca00ff183a5ef38d5e6760592d043251da))
- intercept and log requests and responses ([#119](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/119/overview)) - EBSIINT-3651 ([761c803](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/761c803cdaee1dd8d83df5f268a1b544fbfb3bb4))

## [2.0.0-rc.8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.7&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.8&targetRepoId=234) (2021-12-06)

### 🚀 Features

- add sendSignedTransaction alias ([#116](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/116/overview)) - EBSIINT-3474 ([dddf0f8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/dddf0f85defeca770853e681c1618c7a82347b58))

## [2.0.0-rc.7](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.6&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.7&targetRepoId=234) (2021-11-16)

### 🚀 Features

- update Node.js to v16.13.0 ([#112](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/112/overview)) - EBSIINT-3496 ([b70e781](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/b70e7814abee3cf5caa2b80e0ba88d7bf7c09e03))

## [2.0.0-rc.6](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.5&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.6&targetRepoId=234) (2021-10-20)

### 🚀 Features

- support application/did+json content type for DID documents ([#105](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/105/overview)) - EBSIINT-3417 ([a345078](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/a345078d1a292ac50b0dd72f554ffde55b0021b5))
- validate DID document before sending it to the ledger ([#106](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/106/overview)) - EBSIINT-3416 ([c84d63a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/c84d63a21a8a6799cfdee96c5949016401b795a0))

### 🐛 Bug Fixes

- check DID document when signedTransaction is called ([#110](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/110/overview)) - EBSIINT-3464 ([ecc144e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/ecc144e12b59fc01b7afebec0c446d2d63c39b74))
- update Node.js version to v14.18.1 ([#107](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/107/overview)) - EBSIINT-3432 ([36dd205](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/36dd205fa7553f4e6fa4a93b27fa68078d3346b3))

## [2.0.0-rc.5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.4&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.5&targetRepoId=234) (2021-10-04)

### 🐛 Bug Fixes

- undo did lowercasing ([#99](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/99/overview)) - EBSIINT-3329 ([19da49c](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/19da49c65973a1d8a1a79e400768d808eeef990e))

### 🚀 Features

- check DID in /administrators endpoints ([#100](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/100/overview)) - EBSIINT-3329 ([5be0015](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/5be00152247c4629e6297cef6c47de68fd35f31b))
- support DID JWT with publicKeyMultibase ([#101](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/101/overview)) - EBSIINT-3329 ([d623754](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/d6237542bedf3df686ae8de5d939a5c2cd902f76))

## [2.0.0-rc.4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.3&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.4&targetRepoId=234) (2021-09-20)

### 🚀 Features

- change attribute format for admins ([#95](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/95/overview)) - EBSIINT-3297 ([2700247](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/2700247066f96dabbdc8f9bfaf09fdf0aced75e6))
- return more meaningful validation error messages ([#89](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/89/overview)) - EBSIINT-3210 ([7c72c16](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/7c72c16b5f34f3eaebdee6c07fe13277f5c22b5e))
- use updated SC with multihash support ([#75](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/75/overview)) - EBSIINT-3121 ([ba12a3c](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/ba12a3c2ea5b1aa3a5bfc9c6da77c4c1754fa68c))
- validate identifier and DID Document's id ([#79](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/79/overview)) - EBSIINT-3163 ([9b337a8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/9b337a84e3874672c314d5962bece6112c15d88e))

### 🐛 Bug Fixes

- /:did/versions/:versionId/metadata ([#78](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/78/overview)) - EBSIINT-3148 ([f31cc85](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/f31cc858f804bb561af783ee160672aa2dd0c355))
- align /policies endpoints output ([#88](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/88/overview)) - EBSIINT-3209 ([6a4ac17](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/6a4ac17d3de7fb735dc69832668143b63eed1405))
- encode DID Timestamp hash in multibase base64 ([#94](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/94/overview)) - EBSIINT-3293 ([9053c33](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/9053c33ddf3693f655ae170f053b0bacda20649a))
- fix 500 error auth token ([#97](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/97/overview)) - EBSIINT-3314 ([1f54c2b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/1f54c2b6e6bff3351e3f7446b431cdadfdb38c29))
- improve /identifiers/{did}/versions/{versionId}/metadata validation logic ([#80](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/80/overview)) - EBSIINT-3161 ([6435dcb](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/6435dcbe6b6e29929ecc7b66acadce02c414012b))
- make validTo admin attribute optional ([#96](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/96/overview)) - EBSIINT-3297 ([9052a87](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/9052a87ce1fbd19f06c3f53b49fbb12971bb08b8))
- timestamp IDs consistency ([#83](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/83/overview)) - EBSIINT-3172 ([ec2254c](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/ec2254c12a37af90a5dc981a87034dfe7b43a120))
- update Node.js to v14.17.5 ([#90](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/90/overview)) - EBSIINT-3220 ([df75de1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/df75de1c35059e2a49ea2c900869c954b6a927bf))
- upgrade Node.js to v14.17.4 ([#86](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/86/overview)) - EBSIINT-3206 ([1a2a35a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/1a2a35adef6c55fd642ed46d5ee61eb3223e3ab8))

## [2.0.0-rc.3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.2&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.3&targetRepoId=234) (2021-06-17)

### 🚀 Features

- validate hashes ([#72](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/72/overview)) - EBSIINT-3046 ([590bf62](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/590bf628c2f9f47352660bd9650baf92414f0d90))

### 🐛 Bug Fixes

- DID Registry API case sensitive support ([#69](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/69/overview)) - EBSIINT-3030 ([f96b2b0](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/f96b2b0990160a53ac9914d39f9d2ebb243b3405))
- try to fetch original DID if lowercase DID is not found ([#74](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/74/overview)) - EBSIINT-3118 ([5aba8af](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/5aba8af0c3414d9d595820dda67226ef5898a306))

## [2.0.0-rc.2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.1&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.2&targetRepoId=234) (2021-06-08)

### 🚀 Features

- filter DID timestamps by identifier and version ID ([#65](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/65/overview)) - EBSIINT-2933 ([5f25d2b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/5f25d2b432fa85be9055dafa2f03f90b1d115da1))
- intercept Axios requests and redirect them to the local network ([#66](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/66/overview)) - EBSIINT-3039 ([98a8b47](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/98a8b472318bda19fc71554f3f0f6ac6c2615ae6))

### 🐛 Bug Fixes

- check did:method is well registered in DID Registry API ([#67](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/67/overview)) - EBSIINT-3041 ([eda6628](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/eda66286a8f551eb623f1ecff7adef6b2b6287ed))
- handle local API 404 response ([#68](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/68/overview)) - EBSIINT-3039 ([103a172](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/103a17273c370ca7d798f8801364dbbcbbeed0f2))

## [2.0.0-rc.1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.0&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.1&targetRepoId=234) (2021-05-20)

### 🚀 Features

- enable JWT Auth ([#60](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/60/overview)) - EBSIINT-2939 ([85c6532](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/85c6532c007fd173755197b495e8278baff17fd6))
- protect /jsonrpc with JWT ([#56](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/56/overview)) - EBSIINT-2939 ([1031d85](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/1031d85bb0617e9fdcc0be4c5f4ffca902e6473b))

### 🐛 Bug Fixes

- disable JWT auth([#58](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/58/overview)) - EBSIINT-2939 ([40b4792](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/40b4792bcf5544044f48940395c2c9f5ec289a05))
- fix e2e tests ([#61](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/pull-requests/61/overview)) - EBSIINT-2939 ([a9cae9c](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/did-registry-api/commits/a9cae9c1676a16d6b953f3183c77b5b7e51bec24))

## 2.0.0-rc.0 (2021-04-16)

Initial release.
