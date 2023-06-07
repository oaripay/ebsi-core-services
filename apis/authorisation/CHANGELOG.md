# Changelog

## 2.0.0-rc.5

### Minor Changes

- [8a546607](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/8a546607): Expose service OpenAPI specification
- [70631f93](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/70631f93): bump VC/VP libraries

### Patch Changes

- [443664aa](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/443664aa): Bump EBSI libraries.
- [357775c1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/357775c1): Fix vulnerabilities related to the Docker image.
- [1fb98741](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1fb98741): Bump dependencies.
- [8a245129](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/8a245129): Bump EBSI libraries.
- Updated dependencies [443664aa](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/443664aa)
- Updated dependencies [70631f93](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/70631f93)
- Updated dependencies [1fb98741](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1fb98741)
- Updated dependencies [8a245129](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/8a245129)
  - @ebsiint-api/shared@1.1.0-rc.2

## 2.0.0-rc.4

### Minor Changes

- [f2257d7d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f2257d7d): connect APIs with DID Registry API v4

### Patch Changes

- [adc663ea](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/adc663ea): Bump dependencies.
- [78ee438b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/78ee438b): Bump dependencies.
- Updated dependencies [adc663ea](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/adc663ea)
- Updated dependencies [a6a1f685](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/a6a1f685)
- Updated dependencies [f2257d7d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f2257d7d)
- Updated dependencies [78ee438b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/78ee438b)
  - @ebsiint-api/shared@1.1.0-rc.1

## 2.0.0-rc.3

### Patch Changes

- [2f8b1686](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/2f8b1686): Bump dependencies.
- [c9f6e302](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/c9f6e302): Refactor common code with Sonar-reported high complexity.
  Update rules for http patch path attribute args to have any order.
- [6d699188](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6d699188): Bump dependencies, refactor tests.
- [1e62e0cc](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1e62e0cc): Move custom errors from `@cef-ebsi/problem-details-errors` to `@ebsiint-api/shared`
- Updated dependencies [6d699188](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6d699188)
- Updated dependencies [be8604c9](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/be8604c9)
- Updated dependencies [1e62e0cc](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1e62e0cc)
  - @ebsiint-api/shared@1.1.0-rc.0

## [2.0.0-rc.2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.1&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.2&targetRepoId=359) (2022-09-21)

### 🚀 Features

