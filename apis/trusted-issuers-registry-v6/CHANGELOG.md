# Changelog

## 6.0.0-rc.3

### Minor Changes

- [9f40e39d2fc3e553b1769993eb412ad2e49e2ece](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/9f40e39d2fc3e553b1769993eb412ad2e49e2ece): Expose smart contract's ABI through the new GET /abi endpoint.
- [6dcd58e4abc78ddf0a544865a487246d12ebbb73](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6dcd58e4abc78ddf0a544865a487246d12ebbb73): Automatically replace the hostname from references to EBSI resources in VCs by one of the trusted hostnames.

### Patch Changes

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
- [44b963f20f875620bd668c7e1ed4582dbda105c4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/44b963f20f875620bd668c7e1ed4582dbda105c4): Support EIP-155 `v` for legacy transactions.
- [177ee281556ab0bcca1f7264ab1c4dfc9d2611a2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/177ee281556ab0bcca1f7264ab1c4dfc9d2611a2): Fix validation of query for /attributes endpoint
- [9cfe0289fb7433ebe331fa924a4b83bbc0d10f8b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/9cfe0289fb7433ebe331fa924a4b83bbc0d10f8b): Accept only type 0 (legacy) transactions.
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
  - @ebsiint-sc/trusted-issuers-registry-v4@4.0.0-rc.3
  - @ebsiint-subgraph/trusted-issuers-registry-v4@0.0.0-rc.2

## 6.0.0-rc.2

### Minor Changes

- [11102ddcabfcd9574108b6abc151c1d3a9a3fb58](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/11102ddcabfcd9574108b6abc151c1d3a9a3fb58): Filtering options in collections

### Patch Changes

- [9a1e6fd5ef796d4ad35545b0e75136d5183f7252](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/9a1e6fd5ef796d4ad35545b0e75136d5183f7252): Update Open API
- [fbef87cd3272925b76b090840fdf5988a8674c3c](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/fbef87cd3272925b76b090840fdf5988a8674c3c): Use URLSearchParams to create queries in collections.
- [0b2fc67ae0f01006cd8de8a6c4fe09e1c4273a89](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/0b2fc67ae0f01006cd8de8a6c4fe09e1c4273a89): Bump dependencies.
- [e42337f296ad7ca356852fd572d700885815a4b3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/e42337f296ad7ca356852fd572d700885815a4b3): Reject requests when query parameter is not supported
- [5edc6281f1931fbcb92e368b5f549a57074c0dcb](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/5edc6281f1931fbcb92e368b5f549a57074c0dcb): Check subgraph in the healthcheck
- [4053ea85d8cf551558770ec35243ae983eefb1ca](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4053ea85d8cf551558770ec35243ae983eefb1ca): Bump dependencies.
- [426cf3113318345473cfdfc9da7102820e613a08](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/426cf3113318345473cfdfc9da7102820e613a08): Bump dependencies.
- [6314280d6e274c381e67008b5c2960ad4ce7e757](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6314280d6e274c381e67008b5c2960ad4ce7e757): Add the possibility to disable the LoggingInterceptor for specific endpoints.
- Updated dependencies [749d0572d4f80818577b4596ad1dfcd8eccfd8df](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/749d0572d4f80818577b4596ad1dfcd8eccfd8df)
- Updated dependencies [e9c5b06ea71f49dc964520bac26281a9c7430a6f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/e9c5b06ea71f49dc964520bac26281a9c7430a6f)
- Updated dependencies [0b2fc67ae0f01006cd8de8a6c4fe09e1c4273a89](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/0b2fc67ae0f01006cd8de8a6c4fe09e1c4273a89)
- Updated dependencies [4053ea85d8cf551558770ec35243ae983eefb1ca](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4053ea85d8cf551558770ec35243ae983eefb1ca)
- Updated dependencies [426cf3113318345473cfdfc9da7102820e613a08](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/426cf3113318345473cfdfc9da7102820e613a08)
- Updated dependencies [6314280d6e274c381e67008b5c2960ad4ce7e757](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6314280d6e274c381e67008b5c2960ad4ce7e757)
  - @ebsiint-subgraph/trusted-issuers-registry-v4@0.0.0-rc.1
  - @ebsiint-api/shared@1.1.0-rc.11
  - @ebsiint-sc/trusted-issuers-registry-v4@4.0.0-rc.2

## 6.0.0-rc.1

### Major Changes

- [dedda91612bd6d9ad03cbabdec1cde1b362cce8b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/dedda91612bd6d9ad03cbabdec1cde1b362cce8b): Refactor Trusted Issuers Registry using The Graph.

### Patch Changes

- [90b8973cbf68a6e6d34ba2a79ce8469f34eaa5c4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/90b8973cbf68a6e6d34ba2a79ce8469f34eaa5c4): Catch error for malformed uri
- [8993a31a472a9ad2a59dbc2999f20e863f4c581d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/8993a31a472a9ad2a59dbc2999f20e863f4c581d): Bump VC and VP libraries.
- [50694cacbd827eeefecbcd2cc765b5660083cccd](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/50694cacbd827eeefecbcd2cc765b5660083cccd): Check Besu readiness in health check.
- [4c68d45d647735cefa90e5545ff1b5b0c89703ae](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4c68d45d647735cefa90e5545ff1b5b0c89703ae): Do not return "EBSI-Image-Tag" header anymore.
- [6a80f5defa229fa1700bc9a0687d0215b0cff838](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6a80f5defa229fa1700bc9a0687d0215b0cff838): Fix validator.js imports.
- [e7308c9cdb1eccbedd0b23b7d5885be6fa97c9c9](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/e7308c9cdb1eccbedd0b23b7d5885be6fa97c9c9): Make the validation of an issuer's proxy stricter.
- [bae95139fed8502357e6b00ecefe897e4b74cb9f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/bae95139fed8502357e6b00ecefe897e4b74cb9f): Connect with Authorisation API v5
- [917370b20c6efe84f3f7c7128dfdb2a7a5457c81](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/917370b20c6efe84f3f7c7128dfdb2a7a5457c81): Bump dependencies and upgrade Node.js to v20.16.0.
- Updated dependencies [dedda91612bd6d9ad03cbabdec1cde1b362cce8b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/dedda91612bd6d9ad03cbabdec1cde1b362cce8b)
- Updated dependencies [90b8973cbf68a6e6d34ba2a79ce8469f34eaa5c4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/90b8973cbf68a6e6d34ba2a79ce8469f34eaa5c4)
- Updated dependencies [8993a31a472a9ad2a59dbc2999f20e863f4c581d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/8993a31a472a9ad2a59dbc2999f20e863f4c581d)
- Updated dependencies [9c3dba3e038d65e5970171ce242a8e7b93c2970f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/9c3dba3e038d65e5970171ce242a8e7b93c2970f)
- Updated dependencies [651235bffbb0168f18ff4631b750103de7312477](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/651235bffbb0168f18ff4631b750103de7312477)
- Updated dependencies [4c4d31138e5ba5c9cedd3e598a0017b90335119e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4c4d31138e5ba5c9cedd3e598a0017b90335119e)
- Updated dependencies [917370b20c6efe84f3f7c7128dfdb2a7a5457c81](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/917370b20c6efe84f3f7c7128dfdb2a7a5457c81)
  - @ebsiint-sc/trusted-issuers-registry-v4@4.0.0-rc.1
  - @ebsiint-api/shared@1.1.0-rc.10
