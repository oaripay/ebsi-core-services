# Changelog

All notable changes to this project will be documented in this file. 🤘

## [2.0.0-rc.5](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.4&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.5&targetRepoId=251) (2021-10-04)

### 🐛 Bug Fixes

- compare lowercase Ethereum addresses ([#68](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/pull-requests/68/overview)) - EBSIINT-3334 ([2f79d0a](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/commits/2f79d0a6f62a383b9823e11e1e4eaf61963a7421))

### 🚀 Features

- follow the new EBSI DID method specification ([#67](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/pull-requests/67/overview)) - EBSIINT-3334 ([d4a2828](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/commits/d4a28283dfe3c2a34efb3e25610938ca10de4bfa))
- support DID JWT with publicKeyMultibase ([#69](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/pull-requests/69/overview)) - EBSIINT-3334 ([244f540](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/commits/244f540a1f004490c4f99815dd9c74a9fcceb864))

## [2.0.0-rc.4](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.3&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.4&targetRepoId=251) (2021-09-15)

### 🚀 Features

- control access with admin attributes ([#65](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/pull-requests/65/overview)) - EBSIINT-3297 ([25e0083](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/commits/25e0083ce2224036f9792f254e36f4111566ffae))

### 🐛 Bug Fixes

- align /jsonrpc methods with other APIs ([#55](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/pull-requests/55/overview)) - EBSIINT-3166 ([469e73e](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/commits/469e73eb328be73132a2548c0d97bd58706fb9cd))
- update dependencies and upgrade Node.js to 14.17.2 ([#56](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/pull-requests/56/overview)) - EBSIINT-3174 ([786b484](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/commits/786b48405e2206a6de72191daac24a50df705fc9))
- update Node.js to v14.17.5 ([#61](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/pull-requests/61/overview)) - EBSIINT-3220 ([9a90078](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/commits/9a90078d4a8c1adbc11ec3bf44c2a99d3e935e32))
- upgrade Node.js to v14.17.4 ([#59](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/pull-requests/59/overview)) - EBSIINT-3206 ([eb040e6](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/commits/eb040e639e74103f1935c14efc15417198b0e06b))

## [2.0.0-rc.3](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.2&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.3&targetRepoId=251) (2021-06-17)

### 🐛 Bug Fixes

- use lowercase DID for admins and issuers ([#51](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/pull-requests/51/overview)) - EBSIINT-3119 ([597d7fe](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/commits/597d7fec57b440d38d9be34d6e478d7f5f8623d6))

## [2.0.0-rc.2](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.1&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.2&targetRepoId=251) (2021-06-08)

### 🐛 Bug Fixes

- handle local API 404 response ([#46](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/pull-requests/46/overview)) - EBSIINT-3039 ([2f91c62](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/commits/2f91c62b32b11f0374dee33739b0f533ab4cb345))

### 🚀 Features

- allow issuers to update their attributes ([#47](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/pull-requests/47/overview)) - EBSIINT-3037 ([60c3306](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/commits/60c3306541c29ca95afb2a51a239b7a3a3a3236e))
- intercept Axios requests and redirect them to the local network ([#45](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/pull-requests/45/overview)) - EBSIINT-3039 ([020c0c0](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/commits/020c0c0ffafe18645d11c93eb9e5937b5cbe53f3))

## [2.0.0-rc.1](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.0&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.1&targetRepoId=251) (2021-05-20)

### 🚀 Features

- implement JWT auth ([#40](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/pull-requests/40/overview)) - EBSIINT-2942 ([2ea1677](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/commits/2ea16778a9f1cea5e106d8429e71cbc6491f4280))

### 🐛 Bug Fixes

- fix e2e tests ([#42](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/pull-requests/42/overview)) - EBSIINT-2942 ([a79a3ce](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/trusted-issuers-registry-api/commits/a79a3ce633ca5dd0173575f8393d24eb13532bcf))

## 2.0.0-rc.0 (2021-04-23)

Initial release.
