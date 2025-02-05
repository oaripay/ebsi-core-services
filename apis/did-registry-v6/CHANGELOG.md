# @ebsiint-api/did-registry-api-v6

## 6.0.0-rc.4

### Minor Changes

- [9f40e39d2fc3e553b1769993eb412ad2e49e2ece](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/9f40e39d2fc3e553b1769993eb412ad2e49e2ece): Expose smart contract's ABI through the new GET /abi endpoint.
- [377847a1b19d5742e81156f9e8bc165d37728798](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/377847a1b19d5742e81156f9e8bc165d37728798): Separate the JSON-RPC module of DID Registry API v6 into a separate API.

### Patch Changes

- [1bec9505db03e875ddca2a9343a3d0a624b7d56c](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1bec9505db03e875ddca2a9343a3d0a624b7d56c): Fix pagination of collections
- [123b3b85e39466a7d64ed85b42f5fd13ff9bbafc](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/123b3b85e39466a7d64ed85b42f5fd13ff9bbafc): Remove useless mutex
- [41adeeb787055864668f26a1a09ab33276e68597](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/41adeeb787055864668f26a1a09ab33276e68597): Improve Axios errors logging.
- [14279f52a0c8955c61db5a3940a79a614e2712d1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/14279f52a0c8955c61db5a3940a79a614e2712d1): Return error 405 when the HTTP method is not allowed.
  Return error 406 when the `Accept` header is not supported by the endpoint.
- [1a655b05daf57a3ef3d91f87c634c543d3736ea8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1a655b05daf57a3ef3d91f87c634c543d3736ea8): Bump dependencies, update Node.js to v20.18.0.
- [41e25b0dccbb5b40dbb201641611cbda585df050](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/41e25b0dccbb5b40dbb201641611cbda585df050): Return error 405 when the HTTP method is not allowed.
  Return error 406 when the `Accept` header is not supported by the endpoint.
- [319b62b1ff7ba0b9ed295b5dfd083339a2706532](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/319b62b1ff7ba0b9ed295b5dfd083339a2706532): Bump dependencies and update Node.js to v22.
- [6dcd58e4abc78ddf0a544865a487246d12ebbb73](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6dcd58e4abc78ddf0a544865a487246d12ebbb73): Bump dependencies.
- [559f4decb4e3e8fd53fc34f169c3c324997e285d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/559f4decb4e3e8fd53fc34f169c3c324997e285d): Update VC and VP libraries and refactor API configuration.
- [5b7541dd6ab86a99639d1298b66c6599391dffce](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/5b7541dd6ab86a99639d1298b66c6599391dffce): Validation of query and error handling
- [7e42f8c84a70118162ed118c60250bdbcd0ae022](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/7e42f8c84a70118162ed118c60250bdbcd0ae022): Handle WebSockets errors.
- [f45aed61262eb6d4033e9cf62fee067f7f2c3773](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f45aed61262eb6d4033e9cf62fee067f7f2c3773): Update Core Libs.
- [cc207c5d7adfa0843ff285edee10347283d5acff](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/cc207c5d7adfa0843ff285edee10347283d5acff): Update Node.js to v22.13.1 and bump dependencies.
- [3849b3d0a244d5385671ce8afa618f53bbddf35a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/3849b3d0a244d5385671ce8afa618f53bbddf35a): Bump EBSI Core Libs.
- [3b4ad1dc4f039c54ec79787bf717ffc83c33691f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/3b4ad1dc4f039c54ec79787bf717ffc83c33691f): Update ethers.js to v6.
- Updated dependencies [41adeeb787055864668f26a1a09ab33276e68597](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/41adeeb787055864668f26a1a09ab33276e68597)
- Updated dependencies [14279f52a0c8955c61db5a3940a79a614e2712d1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/14279f52a0c8955c61db5a3940a79a614e2712d1)
- Updated dependencies [41e25b0dccbb5b40dbb201641611cbda585df050](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/41e25b0dccbb5b40dbb201641611cbda585df050)
- Updated dependencies [319b62b1ff7ba0b9ed295b5dfd083339a2706532](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/319b62b1ff7ba0b9ed295b5dfd083339a2706532)
- Updated dependencies [6dcd58e4abc78ddf0a544865a487246d12ebbb73](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6dcd58e4abc78ddf0a544865a487246d12ebbb73)
- Updated dependencies [559f4decb4e3e8fd53fc34f169c3c324997e285d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/559f4decb4e3e8fd53fc34f169c3c324997e285d)
- Updated dependencies [7e42f8c84a70118162ed118c60250bdbcd0ae022](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/7e42f8c84a70118162ed118c60250bdbcd0ae022)
- Updated dependencies [f45aed61262eb6d4033e9cf62fee067f7f2c3773](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f45aed61262eb6d4033e9cf62fee067f7f2c3773)
- Updated dependencies [cc207c5d7adfa0843ff285edee10347283d5acff](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/cc207c5d7adfa0843ff285edee10347283d5acff)
- Updated dependencies [3849b3d0a244d5385671ce8afa618f53bbddf35a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/3849b3d0a244d5385671ce8afa618f53bbddf35a)
- Updated dependencies [3b4ad1dc4f039c54ec79787bf717ffc83c33691f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/3b4ad1dc4f039c54ec79787bf717ffc83c33691f)
  - @ebsiint-api/shared@1.1.0-rc.12
  - @ebsiint-sc/did-registry-v4@4.0.0-rc.4
  - @ebsiint-subgraph/did-registry-v4@0.0.0-rc.2

