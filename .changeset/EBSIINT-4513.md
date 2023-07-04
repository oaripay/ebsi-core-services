---
"@ebsiint-api/did-registry-api-v4": major
"@ebsiint-sc/did-registry-v2": major
---

Major update in DIDR API and SC: This new version 4 handles the consistency
of the DID document at the smart contract level (not API level as in previous
versions). Meaning that the controllers are not Ethereum addresses anymore
but the DIDs defined in the DID document. The set of methods has changed
completely in this version and it is not backward compatible.
More details in https://ec.europa.eu/digital-building-blocks/wikis/display/BLOCKCHAININT/DID+Registry+Smart+Contract
