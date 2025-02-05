# @ebsiint-sc/admin-scripts

## 2.0.0-rc.10

### Minor Changes

- [2b765832f488148f09139cf6fa57a169a1ee32c3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/2b765832f488148f09139cf6fa57a169a1ee32c3): Added tsr deployment latest version
- [3ead238919891688491076d90d660d90dbbcaa98](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/3ead238919891688491076d90d660d90dbbcaa98): create 2 private keys: TPR operator (tprOp), and Support Office (SO).
  Assign the "operator role" to the tprOp in the TPR.
  Use the tprOp create policies in the TPR (insertPolicy) and assign these policies to the SO (insertUserAttributes)
  Register DIDs for tprOp and SO in the did registry
  Use the SO to register hash algs in timestamp sc (insertHashAlgorithm)
  Register the SO in the TIR as roottao
  Use the SO to register the schemas (https://code.europa.eu/ebsi/json-schema/-/tree/main)

### Patch Changes

- [49df5f6d31ca8a64fe9c301d3426704058585fc3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/49df5f6d31ca8a64fe9c301d3426704058585fc3): Fixed node -v and hre dependency
- [5b67fc6bb18008734237e1fffee9e76e607844fc](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/5b67fc6bb18008734237e1fffee9e76e607844fc): Fix `getJwks` function to return JWKs with correct `crv` property.
- [68eddd584f46fca10be6025e77908ecd15b96a17](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/68eddd584f46fca10be6025e77908ecd15b96a17): EbsiInABox Deployment of SC
- [319b62b1ff7ba0b9ed295b5dfd083339a2706532](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/319b62b1ff7ba0b9ed295b5dfd083339a2706532): Bump dependencies and update Node.js to v22.
- [6dcd58e4abc78ddf0a544865a487246d12ebbb73](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6dcd58e4abc78ddf0a544865a487246d12ebbb73): Bump dependencies.
- [586f3d0e9898a5162c1a2ba50f4bb87ed7a06a1a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/586f3d0e9898a5162c1a2ba50f4bb87ed7a06a1a): Fix dependencies.
- [cc207c5d7adfa0843ff285edee10347283d5acff](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/cc207c5d7adfa0843ff285edee10347283d5acff): Update Node.js to v22.13.1 and bump dependencies.
- [3849b3d0a244d5385671ce8afa618f53bbddf35a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/3849b3d0a244d5385671ce8afa618f53bbddf35a): Bump EBSI Core Libs.
- [3b4ad1dc4f039c54ec79787bf717ffc83c33691f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/3b4ad1dc4f039c54ec79787bf717ffc83c33691f): Update ethers.js to v6.
- Updated dependencies [319b62b1ff7ba0b9ed295b5dfd083339a2706532](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/319b62b1ff7ba0b9ed295b5dfd083339a2706532)
- Updated dependencies [6dcd58e4abc78ddf0a544865a487246d12ebbb73](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6dcd58e4abc78ddf0a544865a487246d12ebbb73)
- Updated dependencies [cc207c5d7adfa0843ff285edee10347283d5acff](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/cc207c5d7adfa0843ff285edee10347283d5acff)
- Updated dependencies [3b4ad1dc4f039c54ec79787bf717ffc83c33691f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/3b4ad1dc4f039c54ec79787bf717ffc83c33691f)
  - @ebsiint-sc/trusted-policies-registry-v2@2.0.0-rc.6
  - @ebsiint-sc/trusted-policies-registry-v3@3.0.0-rc.3
  - @ebsiint-sc/trusted-issuers-registry-v3@3.0.0-rc.7
  - @ebsiint-sc/trusted-issuers-registry-v4@4.0.0-rc.3
  - @ebsiint-sc/trusted-schemas-registry-v2@2.0.0-rc.6
  - @ebsiint-sc/trusted-schemas-registry-v3@3.0.0-rc.3
  - @ebsiint-sc/trusted-policies-registry@1.0.1-rc.10
  - @ebsiint-sc/trusted-issuers-registry@2.0.0-rc.10
  - @ebsiint-sc/trusted-schemas-registry@1.0.1-rc.10
  - @ebsiint-sc/did-registry-v2@2.0.0-rc.9
  - @ebsiint-sc/did-registry-v3@3.0.0-rc.6
  - @ebsiint-sc/did-registry-v4@4.0.0-rc.4
  - @ebsiint-sc/bootstrap-v2@2.0.0-rc.6
  - @ebsiint-sc/did-registry@1.1.0-rc.10
  - @ebsiint-sc/timestamp-v2@2.0.0-rc.6
  - @ebsiint-sc/bootstrap@1.0.1-rc.10
  - @ebsiint-sc/timestamp@1.0.1-rc.10
  - @ebsiint-sc/proxy@2.0.0-rc.10

## 2.0.0-rc.9

### Minor Changes

- [0e486f1a2e125182a84b89732c68c0b64c07872a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/0e486f1a2e125182a84b89732c68c0b64c07872a): Deployment of pilot tnt

### Patch Changes

- [917370b20c6efe84f3f7c7128dfdb2a7a5457c81](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/917370b20c6efe84f3f7c7128dfdb2a7a5457c81): Bump dependencies and upgrade Node.js to v20.16.0.
- Updated dependencies [b9124c22497bc0bb9310bb8a11c9642808c2071f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/b9124c22497bc0bb9310bb8a11c9642808c2071f)
- Updated dependencies [917370b20c6efe84f3f7c7128dfdb2a7a5457c81](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/917370b20c6efe84f3f7c7128dfdb2a7a5457c81)
  - @ebsiint-sc/trusted-apps-registry-v3@3.0.0-rc.4
  - @ebsiint-sc/trusted-policies-registry-v2@2.0.0-rc.4
  - @ebsiint-sc/trusted-issuers-registry-v3@3.0.0-rc.5
  - @ebsiint-sc/trusted-schemas-registry-v2@2.0.0-rc.4
  - @ebsiint-sc/trusted-policies-registry@1.0.1-rc.8
  - @ebsiint-sc/trusted-issuers-registry@2.0.0-rc.8
  - @ebsiint-sc/trusted-schemas-registry@1.0.1-rc.8
  - @ebsiint-sc/trusted-apps-registry@2.0.1-rc.8
  - @ebsiint-sc/did-registry-v2@2.0.0-rc.7
  - @ebsiint-sc/did-registry-v3@3.0.0-rc.4
  - @ebsiint-sc/bootstrap-v2@2.0.0-rc.4
  - @ebsiint-sc/did-registry@1.1.0-rc.8
  - @ebsiint-sc/timestamp-v2@2.0.0-rc.4
  - @ebsiint-sc/bootstrap@1.0.1-rc.8
  - @ebsiint-sc/timestamp@1.0.1-rc.8
  - @ebsiint-sc/proxy@2.0.0-rc.8

## 2.0.0-rc.8

### Minor Changes

- [ff07e727ebbcb7ce1376d8df83563c9f23aeefd1](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/ff07e727ebbcb7ce1376d8df83563c9f23aeefd1): Fixed the upgrade scripts for did registry v2 and track and trace
- [78750bf4bedbeb6186bfab2629a08025e5fe698a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/78750bf4bedbeb6186bfab2629a08025e5fe698a): Implement revocation in cascade

## 2.0.0-rc.7

### Minor Changes

- [c11ee3389aec111c7187909266e143adfc9cec20](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/c11ee3389aec111c7187909266e143adfc9cec20): Add new DID Registry SC version

### Patch Changes

- [1960638f1c5cce829eae0535733d0714632d8841](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1960638f1c5cce829eae0535733d0714632d8841): Bump dependencies.
- [e5e5cd041db2e6c9670a596d7526d0e7159efcc5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/e5e5cd041db2e6c9670a596d7526d0e7159efcc5): Bump dependencies.
- Updated dependencies [7d078a503d96c4408fe2c78ab995053777d936fe](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/7d078a503d96c4408fe2c78ab995053777d936fe)
- Updated dependencies [1960638f1c5cce829eae0535733d0714632d8841](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1960638f1c5cce829eae0535733d0714632d8841)
- Updated dependencies [e5e5cd041db2e6c9670a596d7526d0e7159efcc5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/e5e5cd041db2e6c9670a596d7526d0e7159efcc5)
  - @ebsiint-sc/did-registry-v2@2.0.0-rc.6
  - @ebsiint-sc/did-registry-v3@3.0.0-rc.3
  - @ebsiint-sc/trusted-policies-registry-v2@2.0.0-rc.3
  - @ebsiint-sc/trusted-issuers-registry-v3@3.0.0-rc.4
  - @ebsiint-sc/trusted-schemas-registry-v2@2.0.0-rc.3
  - @ebsiint-sc/trusted-policies-registry@1.0.1-rc.7
  - @ebsiint-sc/trusted-apps-registry-v3@3.0.0-rc.3
  - @ebsiint-sc/trusted-issuers-registry@2.0.0-rc.7
  - @ebsiint-sc/trusted-schemas-registry@1.0.1-rc.7
  - @ebsiint-sc/trusted-apps-registry@2.0.1-rc.7
  - @ebsiint-sc/bootstrap-v2@2.0.0-rc.3
  - @ebsiint-sc/did-registry@1.1.0-rc.7
  - @ebsiint-sc/timestamp-v2@2.0.0-rc.3
  - @ebsiint-sc/bootstrap@1.0.1-rc.7
  - @ebsiint-sc/timestamp@1.0.1-rc.7
  - @ebsiint-sc/proxy@2.0.0-rc.7

## 2.0.0-rc.6

### Minor Changes

- [0873147653f7a41503e046da3a9f8614a4b30830](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/0873147653f7a41503e046da3a9f8614a4b30830): First Version of the Smart Contracts for TrackAndTrace and the admin scripts for deployment.
- [99abef34ed7e8a91e3335e712173a45027f9277e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/99abef34ed7e8a91e3335e712173a45027f9277e): Add script to upgrade implementation and fix some issues.
- [e0ebf55f2a109c2b08717cf444335daa52cfc30d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/e0ebf55f2a109c2b08717cf444335daa52cfc30d): Added unit tests, fixed upgrade deploy by adding artifact locally, performed a new deployment on testnet with new storage structure

### Patch Changes

- [48b06089e979a20d1ca3df1be08ac614e5b6856e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/48b06089e979a20d1ca3df1be08ac614e5b6856e): Bump dependencies, support Verifiable Attestation 2024-01 schema.
- [733354a1d2e4e6a18a9a834a96b7b9a4eb321060](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/733354a1d2e4e6a18a9a834a96b7b9a4eb321060): Bump dependencies, update Node.js to v20.11.0.
- [f84767e4aedf5c103d6aad87f81c3708ad915e73](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f84767e4aedf5c103d6aad87f81c3708ad915e73): Bump dependencies.
- Updated dependencies [0873147653f7a41503e046da3a9f8614a4b30830](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/0873147653f7a41503e046da3a9f8614a4b30830)
- Updated dependencies [0873147653f7a41503e046da3a9f8614a4b30830](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/0873147653f7a41503e046da3a9f8614a4b30830)
- Updated dependencies [48b06089e979a20d1ca3df1be08ac614e5b6856e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/48b06089e979a20d1ca3df1be08ac614e5b6856e)
- Updated dependencies [733354a1d2e4e6a18a9a834a96b7b9a4eb321060](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/733354a1d2e4e6a18a9a834a96b7b9a4eb321060)
- Updated dependencies [f84767e4aedf5c103d6aad87f81c3708ad915e73](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f84767e4aedf5c103d6aad87f81c3708ad915e73)
  - @ebsiint-sc/bootstrap-v2@2.0.0-rc.2
  - @ebsiint-sc/did-registry-v3@3.0.0-rc.2
  - @ebsiint-sc/trusted-policies-registry-v2@2.0.0-rc.2
  - @ebsiint-sc/trusted-issuers-registry-v3@3.0.0-rc.3
  - @ebsiint-sc/trusted-schemas-registry-v2@2.0.0-rc.2
  - @ebsiint-sc/trusted-policies-registry@1.0.1-rc.6
  - @ebsiint-sc/trusted-apps-registry-v3@3.0.0-rc.2
  - @ebsiint-sc/trusted-issuers-registry@2.0.0-rc.6
  - @ebsiint-sc/trusted-schemas-registry@1.0.1-rc.6
  - @ebsiint-sc/trusted-apps-registry@2.0.1-rc.6
  - @ebsiint-sc/did-registry-v2@2.0.0-rc.5
  - @ebsiint-sc/did-registry@1.1.0-rc.6
  - @ebsiint-sc/timestamp-v2@2.0.0-rc.2
  - @ebsiint-sc/bootstrap@1.0.1-rc.6
  - @ebsiint-sc/timestamp@1.0.1-rc.6
  - @ebsiint-sc/proxy@2.0.0-rc.6

## 2.0.0-rc.5

### Patch Changes

- [293896a6f027283b3f735f5205e1581e867ff849](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/293896a6f027283b3f735f5205e1581e867ff849): Bump OpenZeppelin contracts to fix vulnerability.
- [f3024ac17c5031e011757bbf4e52700943842ba0](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f3024ac17c5031e011757bbf4e52700943842ba0): Upgrade Node.js to v18 and bump dependencies.
- [ca9544d2978218570fcdf58e57de8144317fc5c8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/ca9544d2978218570fcdf58e57de8144317fc5c8): Update Node.js to v20.9.0 (LTS).
- [a82cf5865669f7fd184a0bf000573856e85c9837](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/a82cf5865669f7fd184a0bf000573856e85c9837): Bump dependencies.
- [4fa0f0414daebd2e721434108ee63f7b5802abe9](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4fa0f0414daebd2e721434108ee63f7b5802abe9): Bump dependencies and update Node.js to v20.10.0.
- Updated dependencies [293896a6f027283b3f735f5205e1581e867ff849](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/293896a6f027283b3f735f5205e1581e867ff849)
- Updated dependencies [f3024ac17c5031e011757bbf4e52700943842ba0](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f3024ac17c5031e011757bbf4e52700943842ba0)
- Updated dependencies [ca9544d2978218570fcdf58e57de8144317fc5c8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/ca9544d2978218570fcdf58e57de8144317fc5c8)
- Updated dependencies [a82cf5865669f7fd184a0bf000573856e85c9837](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/a82cf5865669f7fd184a0bf000573856e85c9837)
- Updated dependencies [4fa0f0414daebd2e721434108ee63f7b5802abe9](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4fa0f0414daebd2e721434108ee63f7b5802abe9)
  - @ebsiint-sc/trusted-policies-registry-v2@2.0.0-rc.1
  - @ebsiint-sc/trusted-schemas-registry-v2@2.0.0-rc.1
  - @ebsiint-sc/trusted-policies-registry@1.0.1-rc.5
  - @ebsiint-sc/trusted-schemas-registry@1.0.1-rc.5
  - @ebsiint-sc/bootstrap-v2@2.0.0-rc.1
  - @ebsiint-sc/bootstrap@1.0.1-rc.5
  - @ebsiint-sc/trusted-issuers-registry-v3@3.0.0-rc.2
  - @ebsiint-sc/trusted-apps-registry-v3@3.0.0-rc.1
  - @ebsiint-sc/trusted-issuers-registry@2.0.0-rc.5
  - @ebsiint-sc/trusted-apps-registry@2.0.1-rc.5
  - @ebsiint-sc/did-registry-v2@2.0.0-rc.4
  - @ebsiint-sc/did-registry-v3@3.0.0-rc.1
  - @ebsiint-sc/did-registry@1.1.0-rc.5
  - @ebsiint-sc/timestamp-v2@2.0.0-rc.1
  - @ebsiint-sc/timestamp@1.0.1-rc.5
  - @ebsiint-sc/proxy@2.0.0-rc.5

## 2.0.0-rc.4

### Major Changes

- [bf5c8a42](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/bf5c8a42): Update deployments in admin-scripts.

### Minor Changes

- [b8b79ac3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/b8b79ac3): New smart contracts after the audit

### Patch Changes

- Updated dependencies [a060911f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/a060911f)
- Updated dependencies [bf5c8a42](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/bf5c8a42)
- Updated dependencies [b8b79ac3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/b8b79ac3)
  - @ebsiint-sc/trusted-policies-registry-v2@2.0.0-rc.1
  - @ebsiint-sc/trusted-issuers-registry-v3@3.0.0-rc.1
  - @ebsiint-sc/trusted-schemas-registry-v2@2.0.0-rc.1
  - @ebsiint-sc/trusted-apps-registry-v3@3.0.0-rc.1
  - @ebsiint-sc/did-registry-v3@3.0.0-rc.1
  - @ebsiint-sc/timestamp-v2@2.0.0-rc.1
  - @ebsiint-sc/bootstrap-v2@2.0.0-rc.1
  - @ebsiint-sc/proxy@2.0.0-rc.4
  - @ebsiint-sc/trusted-policies-registry@1.0.1-rc.4
  - @ebsiint-sc/trusted-issuers-registry@2.0.0-rc.4
  - @ebsiint-sc/trusted-schemas-registry@1.0.1-rc.4
  - @ebsiint-sc/trusted-apps-registry@2.0.1-rc.4
  - @ebsiint-sc/did-registry-v2@2.0.0-rc.3
  - @ebsiint-sc/did-registry@1.1.0-rc.4
  - @ebsiint-sc/timestamp@1.0.1-rc.4
  - @ebsiint-sc/bootstrap@1.0.1-rc.4

## 1.1.0-rc.3

### Patch Changes

- [f520c43a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f520c43a): Bump dependencies and update Node.js to v16.20.1
- Updated dependencies [f520c43a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f520c43a)
  - @ebsiint-sc/trusted-policies-registry@1.0.1-rc.3
  - @ebsiint-sc/trusted-issuers-registry@4.0.0-rc.3
  - @ebsiint-sc/trusted-schemas-registry@1.0.1-rc.3
  - @ebsiint-sc/trusted-apps-registry@2.0.1-rc.3
  - @ebsiint-sc/did-registry@1.1.0-rc.3
  - @ebsiint-sc/bootstrap@1.0.1-rc.3
  - @ebsiint-sc/timestamp@1.0.1-rc.3
  - @ebsiint-sc/proxy@1.0.1-rc.3

## 1.1.0-rc.2

### Patch Changes

- [1fb98741](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1fb98741): Bump dependencies.
- Updated dependencies [3f2dbd72](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/3f2dbd72)
- Updated dependencies [a623008a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/a623008a)
- Updated dependencies [1fb98741](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1fb98741)
- Updated dependencies [8a6f31d2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/8a6f31d2)
  - @ebsiint-sc/trusted-issuers-registry@4.0.0-rc.2
  - @ebsiint-sc/did-registry@1.1.0-rc.2
  - @ebsiint-sc/trusted-policies-registry@1.0.1-rc.2
  - @ebsiint-sc/trusted-schemas-registry@1.0.1-rc.2
  - @ebsiint-sc/trusted-apps-registry@2.0.1-rc.2
  - @ebsiint-sc/bootstrap@1.0.1-rc.2
  - @ebsiint-sc/timestamp@1.0.1-rc.2
  - @ebsiint-sc/proxy@1.0.1-rc.2

## 1.1.0-rc.1

### Minor Changes

- [4a7ea0a5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4a7ea0a5): remove DID policies

### Patch Changes

- [adc663ea](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/adc663ea): Bump dependencies.
- [f9d44039](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f9d44039): Fix advisory GHSA-878m-3g6q-594q
- [78ee438b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/78ee438b): Bump dependencies.
- Updated dependencies [adc663ea](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/adc663ea)
- Updated dependencies [f9d44039](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f9d44039)
- Updated dependencies [a6a1f685](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/a6a1f685)
- Updated dependencies [c02634d2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/c02634d2)
- Updated dependencies [1255f4d4](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1255f4d4)
- Updated dependencies [4a7ea0a5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4a7ea0a5)
- Updated dependencies [78ee438b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/78ee438b)
- Updated dependencies [a6a1f685](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/a6a1f685)
  - @ebsiint-sc/trusted-policies-registry@1.0.1-rc.1
  - @ebsiint-sc/trusted-issuers-registry@4.0.0-rc.1
  - @ebsiint-sc/trusted-schemas-registry@1.0.1-rc.1
  - @ebsiint-sc/trusted-apps-registry@2.0.1-rc.1
  - @ebsiint-sc/did-registry@1.1.0-rc.1
  - @ebsiint-sc/bootstrap@1.0.1-rc.1
  - @ebsiint-sc/timestamp@1.0.1-rc.1
  - @ebsiint-sc/proxy@1.0.1-rc.1

## 1.0.1-rc.0

### Patch Changes

- [1be2b488](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1be2b488): Update constructor arguments for SC deployment.
- [6d699188](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6d699188): Bump dependencies, refactor tests.
- Updated dependencies [1be2b488](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1be2b488)
- Updated dependencies [2f8b1686](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/2f8b1686)
- Updated dependencies [6d699188](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/6d699188)
  - @ebsiint-sc/did-registry@1.0.1-rc.0
  - @ebsiint-sc/trusted-apps-registry@2.0.1-rc.0
  - @ebsiint-sc/trusted-issuers-registry@3.0.1-rc.0
  - @ebsiint-sc/trusted-policies-registry@1.0.1-rc.0
  - @ebsiint-sc/trusted-schemas-registry@1.0.1-rc.0
  - @ebsiint-sc/bootstrap@1.0.1-rc.0
  - @ebsiint-sc/timestamp@1.0.1-rc.0
  - @ebsiint-sc/proxy@1.0.1-rc.0
