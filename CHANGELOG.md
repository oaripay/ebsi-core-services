# Changelog

All notable changes to this project will be documented in this file. 🤘

## [2.0.0-rc.8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.7&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.8&targetRepoId=244) (2022-03-16)

### 🚀 Features

- log requests and responses ([#93](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/93/overview)) - EBSIINT-3651 ([b98ba8e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/b98ba8eac756068c556f550c2267b844b10ceb77))

## [2.0.0-rc.7](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.6&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.7&targetRepoId=244) (2021-12-10)

## [2.0.0-rc.6](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.5&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.6&targetRepoId=244) (2021-11-15)

### 🚀 Features

- update Node.js to v16.13.0 ([#83](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/83/overview)) - EBSIINT-3496 ([8a7b184](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/8a7b184c8e4c7a4b8e49d649c812b77a35ec6546))

## [2.0.0-rc.5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.4&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.5&targetRepoId=244) (2021-10-27)

### 🚀 Features

- add Fabric "sendProposal" method ([#80](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/80/overview)) - EBSIINT-3437 ([a8cbb0f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/a8cbb0f5fb7b1d97c9c09191ac5b1c8bfc961bec))
- implement Fabric JSON-RPC readContract method ([#78](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/78/overview)) - EBSIINT-3436 ([b8abbcb](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/b8abbcb7bedd917bb096dd554ddd91eb21b99fe5))
- method commitTransaction for jsonrpc endpoint fabric ([#81](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/81/overview)) - EBSIINT-3438 ([79992e7](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/79992e76546087f00dbf1d6c051059b26b72ee19))

### 🐛 Bug Fixes

- update Node.js version to v14.18.1 ([#77](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/77/overview)) - EBSIINT-3432 ([4cee632](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/4cee632a41034b3f93920ad405f11b465fffa034))

## [2.0.0-rc.4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.3&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.4&targetRepoId=244) (2021-10-04)

### 🚀 Features

- support DID JWT with publicKeyMultibase ([#73](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/73/overview)) - EBSIINT-3367 ([a09f6a4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/a09f6a4da5fa94f774614ff1209a3421cb4c25f9))

### 🐛 Bug Fixes

- prevent SIOP auth for /besu eth_sendRawTransaction ([#74](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/74/overview)) - EBSIINT-3377 ([27ac2fe](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/27ac2fe71355a7e59cbab1f442f804a40f4d076b))

## [2.0.0-rc.3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.2&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.3&targetRepoId=244) (2021-09-09)

### 🚀 Features

- add GET /blockchains/fabric/channels/{channel}/blocks ([#59](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/59/overview)) - EBSIINT-2632 ([4d08e9a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/4d08e9a0a323f52076ec697711bdffcf0aed4bb9))
- allow public Besu methods to be accessed without a JWT ([#67](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/67/overview)) - EBSIINT-3265 ([e972fef](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/e972feffc2f813b850aee0f196d28d12f0efb331))
- allow siop tokens ([#66](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/66/overview)) - EBSIINT-3253 ([1de5901](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/1de5901ed625bbd36d155b14cc2fd89f6a54d663))
- connect to Besu using WebSocket instead of HTTPS ([#52](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/52/overview)) - EBSIINT-3134 ([f76b7ff](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/f76b7ffe3b747c3b2e15b8f2f6dbb7f0a4f69ced))
- get fabric transactions ([#62](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/62/overview)) - EBSIINT-2634 ([85f8178](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/85f8178154cb43d432d1c95f3b2bd816c65443a5))
- implement /blockchains/fabric/channels endpoint ([#56](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/56/overview)) - EBSIINT-2630 ([88193dc](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/88193dc8a8e3c399510d54e9afeaca4ed8d670ec))
- implement /blockchains/fabric/channels/{channel} endpoint ([#58](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/58/overview)) - EBSIINT-2631 ([c10de2d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/c10de2d64ac9be93de163df042684ed107635276))
- implement /blockchains/fabric/channels/{channel}/blocks/{blockNumber} ([#61](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/61/overview)) - EBSIINT-2633 ([3eba656](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/3eba65673ec3460907daf1c4070e30b03b6da018))
- implement GET /blockchains/fabric/channels/{channel}/transactions/{transactionId} ([#65](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/65/overview)) - EBSIINT-2635 ([9fb2f8b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/9fb2f8bf6e482e9f55060731e390adffcf481a97))

### 🐛 Bug Fixes

- access wallet folder for fabric ([#69](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/69/overview)) - EBSIINT-3255 ([b725b28](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/b725b28138c391a229c1fed69cd7562502be275d))
- check if url includes /blockchains/besu ([#68](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/68/overview)) - EBSIINT-3265 ([45ab46a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/45ab46a1aa4724b65452226224000eb05883be9e))
- update dependencies and upgrade Node.js to 14.17.2 - EBSIINT-3174 ([05f2282](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/05f2282ed5e64b65fa236681e4f2924af5a3bf16))
- update Node.js to v14.17.5 ([#63](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/63/overview)) - EBSIINT-3220 ([58954c9](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/58954c9bd4f49f42e9f7e67f091f467565aabb44))
- upgrade Node.js to v14.17.4 ([#57](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/57/overview)) - EBSIINT-3206 ([b453813](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/b45381367eb4a033cc33027c6d29767f5a0ff96f))

## [2.0.0-rc.2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.1&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.2&targetRepoId=244) (2021-06-17)

### 🚀 Features

- intercept Axios requests and redirect them to the local network ([#44](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/44/overview)) - EBSIINT-3026 ([3c30fdf](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/3c30fdf16b48b122cae409da057c2d81d84926eb))
- store local API JWTs in cache ([#45](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/45/overview)) - EBSIINT-3038 ([c18e447](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/c18e447e24805e2353bafc5f9180bcb61994e5d2))

### 🐛 Bug Fixes

- handle local API 404 response ([#48](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/48/overview)) - EBSIINT-3039 ([5016f40](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/5016f40859602adeb403d3de7ba4e10bb497daad))

## [2.0.0-rc.1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/compare/diff?targetBranch=refs%2Ftags%2Fv2.0.0-rc.0&sourceBranch=refs%2Ftags%2Fv2.0.0-rc.1&targetRepoId=244) (2021-05-20)

### 🚀 Features

- jwt authentication ([#37](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/pull-requests/37/overview)) - EBSIINT-2937 ([5f2b0fc](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/5f2b0fc48189eea7b4ea1bcdab01bcbf8d55db74))

### 🐛 Bug Fixes

- dependencies - EBSIINT-2937 ([5a2c289](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/5a2c28984069012bffda67a573057f9291d2cdcd))
- temporary fix - EBSIINT-2937 ([30142dd](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/ledger-api/commits/30142dd4f18ab633af9ad8696eb4216d258d4098))

## 2.0.0-rc.0 (2021-04-08)

Initial release.
