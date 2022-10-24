![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

# Trusted Apps Registry API

Trusted Apps Registry (TAR) API is an EBSI core service. It enables us to interact with the Trusted Apps Registry Smart Contract to:

- manage (register/update/revoke) trusted EBSI and trusted external applications
- manage application authorisations
- obtain application information
- obtain application authorisations

For more information see:

- [TAR API Technical Specifications](https://ec.europa.eu/digital-building-blocks/wikis/x/SoiWFQ)
- [TAR Smart Contract Technical Specifications](https://ec.europa.eu/digital-building-blocks/wikis/x/rIiWFQ)
- [TAR Smart Contract](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services/browse/contracts/trusted-apps-registry)
- API catalogs:
  - [EBSI Pre-production network API Catalog](https://api.preprod.ebsi.eu/docs)
  - [EBSI Production network API Catalog](https://api.ebsi.eu/docs)

## Service configuration

Create a `.env.default.local` file locally. You can duplicate the content of `.env.default` or only set the necessary variables.
