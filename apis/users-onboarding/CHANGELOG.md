# Changelog

## 2.0.0-rc.3

### Minor Changes

- [be8604c9](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/be8604c9): Support `did:key` method for Natural Persons.

### Patch Changes

- [2f8b1686](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/2f8b1686): Bump dependencies.
- [7e8b0649](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/7e8b0649): Prevent direct access to /users-onboarding/v2/authentication and fix validation of EU Login tickets.
- [c9f6e302](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/c9f6e302): Refactor common code with Sonar-reported high complexity.
  Update rules for http patch path attribute args to have any order.
- [6d699188](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6d699188): Bump dependencies, refactor tests.
- [1e62e0cc](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1e62e0cc): Move custom errors from `@cef-ebsi/problem-details-errors` to `@ebsiint-api/shared`
- Updated dependencies [6d699188](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6d699188)
- Updated dependencies [be8604c9](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/be8604c9)
- Updated dependencies [1e62e0cc](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1e62e0cc)
  - @ebsiint-api/shared@1.1.0-rc.0

## [2.0.0-rc.2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.1&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.2&targetRepoId=234) (2022-09-22)

### 🚀 Features

- add timeout to http requests ([#106](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/106/overview)) - EBSIINT-4529 ([47532c3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/47532c3554d2aa64c28471689933232069ce6831))

### 🐛 Bug Fixes

- fix Fastify Helmet plugin import ([#107](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/107/overview)) - EBSIINT-4529 ([3577cf1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/3577cf1872b598eba2ea51308ee3ed7718a84d88))
- fixes vulnerability `GHSA-wc69-rhjr-hc9g` ([#105](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/105/overview)) - EBSIINT-4439 ([341da46](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/341da46a936b905a04fd2d66ff61c729eebf06bc))

## [2.0.0-rc.1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.0&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.1&targetRepoId=234) (2022-07-06)

### 🚀 Features

- show docker tag version info ([#97](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/97/overview)) - EBSIINT-4368 ([f9e4221](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/f9e422125c1d83f2dc609489a8a759a4b4d1f2fc))

## [2.0.0-rc.0](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.10&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.0&targetRepoId=234) (2022-06-09)

### ⚠ BREAKING CHANGES

- the API returns a VC JWT now

### 🐛 Bug Fixes

- update Node.js to v16.14.2 ([#78](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/78/overview)) - EBSIINT-3981 ([261bac8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/261bac8f400eff2b432f1be8f8524827a2a4c465))
- update VC lib, support latest APIs ([#79](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/79/overview)) - EBSIINT-4037 ([36d3c23](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/36d3c233c339a0094c7b26b09b3bb947b88c2abf))

### 🚀 Features

- bump dependencies ([#84](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/84/overview)) - EBSIINT-4237 ([802008b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/802008b1ba0f74092e0f2ad73645c418d1928359))
- intercept and log requests and responses ([#62](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/62/overview)) - EBSIINT-3651 ([651c43b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/651c43bcf5761fcc1393d45b9c51e6e97628e0fb))
- update libs, use TAR API v3 ([#77](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/77/overview)) - EBSIINT-4005 ([5e4b5b8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/5e4b5b88a75af9d47c4989897d761d8f9cfce0a5))
- upgrade VC and VP libraries ([#68](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/68/overview)) - EBSIINT-3794 ([f59942b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/f59942b46a9587335380da03d8fd8be848581106))

## [1.0.0-rc.10](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.9&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.10&targetRepoId=234) (2021-12-06)

## [1.0.0-rc.9](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.8&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.9&targetRepoId=234) (2021-11-16)

### 🚀 Features

- update Node.js to v16.13.0 ([#54](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/54/overview)) - EBSIINT-3496 ([7687827](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/76878276092143e56c8a54feb1e753bdccdd70a2))

## [1.0.0-rc.8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.7&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.8&targetRepoId=234) (2021-10-18)

### 🐛 Bug Fixes

- update Node.js version to v14.18.1 ([#50](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/50/overview)) - EBSIINT-3432 ([76e33d4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/76e33d4f051dfd6c3746f6448c20b5f8e029f45b))
- verify DID in ID token ([#48](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/48/overview)) - EBSIINT-3427 ([32d3974](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/32d39744803dae4bb2031fb69a1dc810577f2fd1))

## [1.0.0-rc.7](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.6&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.7&targetRepoId=234) (2021-10-04)

### 🚀 Features

- support DID JWT with publicKeyMultibase ([#44](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/44/overview)) - EBSIINT-3336 ([39f0d07](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/39f0d071c5fddced7691cbb66f9b70437209a538))

## [1.0.0-rc.6](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.5&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.6&targetRepoId=234) (2021-09-20)

### 🐛 Bug Fixes

- fix 500 error - EBSIINT-3312 ([77172b9](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/77172b90eda48e7738143f0ce02c84ea37615be9))
- fix 500 error invalid bearer token ([#41](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/41/overview)) - EBSIINT-3314 ([ef1922f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/ef1922f91e63951c9f9337a19aef6c343c056e3e))
- update Node.js to v14.17.5 ([#37](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/37/overview)) - EBSIINT-3220 ([b06973e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/b06973e9eb7e5482c96442eb16f396f3e9597f63))

## [1.0.0-rc.5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.4&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.5&targetRepoId=234) (2021-08-04)

### 🐛 Bug Fixes

- missing try-catch decoding id_token ([#32](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/32/overview)) - EBSIINT-3204 ([af7c76f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/af7c76f813f9702244edd33515514380dbda1add))
- upgrade Node.js to v14.17.4 ([#34](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/34/overview)) - EBSIINT-3206 ([76dc4a3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/76dc4a3f8413110ce4565588930dba81ccd6c88e))

## [1.0.0-rc.4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.3&sourceBranch=refs%2Ftags%2Fv1.0.0&targetRepoId=234) (2021-07-27)

### 🐛 Bug Fixes

- authentication-responses url encoded body ([#28](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/28/overview)) - EBSIINT-3198 ([ad13341](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/ad1334144bbcaa191f0592cc26ce3dadbe2ab26d))
- update dependencies and upgrade Node.js to 14.17.2 ([#26](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/26/overview)) - EBSIINT-3174 ([56f8bda](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/56f8bda21b0b7deac3237f796e8d601e9e88ba0d))

## [1.0.0-rc.3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.2&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.3&targetRepoId=234) (2021-06-17)

### 🚀 Features

- intercept Axios requests and redirect them to the local network ([#18](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/18/overview)) - EBSIINT-3039 ([75cd119](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/75cd119c25c06d5955b0e74bf0c062cb0c24fadc))

### 🐛 Bug Fixes

- add expiration to session token ([#19](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/19/overview)) - EBSIINT-3036 ([bfdb2d5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/bfdb2d506a39dde3918c0da88f73ee0345bd940d))
- fix EU Login on testnet ([#16](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/16/overview)) - EBSIINT-3014 ([128fbad](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/128fbad775150b086967996307d17fd79e50b348))
- handle local API 404 response ([#20](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/20/overview)) - EBSIINT-3039 ([f64ccde](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/f64ccdeff8c8afad028321bca7caa835b87e6ade))
- handle missing JWT error better ([#17](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/17/overview)) - EBSIINT-3016 ([a7bf3cc](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/a7bf3ccf77ae76cb5c36a469a027ae111aca04ee))
- update VC library ([#22](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/22/overview)) - EBSIINT-3096 ([d7a4e58](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/d7a4e5820a1883bb68fbbf8dd985c40656a2f80b))

## [1.0.0-rc.2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.1&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.2&targetRepoId=234) (2021-05-21)

### 🐛 Bug Fixes

- make user test vars optional ([#14](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/pull-requests/14/overview)) - EBSIINT-3012 ([3a9f7f2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/commits/3a9f7f286c07c5dc1f7fd7b5a2f753498f319cb2))

## [1.0.0-rc.1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/users-onboarding-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.0&sourceBranch=refs%2Ftags%2Fv1.0.0&targetRepoId=234) (2021-05-20)

## 1.0.0-rc.0 (2021-05-19)

Initial release.
