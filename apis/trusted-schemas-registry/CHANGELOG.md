# Changelog

## 2.0.0-rc.5

### Patch Changes

- [2966fa3c](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/2966fa3c): Expose service OpenAPI specification
- [443664aa](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/443664aa): Bump EBSI libraries.
- [357775c1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/357775c1): Fix vulnerabilities related to the Docker image.
- [1fb98741](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1fb98741): Bump dependencies.
- [8a245129](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/8a245129): Bump EBSI libraries.
- [44412117](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/44412117): Prevent connecting multiple times to Ledger API concurrently.
- [cdfb5f61](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/cdfb5f61): Wait for dependencies to be up and running.
- Updated dependencies [443664aa](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/443664aa)
- Updated dependencies [70631f93](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/70631f93)
- Updated dependencies [1fb98741](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1fb98741)
- Updated dependencies [8a245129](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/8a245129)
  - @ebsiint-api/shared@1.1.0-rc.2
  - @ebsiint-sc/trusted-schemas-registry@1.0.1-rc.2

## 2.0.0-rc.4

### Minor Changes

- [f2257d7d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f2257d7d): connect APIs with DID Registry API v4

### Patch Changes

- [adc663ea](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/adc663ea): Bump dependencies.
- [78ee438b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/78ee438b): Bump dependencies.
- Updated dependencies [adc663ea](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/adc663ea)
- Updated dependencies [f9d44039](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f9d44039)
- Updated dependencies [a6a1f685](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/a6a1f685)
- Updated dependencies [f2257d7d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f2257d7d)
- Updated dependencies [78ee438b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/78ee438b)
  - @ebsiint-sc/trusted-schemas-registry@1.0.1-rc.1
  - @ebsiint-api/shared@1.1.0-rc.1

## 2.0.0-rc.3

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
  - @ebsiint-sc/trusted-schemas-registry@1.0.1-rc.0
  - @ebsiint-sc/bootstrap@1.0.1-rc.0
  - @ebsiint-api/shared@1.1.0-rc.0

## [2.0.0-rc.2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.1&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.2&targetRepoId=292) (2022-09-22)

### 🚀 Features

