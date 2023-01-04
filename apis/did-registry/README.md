![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

# DID Registry API

DID Registry is a generic core service of the EBSI platform providing the capability of resolving EBSI Decentralised Identifiers (DIDs).

It enables consumers to interact with the DID Registry Smart Contract to:

- Insert a DID/DID Document
- Update a DID Document
- Revoke a DID/DID Controlling keys
- Resolve a DID (and obtain a DID Document)
- Resolve a version of a DID Document at a certain point in time

For more information, see:

- [Technical Specifications](https://ec.europa.eu/digital-building-blocks/wikis/x/MYiWFQ)
- [DID Registry Smart Contract Technical Specifications](https://ec.europa.eu/digital-building-blocks/wikis/x/AofkFQ)
- [DID Registry Smart Contract](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/browse/contracts/did-registry)
- API catalogs:
  - [EBSI Pilot network API Catalog](https://api-pilot.ebsi.eu/docs/apis)
  - [EBSI Conformance network API Catalog](https://api-conformance.ebsi.eu/docs/apis)

## Service configuration

Create a `.env.default.local` file locally. You can duplicate the content of `.env.default` or only set the necessary variables.
