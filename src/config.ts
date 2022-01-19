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
  POLICY_REGISTRY_ADDRESS:
    process.env.REACT_APP_POLICY_REGISTRY_ADDRESS ||
    "0x17a340418937A38b3Cb62FdA42241eB0722868A6",
  routes: {
    trustedAppsRegistry: "/registries-manager/trusted-apps-registry",
    trustedAppsRegistryPublicKeys:
      "/registries-manager/trusted-apps-registry/public-keys/:id",
    trustedAppsRegistryAuthorizations:
      "/registries-manager/trusted-apps-registry/authorizations/:id",
    trustedIssuersRegistry: "/registries-manager/trusted-issuers-registry",
    trustedIssuersRegistryAttributes:
      "/registries-manager/trusted-issuers-registry/:attribute",
    trustedSchemaRegistry: "/registries-manager/trusted-schema-registry",
    trustedSchemaRegistryRevision:
      "/registries-manager/trusted-schema-registry/revision/:schemaId",
    trustedSchemaRegistryRevisionMetadata:
      "/registries-manager/trusted-schema-registry/metadata/:revisionId",
    trustedPoliciesRegistry: "/registries-manager/trusted-policies-registry",
    trustedPoliciesRegistryAttributes:
      "/registries-manager/trusted-policies-registry/:address/attributes",
    registerDid: "/registries-manager/register-did",
    default: "/registries-manager",
  },
};