- add timeout to http requests ([#129](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/129/overview)) - EBSIINT-4529 ([f50133b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/f50133b3697aa1fa052ecc8f0c2de0df9341237f))

### 🐛 Bug Fixes

- fix Fastify Helmet plugin import ([#130](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/130/overview)) - EBSIINT-4529 ([02fa52b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/02fa52b716cb20340a244353f309d93bc96a4760))
- fix health check path ([aa41071](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/aa41071916b07b1b468416b7b2e66bf86f996eda))
- fixes vulnerability `GHSA-wc69-rhjr-hc9g` ([#128](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/128/overview)) - EBSIINT-4439 ([ab263e8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/ab263e81ddf25f06fce49901ab6dc841f01225cc))

## [2.0.0-rc.1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.0&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.1&targetRepoId=359) (2022-07-06)

### 🚀 Features

- display docker image tag in api header on test ([#114](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/114/overview)) - EBSIINT-4320 ([11adbe3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/11adbe3ed1d5f7d19feaaf912a82749f0d2064c9))

## [2.0.0-rc.0](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.14&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.0&targetRepoId=359) (2022-06-08)

### 🐛 Bug Fixes

- temporary fix new urls in verifyCredentialJwt ([#96](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/96/overview)) - EBSIINT-4023 ([bcf7786](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/bcf778607c45c9d42dc8a4f5c5f4bcfca3df22dd))
- update Node.js to v16.14.2 ([#95](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/95/overview)) - EBSIINT-3981 ([3fb510e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/3fb510e3d6052ed1f2277e118046edf4411cfb19))
- update VC lib, support latest APIs ([#97](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/97/overview)) - EBSIINT-4037 ([36eeb9f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/36eeb9fc4fc430e5809020daddd258dc89699492))

### 🚀 Features

- bump dependencies ([#103](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/103/overview)) - EBSIINT-4225 ([044a457](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/044a45790ee61d3793991a14c1b5bd74cfe4be53))
- log requests and responses ([#78](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/78/overview)) - EBSIINT-3651 ([21187b2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/21187b29a40b4364fd21a9d58643285fbc7daf17))
- use new EBSI VC and VP libraries ([#87](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/87/overview)) - EBSIINT-3791 ([582625c](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/582625c85798fba52145601224ec23413c5d2865))

## [1.0.0-rc.14](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.13&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.14&targetRepoId=359) (2021-12-06)

## [1.0.0-rc.13](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.12&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.13&targetRepoId=359) (2021-11-15)

### 🚀 Features

- update Node.js to v16.13.0 ([#70](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/70/overview)) - EBSIINT-3496 ([a9a5b10](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/a9a5b10a514a3217ced0dc9ce3af7ee33fd8f6bf))

## [1.0.0-rc.12](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.11&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.12&targetRepoId=359) (2021-10-15)

### 🐛 Bug Fixes

- expect DID documents to have "[@context](https://ec.europa.eu/context)": "https://www.w3.org/ns/did/v1" ([#65](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/65/overview)) - EBSIINT-3415 ([521966b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/521966b394ef854675448041c2bd9383d3732ede))
- update Node.js version to v14.18.1 ([#66](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/66/overview)) - EBSIINT-3432 ([48ce0ea](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/48ce0ea81672fece5f7cb0085f4b2eea44886f57))

## [1.0.0-rc.11](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.10&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.11&targetRepoId=359) (2021-10-04)

### 🚀 Features

- return error 500 in /siop-sessions if the DID Registry returns 500 ([#60](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/60/overview)) - EBSIINT-3337 ([5c489ff](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/5c489ff5aee6e3e54ce87db7f13cbab1de0b6c87))

## [1.0.0-rc.10](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.9&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.10&targetRepoId=359) (2021-09-09)

### 🚀 Features

- support different encryption keys ([#52](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/52/overview)) - EBSIINT-3221 ([4280a49](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/4280a49716cb2278b3a11502fae36e45b1c38fb2))

## [1.0.0-rc.9](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.8&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.9&targetRepoId=359) (2021-08-16)

### 🐛 Bug Fixes

- update Node.js to v14.17.5 ([#51](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/51/overview)) - EBSIINT-3220 ([c1b5f91](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/c1b5f91c0ee9f1167de60b5e824e8f93365c2a97))

### 🚀 Features

- allow VAs from different trusted entities ([#53](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/53/overview)) - EBSIINT-3222 ([c37464c](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/c37464c8914f2a64d0bbfab13f66dfb4f877e6c9))

## [1.0.0-rc.8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.7&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.8&targetRepoId=359) (2021-08-09)

### 🐛 Bug Fixes

- update wallet lib and other dependencies ([#48](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/48/overview)) - EBSIINT-3215 ([f537559](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/f5375599d478ef4ea3e66e1f8da9034151948ad4))

## [1.0.0-rc.7](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.6&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.7&targetRepoId=359) (2021-08-04)

### 🚀 Features

- support new algorithms ([#40](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/40/overview)) - EBSIINT-3195 ([623356f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/623356f4c2d4363b5f649ef75a73376fd09e61c9))

### 🐛 Bug Fixes

- jose in package.json ([#41](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/41/overview)) - EBSIINT-3195 ([20812a6](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/20812a6df142d5b3a3974e8b115022a4628ded0d))
- unit tests ([#42](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/42/overview)) - EBSIINT-3195 ([129c3e6](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/129c3e67537ec316be6b1111474cf2d62e2c575b))
- update openapi complete examples ([#45](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/45/overview)) - EBSIINT-3207 ([ea825db](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/ea825dbc7f3b5336225be55d7c3cb2ba34a87106))
- upgrade Node.js to v14.17.4 ([#44](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/44/overview)) - EBSIINT-3206 ([ac8b6bd](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/ac8b6bd3e72f35ef7ad490f5d9d170d2e9129c5c))

## [1.0.0-rc.6](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.5&sourceBranch=refs%2Ftags%2Fv1.0.0&targetRepoId=359) (2021-07-14)

## [1.0.0-rc.5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.4&sourceBranch=refs%2Ftags%2Fv1.0.0&targetRepoId=359) (2021-07-14)

### 🐛 Bug Fixes

- separately decode and parse error handling ([#33](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/33/overview)) - EBSIINT-3173 ([57254c7](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/57254c7771c346f02e6ad8b84e48a559dc89bb2e))

## [1.0.0-rc.4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.3&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.4&targetRepoId=359) (2021-07-13)

### 🐛 Bug Fixes

- throw bad request verified_claims /siop-sessions ([#30](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/30/overview)) - EBSIINT-3173 ([b67e561](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/b67e56174b742b5ab808abef7b7a9f96ac515979))
- update dependencies and upgrade Node.js to 14.17.2 ([#29](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/29/overview)) - EBSIINT-3174 ([0cd44b5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/0cd44b5071a978372e8e41ab1f610386502d884e))

## [1.0.0-rc.3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.2&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.3&targetRepoId=359) (2021-06-17)

### 🐛 Bug Fixes

- update VC/VP libraries ([#24](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/24/overview)) - EBSIINT-3096 ([75a6ae3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/75a6ae33637bbc6c5cce472c039660ea3d852e95))

## [1.0.0-rc.2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.1&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.2&targetRepoId=359) (2021-06-04)

### 🚀 Features

- intercept Axios requests and redirect them to the local network ([#18](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/18/overview)) - EBSIINT-3039 ([13a91ce](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/13a91cedcfb0f5eb4ca7c2c21e3a0bb1ab6a320c))

### 🐛 Bug Fixes

- handle local API 404 response ([#19](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/19/overview)) - EBSIINT-3039 ([1a148f2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/1a148f26e57fd43c1019ed57ec08bf41d8bff22e))

## [1.0.0-rc.1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/compare/diff?targetBranch=refs%2Ftags%2Fv1.0.0-rc.0&sourceBranch=refs%2Ftags%2Fv1.0.0-rc.1&targetRepoId=359) (2021-05-31)

### 🐛 Bug Fixes

- update libs - fix oauth2 verify ([#15](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/pull-requests/15/overview)) - EBSIINT-3044 ([1d289d2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/authorisation-api/commits/1d289d291bbf483a9853a9ef6ff26d2b01e92aa0))

## 1.0.0-rc.0 (2021-05-20)

Initial release.
