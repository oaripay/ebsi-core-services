export const config = {
  PAGE_SIZE: 50,
  EBSI_CHAIN_ID: process.env.REACT_APP_EBSI_CHAIN_ID || 6175,
  REGISTRY_ADDRESS:
    process.env.REACT_APP_REGISTRY_ADDRESS ||
    "0x4d06b562588cb61616959806726c5d9f060b0f21",
  DID_REGISTRY_ADDRESS:
    process.env.REACT_APP_DID_REGISTRY_ADDRESS ||
    "0x15582f47140ff4bd74843583a1e3111032fb91c8",
  routes: {
    trustedAppsRegistry: "/apps-admin/trusted-apps-registry",
    registerDid: "/apps-admin/register-did",
    default: "/apps-admin",
  },
  hashAlgos: [
    {
      id: 1,
      name: "SHA-256",
    },
    // {
    //   id: 2,
    //   name: "SHA-384",
    // },
    // {
    //   id: 3,
    //   name: "SHA-512",
    // },
    // {
    //   id: 4,
    //   name: "SHA3-224",
    // },
    // {
    //   id: 5,
    //   name: "SHA3-256",
    // },
    // {
    //   id: 6,
    //   name: "SHA3-384",
    // },
    // {
    //   id: 7,
    //   name: "SHA3-512",
    // },
  ],
};
