# Changelog

## 1.0.0-rc.1

### Minor Changes

- [520038797ef25f4c8ac19150274b8a5368175dfc](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/520038797ef25f4c8ac19150274b8a5368175dfc): Bump VC and VP libraries, support `JsonSchema` credential schema type.

### Patch Changes

- [819ff7e26e1836ac0033495b94d813696bcd9d9b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/819ff7e26e1836ac0033495b94d813696bcd9d9b): Fix "sender" format in /documents/{documentId}/events/{eventId} response.
- [3900b6f7697df366effd4110dc1827b6c36c169f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/3900b6f7697df366effd4110dc1827b6c36c169f): Only accept uncompressed public keys prefixed with 0x04 when the algorithm is ES256K.
- [1960638f1c5cce829eae0535733d0714632d8841](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1960638f1c5cce829eae0535733d0714632d8841): Bump dependencies.
- [1960638f1c5cce829eae0535733d0714632d8841](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1960638f1c5cce829eae0535733d0714632d8841): Bump jose to v4.15.5, fix CVE-2024-28176.
- [ddfc40a1f21fae1498059618e71bf1f2e9271ee8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/ddfc40a1f21fae1498059618e71bf1f2e9271ee8): Bump VC and VP libraries.
- [e5e5cd041db2e6c9670a596d7526d0e7159efcc5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/e5e5cd041db2e6c9670a596d7526d0e7159efcc5): Bump dependencies.
- [85e2c4cd45daea5e75d1f68484a0a062348068e0](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/85e2c4cd45daea5e75d1f68484a0a062348068e0): Do not log requests made by the EBSI healthcheck service.
- Updated dependencies [82e12c8c38442379aadb957fee5ec8ca4fea4fac](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/82e12c8c38442379aadb957fee5ec8ca4fea4fac)
- Updated dependencies [3900b6f7697df366effd4110dc1827b6c36c169f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/3900b6f7697df366effd4110dc1827b6c36c169f)
- Updated dependencies [7d078a503d96c4408fe2c78ab995053777d936fe](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/7d078a503d96c4408fe2c78ab995053777d936fe)
- Updated dependencies [1960638f1c5cce829eae0535733d0714632d8841](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1960638f1c5cce829eae0535733d0714632d8841)
- Updated dependencies [1960638f1c5cce829eae0535733d0714632d8841](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1960638f1c5cce829eae0535733d0714632d8841)
- Updated dependencies [ddfc40a1f21fae1498059618e71bf1f2e9271ee8](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/ddfc40a1f21fae1498059618e71bf1f2e9271ee8)
- Updated dependencies [520038797ef25f4c8ac19150274b8a5368175dfc](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/520038797ef25f4c8ac19150274b8a5368175dfc)
- Updated dependencies [e5e5cd041db2e6c9670a596d7526d0e7159efcc5](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/e5e5cd041db2e6c9670a596d7526d0e7159efcc5)
  - @ebsiint-api/shared@1.1.0-rc.7
  - @ebsiint-sc/track-and-trace@1.0.0-rc.1

## 1.0.0-rc.0

### Minor Changes

- [2c54ab141d4f76df65f6d652d210b3d1f81f5eff](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/2c54ab141d4f76df65f6d652d210b3d1f81f5eff): JSON RPC method: authoriseDid
- [3137c34fc0094dfac3c4fe1c8e0d59f1f647cc87](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/3137c34fc0094dfac3c4fe1c8e0d59f1f647cc87): Implement HEAD /accesses?created={did} endpoint.
- [d30ec895e2cded86613312e13e4023f19f0d9079](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/d30ec895e2cded86613312e13e4023f19f0d9079): JSON RPC method: createDocument
- [5437c2d9a600a02924ad365701c120b47202b968](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/5437c2d9a600a02924ad365701c120b47202b968): JSON RPC method: removeDocument
- [61fffd7ccdb3e8aa20dfe2ea6e546b3784a9adcd](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/61fffd7ccdb3e8aa20dfe2ea6e546b3784a9adcd): JSON RPC method: grantAccess
- [4af64a0e93ea803e0277ff429963a3be9501245a](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4af64a0e93ea803e0277ff429963a3be9501245a): JSON RPC method: revokeAccess
- [5c8a5389cb8c569314fcd34494ea6b4e2fa0a41f](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/5c8a5389cb8c569314fcd34494ea6b4e2fa0a41f): JSON RPC method: writeEvent
- [ecb3a3b401dc810d047c087b179ec7d923f020cf](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/ecb3a3b401dc810d047c087b179ec7d923f020cf): Implement /documents endpoint.
- [783b060ec5059b4b75e92a1f55d651c3dcdd91b2](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/783b060ec5059b4b75e92a1f55d651c3dcdd91b2): Implement /documents/{documentId} endpoint.
- [264d282630aff114e793f46db6c26e0b8f0f86f6](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/264d282630aff114e793f46db6c26e0b8f0f86f6): Implement /documents/{documentId}/events/{eventId} endpoint.
- [264d282630aff114e793f46db6c26e0b8f0f86f6](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/264d282630aff114e793f46db6c26e0b8f0f86f6): Implement /documents/{documentId}/events endpoint.
- [1f7ceef55fa1c64dd6332c213409dafee3c7893d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/1f7ceef55fa1c64dd6332c213409dafee3c7893d): Implement /documents/{documentId}/accesses endpoint.
- [25e6845b906d1c411de22580e0b2d75eec91d813](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/25e6845b906d1c411de22580e0b2d75eec91d813): Fix case in /accesses?subject={did} endpoint when there are no accesses.
- [3a72dedba5150746f815f2ed2e966a5b8768b122](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/3a72dedba5150746f815f2ed2e966a5b8768b122): Implement /accesses?subject={did} endpoint.
- [b1f7b53f2b918b119d40958808511bb279a20642](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/b1f7b53f2b918b119d40958808511bb279a20642): authoriseDid: Allow caller to authorise other DIDs