## 6.0.0-rc.3

### Patch Changes

- [e5290b28b28305c712f6fde7f02e13c6495c89f4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/e5290b28b28305c712f6fde7f02e13c6495c89f4): Update OpenAPI definition.
- [538538c4fcae1f68d21ea5d561877d764fb85e41](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/538538c4fcae1f68d21ea5d561877d764fb85e41): Set lower limit for valid at
- [0b2fc67ae0f01006cd8de8a6c4fe09e1c4273a89](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/0b2fc67ae0f01006cd8de8a6c4fe09e1c4273a89): Bump dependencies.
- [e42337f296ad7ca356852fd572d700885815a4b3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/e42337f296ad7ca356852fd572d700885815a4b3): Reject requests when query parameter is not supported
- [5edc6281f1931fbcb92e368b5f549a57074c0dcb](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/5edc6281f1931fbcb92e368b5f549a57074c0dcb): Check subgraph in the healthcheck
- [f415fd1f925046023eb10848b2fe8f87ea76d318](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f415fd1f925046023eb10848b2fe8f87ea76d318): Fix expiration and revocation of verification methods in DID Registry
- [4053ea85d8cf551558770ec35243ae983eefb1ca](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4053ea85d8cf551558770ec35243ae983eefb1ca): Bump dependencies.
- [426cf3113318345473cfdfc9da7102820e613a08](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/426cf3113318345473cfdfc9da7102820e613a08): Bump dependencies.
- [6314280d6e274c381e67008b5c2960ad4ce7e757](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6314280d6e274c381e67008b5c2960ad4ce7e757): Add the possibility to disable the LoggingInterceptor for specific endpoints.
- Updated dependencies [749d0572d4f80818577b4596ad1dfcd8eccfd8df](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/749d0572d4f80818577b4596ad1dfcd8eccfd8df)
- Updated dependencies [e9c5b06ea71f49dc964520bac26281a9c7430a6f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/e9c5b06ea71f49dc964520bac26281a9c7430a6f)
- Updated dependencies [0b2fc67ae0f01006cd8de8a6c4fe09e1c4273a89](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/0b2fc67ae0f01006cd8de8a6c4fe09e1c4273a89)
- Updated dependencies [f415fd1f925046023eb10848b2fe8f87ea76d318](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f415fd1f925046023eb10848b2fe8f87ea76d318)
- Updated dependencies [4053ea85d8cf551558770ec35243ae983eefb1ca](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4053ea85d8cf551558770ec35243ae983eefb1ca)
- Updated dependencies [426cf3113318345473cfdfc9da7102820e613a08](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/426cf3113318345473cfdfc9da7102820e613a08)
- Updated dependencies [b7a41337c3ed2f04083b007d90bd2b867d493e5e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/b7a41337c3ed2f04083b007d90bd2b867d493e5e)
- Updated dependencies [b25bb2d253b856aee9bca3b67122cc45b9016ec0](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/b25bb2d253b856aee9bca3b67122cc45b9016ec0)
- Updated dependencies [c7b7fa1a3049eb9c780b10e37f26342dfd8e552d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/c7b7fa1a3049eb9c780b10e37f26342dfd8e552d)
- Updated dependencies [6314280d6e274c381e67008b5c2960ad4ce7e757](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6314280d6e274c381e67008b5c2960ad4ce7e757)
  - @ebsiint-subgraph/did-registry-v4@0.0.0-rc.1
  - @ebsiint-api/shared@1.1.0-rc.11
  - @ebsiint-sc/did-registry-v4@4.0.0-rc.3

## 6.0.0-rc.2

### Minor Changes

- [338da97af65ca87361bf1ec70b8b9bf52d67ac67](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/338da97af65ca87361bf1ec70b8b9bf52d67ac67): Deployed Did Registry V4 in pilot at address: 0x236De3Bdd88764858d985681f3fc607EBf2082Df
- [9c3dba3e038d65e5970171ce242a8e7b93c2970f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/9c3dba3e038d65e5970171ce242a8e7b93c2970f): Support EBSI URI scheme in Core Services.

### Patch Changes

