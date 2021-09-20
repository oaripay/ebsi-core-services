# Changelog

All notable changes to this project will be documented in this file. 🤘

## [2.0.0-rc.4](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.3&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.4&targetRepoId=234) (2021-09-20)

### 🚀 Features

- change attribute format for admins ([#95](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/95/overview)) - EBSIINT-3297 ([2700247](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/2700247066f96dabbdc8f9bfaf09fdf0aced75e6))
- return more meaningful validation error messages ([#89](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/89/overview)) - EBSIINT-3210 ([7c72c16](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/7c72c16b5f34f3eaebdee6c07fe13277f5c22b5e))
- use updated SC with multihash support ([#75](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/75/overview)) - EBSIINT-3121 ([ba12a3c](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/ba12a3c2ea5b1aa3a5bfc9c6da77c4c1754fa68c))
- validate identifier and DID Document's id ([#79](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/79/overview)) - EBSIINT-3163 ([9b337a8](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/9b337a84e3874672c314d5962bece6112c15d88e))

### 🐛 Bug Fixes

- /:did/versions/:versionId/metadata ([#78](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/78/overview)) - EBSIINT-3148 ([f31cc85](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/f31cc858f804bb561af783ee160672aa2dd0c355))
- align /policies endpoints output ([#88](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/88/overview)) - EBSIINT-3209 ([6a4ac17](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/6a4ac17d3de7fb735dc69832668143b63eed1405))
- encode DID Timestamp hash in mutlibase base64 ([#94](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/94/overview)) - EBSIINT-3293 ([9053c33](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/9053c33ddf3693f655ae170f053b0bacda20649a))
- fix 500 error auth token ([#97](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/97/overview)) - EBSIINT-3314 ([1f54c2b](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/1f54c2b6e6bff3351e3f7446b431cdadfdb38c29))
- improve /identifiers/{did}/versions/{versionId}/metadata validation logic ([#80](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/80/overview)) - EBSIINT-3161 ([6435dcb](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/6435dcbe6b6e29929ecc7b66acadce02c414012b))
- make validTo admin attribute optional ([#96](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/96/overview)) - EBSIINT-3297 ([9052a87](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/9052a87ce1fbd19f06c3f53b49fbb12971bb08b8))
- timestamp IDs consistency ([#83](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/83/overview)) - EBSIINT-3172 ([ec2254c](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/ec2254c12a37af90a5dc981a87034dfe7b43a120))
- update Node.js to v14.17.5 ([#90](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/90/overview)) - EBSIINT-3220 ([df75de1](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/df75de1c35059e2a49ea2c900869c954b6a927bf))
- upgrade Node.js to v14.17.4 ([#86](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/pull-requests/86/overview)) - EBSIINT-3206 ([1a2a35a](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/did-registry-api/commits/1a2a35adef6c55fd642ed46d5ee61eb3223e3ab8))

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