### Patch Changes

- [4f08c8952eed8dfa41e63e5b213a3ebce00ccecd](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/4f08c8952eed8dfa41e63e5b213a3ebce00ccecd): Bootstrap Track and Trace API v1.
- [48b06089e979a20d1ca3df1be08ac614e5b6856e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/48b06089e979a20d1ca3df1be08ac614e5b6856e): Bump dependencies, support Verifiable Attestation 2024-01 schema.
- [733354a1d2e4e6a18a9a834a96b7b9a4eb321060](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/733354a1d2e4e6a18a9a834a96b7b9a4eb321060): Bump dependencies, update Node.js to v20.11.0.
- [fe81418ed2d3d8759944423997e4371fff61e348](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/fe81418ed2d3d8759944423997e4371fff61e348): Setup axios agents with `keepAlive: true`.
- [bbf0d034fe7a717e756dc89e89701e842022854b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/bbf0d034fe7a717e756dc89e89701e842022854b): Enhance `grantAccess` parameters validation.
- [de238473eb36b1f275866c848e945e9417e917e3](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/de238473eb36b1f275866c848e945e9417e917e3): Initialize LedgerService only once.
- [f84767e4aedf5c103d6aad87f81c3708ad915e73](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f84767e4aedf5c103d6aad87f81c3708ad915e73): Fix `authoriseDid`, `grantAccess` and `revokeAccess` validation: the sender DID must be the same as the access token subject.
- [f84767e4aedf5c103d6aad87f81c3708ad915e73](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f84767e4aedf5c103d6aad87f81c3708ad915e73): Bump dependencies.
- Updated dependencies [61fffd7ccdb3e8aa20dfe2ea6e546b3784a9adcd](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/61fffd7ccdb3e8aa20dfe2ea6e546b3784a9adcd)
- Updated dependencies [0873147653f7a41503e046da3a9f8614a4b30830](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/0873147653f7a41503e046da3a9f8614a4b30830)
- Updated dependencies [b18de16b9b4b273e0c3e75ab3608be2ccb7e5717](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/b18de16b9b4b273e0c3e75ab3608be2ccb7e5717)
- Updated dependencies [99abef34ed7e8a91e3335e712173a45027f9277e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/99abef34ed7e8a91e3335e712173a45027f9277e)
- Updated dependencies [e0ebf55f2a109c2b08717cf444335daa52cfc30d](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/e0ebf55f2a109c2b08717cf444335daa52cfc30d)
- Updated dependencies [5c6c9e9227b705958af5a1869ddfbdbe237d6262](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/5c6c9e9227b705958af5a1869ddfbdbe237d6262)
- Updated dependencies [48b06089e979a20d1ca3df1be08ac614e5b6856e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/48b06089e979a20d1ca3df1be08ac614e5b6856e)
- Updated dependencies [99abef34ed7e8a91e3335e712173a45027f9277e](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/99abef34ed7e8a91e3335e712173a45027f9277e)
- Updated dependencies [733354a1d2e4e6a18a9a834a96b7b9a4eb321060](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/733354a1d2e4e6a18a9a834a96b7b9a4eb321060)
- Updated dependencies [fe81418ed2d3d8759944423997e4371fff61e348](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/fe81418ed2d3d8759944423997e4371fff61e348)
- Updated dependencies [703bfd36950e12201a30762c52812ade8b905130](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/703bfd36950e12201a30762c52812ade8b905130)
- Updated dependencies [38bd72f2d02dbb037e7e3fc6a6efe0216547fe21](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/38bd72f2d02dbb037e7e3fc6a6efe0216547fe21)
- Updated dependencies [bbf0d034fe7a717e756dc89e89701e842022854b](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/bbf0d034fe7a717e756dc89e89701e842022854b)
- Updated dependencies [b1f7b53f2b918b119d40958808511bb279a20642](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/b1f7b53f2b918b119d40958808511bb279a20642)
- Updated dependencies [f84767e4aedf5c103d6aad87f81c3708ad915e73](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/f84767e4aedf5c103d6aad87f81c3708ad915e73)
- Updated dependencies [79dc01786e983e02373501ec858f4897d8ae3680](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/commits/79dc01786e983e02373501ec858f4897d8ae3680)
  - @ebsiint-api/shared@1.1.0-rc.6
  - @ebsiint-sc/track-and-trace@2.0.0-rc.6
