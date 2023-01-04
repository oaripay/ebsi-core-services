![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

# Trusted Ledgers & Smart Contracts Registry API

Trusted Ledgers & Smart Contracts Registry (TLSCR) API is an EBSI core service. It enables us to interact with the Trusted Ledgers & Smart Contracts Registry - Smart Contract to

- list the trusted smart contract
- list the trusted ledgers (on the long term a network of trusted ledger compliant with EBSI rules)
- obtain Smart Contract and Ledger information
- optionally it helps to construct unsigned transactions for the operations

TLSCR API is a microservice, hosted on the EBSI infrastructure.

For more information, see:

- [Technical Specifications](https://ec.europa.eu/digital-building-blocks/wikis/x/UYiWFQ)
- [Smart Contract Technical Specifications](https://ec.europa.eu/digital-building-blocks/wikis/x/uoiWFQ)
- [Smart Contract](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/browse/contracts/trusted-ledgers-sc-registry)

- API catalogs:
  - [EBSI Pilot network API Catalog](https://api-pilot.ebsi.eu/docs/apis)
  - [EBSI Conformance network API Catalog](https://api-conformance.ebsi.eu/docs/apis)

## Service configuration

Create a `.env.default.local` file locally. You can duplicate the content of `.env.default` or only set the necessary variables.
