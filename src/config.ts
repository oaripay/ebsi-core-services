export const config = {
  PAGE_SIZE: 50,
  EBSI_CHAIN_ID: process.env.REACT_APP_EBSI_CHAIN_ID || 6175,
  REGISTRY_ADDRESS:
    process.env.REACT_APP_REGISTRY_ADDRESS ||
    "0x4d06b562588cb61616959806726c5d9f060b0f21",
  TIR_REGISTRY_ADDRESS:
    process.env.REACT_APP_TIR_REGISTRY_ADDRESS ||
    "0xFdfbCE7F3c12A902B79e0ceB0DB2662331bBA1aF",
  DID_REGISTRY_ADDRESS:
    process.env.REACT_APP_DID_REGISTRY_ADDRESS ||
    "0x15582f47140ff4bd74843583a1e3111032fb91c8",
  TSR_ADDRESS:
    process.env.REACT_APP_TSR_ADDRESS ||
    "0x9F6079ED5f2659b2a218A88e93A00Bb087a4CcbA",
  routes: {
    trustedAppsRegistry: "/apps-admin/trusted-apps-registry",
    trustedIssuersRegistry: "/trusted-issuers-registry",
    trustedSchemaRegistry: "/trusted-schema-registry",
    trustedSchemaRegistryRevision:
      "/trusted-schema-registry/revision/:schemaId",
    trustedSchemaRegistryRevisionMetadata:
      "/trusted-schema-registry/metadata/:revisionId",
    registerDid: "/apps-admin/register-did",
    default: "/apps-admin",
  },
};
