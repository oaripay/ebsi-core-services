![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

# Storage API

The Storage API is a generic supporting Core Service of the EBSI platform
providing access to the Off-chain Storage services of the lower layer Chain &
Storage, but will limit in terms of storage capacity, as EBSI Project doesn't
have the vocation of being a storage cloud provider.

This API provides read and write storage capabilities of files and Key-Value
for multiple storage systems:

- File Storage API: provides CRUD operations for files in the off-chain distributed storage.

- Key-Value Storage API: provides CRUD operations for Key-Value (with data value in JSON format) in the off-chain distributed storage.

It also has a special JSON-RPC endpoint that serves as a proxy between Core
APIs and the distributed storage. Only the Storage API has direct access to
distributed storage infrastructure (Cassandra for v2.0).

The EBSI MS nodes are not an off-chain or cloud storage provider
infrastructure. The off-chain storage capabilities provided by EBSI are
limited to the available resources of the MS Node infrastructure. The storage
capabilities have the goal to support the deployment and integration of the
exposed core services and approved business applications.

For more information see:

- [Technical Specifications](https://ec.europa.eu/digital-building-blocks/wikis/x/VYiWFQ)
- API catalogs:
  - [EBSI Pre-production network API Catalog](https://api.preprod.ebsi.eu/docs)
  - [EBSI Production network API Catalog](https://api.ebsi.eu/docs)

## Service configuration

Create a `.env.default.local` file locally. You can duplicate the content of `.env.default` or only set the necessary variables.