- [7a4068e0d9804be6295aedec7e610cbc253cb03e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/7a4068e0d9804be6295aedec7e610cbc253cb03e): Update Node.js to v20.14.0
- [7a4068e0d9804be6295aedec7e610cbc253cb03e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/7a4068e0d9804be6295aedec7e610cbc253cb03e): Update @graphprotocol/client-cli to v3.0.3
- [90b8973cbf68a6e6d34ba2a79ce8469f34eaa5c4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/90b8973cbf68a6e6d34ba2a79ce8469f34eaa5c4): Catch error for malformed uri
- [8993a31a472a9ad2a59dbc2999f20e863f4c581d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/8993a31a472a9ad2a59dbc2999f20e863f4c581d): Bump VC and VP libraries.
- [f29c5faec44fff1e960986d51bc4b0f60c61cb8c](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f29c5faec44fff1e960986d51bc4b0f60c61cb8c): Connect to Besu directly.
- [903955e66dacf4258dbeb2b29f771caae7ef3604](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/903955e66dacf4258dbeb2b29f771caae7ef3604): Remove dependency on TAR API v4.
- [651235bffbb0168f18ff4631b750103de7312477](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/651235bffbb0168f18ff4631b750103de7312477): Refactor Axios error logging.
- [f2b00c7ff4f00ee5186bca56f8c036e0ef73099a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f2b00c7ff4f00ee5186bca56f8c036e0ef73099a): Log errors in `sendTransaction`.
- [4c4d31138e5ba5c9cedd3e598a0017b90335119e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4c4d31138e5ba5c9cedd3e598a0017b90335119e): Refactor Axios error logging.
- [50694cacbd827eeefecbcd2cc765b5660083cccd](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/50694cacbd827eeefecbcd2cc765b5660083cccd): Check Besu readiness in health check.
- [4c68d45d647735cefa90e5545ff1b5b0c89703ae](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4c68d45d647735cefa90e5545ff1b5b0c89703ae): Do not return "EBSI-Image-Tag" header anymore.
- [5079c224bbffdb24879a46844774f629be09e7ad](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/5079c224bbffdb24879a46844774f629be09e7ad): Don't require `vMethodId` to be the thumbprint of the JWK. Instead, accept any string.
- [77f1af63debedd438f198f11305367076a39a36e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/77f1af63debedd438f198f11305367076a39a36e): Fix generation of documents
- [917370b20c6efe84f3f7c7128dfdb2a7a5457c81](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/917370b20c6efe84f3f7c7128dfdb2a7a5457c81): Bump dependencies and upgrade Node.js to v20.16.0.
- Updated dependencies [90b8973cbf68a6e6d34ba2a79ce8469f34eaa5c4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/90b8973cbf68a6e6d34ba2a79ce8469f34eaa5c4)
- Updated dependencies [8993a31a472a9ad2a59dbc2999f20e863f4c581d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/8993a31a472a9ad2a59dbc2999f20e863f4c581d)
- Updated dependencies [9c3dba3e038d65e5970171ce242a8e7b93c2970f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/9c3dba3e038d65e5970171ce242a8e7b93c2970f)
- Updated dependencies [651235bffbb0168f18ff4631b750103de7312477](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/651235bffbb0168f18ff4631b750103de7312477)
- Updated dependencies [4c4d31138e5ba5c9cedd3e598a0017b90335119e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4c4d31138e5ba5c9cedd3e598a0017b90335119e)
- Updated dependencies [917370b20c6efe84f3f7c7128dfdb2a7a5457c81](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/917370b20c6efe84f3f7c7128dfdb2a7a5457c81)
  - @ebsiint-api/shared@1.1.0-rc.10
  - @ebsiint-sc/did-registry-v4@4.0.0-rc.2

## 6.0.0-rc.1

### Patch Changes

- [d3a4a64a16df2bbeec587aadbf7bb5c02c577316](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/d3a4a64a16df2bbeec587aadbf7bb5c02c577316): Bump VC and VP libraries.
- [c66c349218fe427cfa59df0973b987ce14bbec09](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/c66c349218fe427cfa59df0973b987ce14bbec09): Support VC with credentialStatus as an array.
- Updated dependencies [d3a4a64a16df2bbeec587aadbf7bb5c02c577316](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/d3a4a64a16df2bbeec587aadbf7bb5c02c577316)
- Updated dependencies [c66c349218fe427cfa59df0973b987ce14bbec09](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/c66c349218fe427cfa59df0973b987ce14bbec09)
  - @ebsiint-api/shared@1.1.0-rc.9

## 6.0.0-rc.0

### Major Changes

- [6d196d75c6545e470aaa00df0c3dfedfdf72dc14](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6d196d75c6545e470aaa00df0c3dfedfdf72dc14): New DID Registry API v6

### Patch Changes

- [713311de4a45a79c4059b58bb42bf2e258205aac](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/713311de4a45a79c4059b58bb42bf2e258205aac): Validate dates of credentials linked in termsOfUse
- Updated dependencies [b8b8b09c11f84e7809fdea74f93167141eb3916e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/b8b8b09c11f84e7809fdea74f93167141eb3916e)
- Updated dependencies [713311de4a45a79c4059b58bb42bf2e258205aac](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/713311de4a45a79c4059b58bb42bf2e258205aac)
  - @ebsiint-api/shared@1.1.0-rc.8
