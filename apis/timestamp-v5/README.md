![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

# Timestamp API

Timestamp API is an EBSI core service. It enables us to interact with the Timestamp Smart Contract to

- timestamp hashes
- supports timestamping records/versions (and linking the timestamps)
- verify timestamps

For more information, see:

- [Timestamp API Technical Specifications](https://ec.europa.eu/digital-building-blocks/wikis/x/VIiWFQ)
- [Timestamp Smart Contract Technical Specifications](https://ec.europa.eu/digital-building-blocks/wikis/x/hYiWFQ)
- [Timestamp Smart Contract](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/browse/contracts/timestamp-v3)
- API catalogs:
  - [EBSI Pilot network API Catalog](https://hub.ebsi.eu/apis/pilot/timestamp)
  - [EBSI Conformance network API Catalog](https://hub.ebsi.eu/apis/conformance/timestamp)

## Service configuration

Create a `.env.default.local` file locally. You can duplicate the content of `.env.default` or only set the necessary variables.