- add timeout to http requests ([#101](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/101/overview)) - EBSIINT-4529 ([188b705](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/188b705de652d4bf7c4b10bd63ea8d46557ca17e))

### 🐛 Bug Fixes

- fix Fastify Helmet plugin import ([#102](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/102/overview)) - EBSIINT-4529 ([1a00298](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/1a002986b7efce1aa6f96dd95aba0e99e7709a53))
- fixes vulnerability `GHSA-v923-w3x8-wh69` ([#99](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/99/overview)) - EBSIINT-4439 ([549f7a2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/549f7a27d7fe32694a0795743a43fad6310fde8e))

## [2.0.0-rc.1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.0&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.1&targetRepoId=292) (2022-07-06)

### 🐛 Bug Fixes

- accept only EBSI DIDs ([#87](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/87/overview)) - EBSIINT-4354 ([2e0c88a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/2e0c88aadb22eec290285a9c88e76602c4b96d16))

### 🚀 Features

- show docker tag version info ([#92](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/92/overview)) - EBSIINT-4367 ([9a1e1a6](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/9a1e1a6f7903b4e48da55b5ae5c5c8a985f071ba))

## [2.0.0-rc.0](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.7&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.0&targetRepoId=292) (2022-06-09)

### ⚠ BREAKING CHANGES

- update libs, use Authorisation API v2 and TAR v3 (#70) - EBSIINT-4004

### 🐛 Bug Fixes

- update Node.js to v16.14.2 ([#71](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/71/overview)) - EBSIINT-3981 ([dca3133](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/dca313308712eb0cd3117a4fc7c039ae40dd1f03))

### 🚀 Features

- bump dependencies ([#75](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/75/overview)) - EBSIINT-4236 ([6c89de5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/6c89de514349a759c290b9272d842087880c49f8))
- update libs, use Authorisation API v2 and TAR v3 ([#70](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/70/overview)) - EBSIINT-4004 ([240e231](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/240e23189b156b8a6e7d952d71d17aa8603a5dee))

## [1.0.0-rc.7](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.6&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.7&targetRepoId=292) (2022-03-16)

### 🚀 Features

- implement TPR updates ([#63](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/63/overview)) - EBSIINT-3847 ([1f130ec](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/1f130ec6f97127f0cc62f2553a559a80ea084345))
- log requests and responses ([#57](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/57/overview)) - EBSIINT-3651 ([58dc1b3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/58dc1b3743ed844af9c2d4e9efa6606244b35d73))
- support multibase base58btc schema IDs ([#65](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/65/overview)) - EBSIINT-3915 ([385ded9](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/385ded96ef92ce4965cd19216d712bde92182049))

## [1.0.0-rc.6](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.5&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.6&targetRepoId=292) (2021-12-06)

### 🚀 Features

- add sendSignedTransaction alias ([#54](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/54/overview)) - EBSIINT-3474 ([b01610e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/b01610eb06b99e729ad3f2741d93c268e12f9155))

## [1.0.0-rc.5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.4&sourceBranch=refs%2Ftags%2Fv1.0.0&targetRepoId=292) (2021-11-16)

### 🚀 Features

- update Node.js to v16.13.0 ([#49](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/49/overview)) - EBSIINT-3496 ([58cf93d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/58cf93d126a56a1f2093c1386b79cc733a60864c))

## [1.0.0-rc.4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.3&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.4&targetRepoId=292) (2021-10-18)

### 🐛 Bug Fixes

- update Node.js version to v14.18.1 ([#46](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/46/overview)) - EBSIINT-3432 ([9304890](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/93048904bc2febb01c543c4ed2bea1e97388f281))

## [1.0.0-rc.3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.2&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.3&targetRepoId=292) (2021-10-04)

### 🚀 Features

- support DID JWT with publicKeyMultibase ([#43](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/43/overview)) - EBSIINT-3363 ([67670a0](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/67670a0e349a750b6da035377b22e890a2618e3e))
- support new EBSI DID specifications ([#42](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/42/overview)) - EBSIINT-3363 ([7243519](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/7243519fbc91b0e55b93c92927a8a711a8a0a36e))

## [1.0.0-rc.2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.1&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.2&targetRepoId=292)(2021-09-15)

### 🚀 Features

- control access with admin attributes ([#40](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/40/overview)) - EBSIINT-3297 ([e8c08e4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/e8c08e44d063586a83f8d82f12572bd609247839))

### 🐛 Bug Fixes

- update dependencies and upgrade Node.js to 14.17.2 ([#31](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/31/overview)) - EBSIINT-3174 ([d9cacc3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/d9cacc31b9019662fbf96493d136045b42ef891d))
- update Node.js to v14.17.5 ([#37](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/37/overview)) - EBSIINT-3220 ([c2f41e7](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/c2f41e7f980291c53ab4a94e87b2a34751675c2f))
- upgrade Node.js to v14.17.4 ([#35](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/35/overview)) - EBSIINT-3206 ([54005c6](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/54005c6b002e76c0f5ac943c59b84d48595cbe7c))

## [1.0.0-rc.1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.0&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.1&targetRepoId=292) (2021-06-17)

### 🐛 Bug Fixes

- handle local API 404 response ([#24](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/24/overview)) - EBSIINT-3039 ([bc4e06d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/bc4e06d841391627aa27fd1508843668b57b257a))
- update libs ([#25](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/25/overview)) - EBSIINT-3060 ([2e3ed7f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/2e3ed7f8a653eefd91c313812bddb49034533f39))

### 🚀 Features

- add case insensitive support ([#27](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/27/overview))- EBSIINT-3094 ([5b18bfe](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/5b18bfe399e9334c369529691ea62e4b72ac353c))
- intercept Axios requests and redirect them to the local network ([#23](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/pull-requests/23/overview)) - EBSIINT-3039 ([6d2fbae](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/trusted-schemas-registry-api/commits/6d2fbaea34f0caf34d7f09662ba4b506280a05bb))

## 1.0.0-rc.0 (2021-05-20)

Initial release.
