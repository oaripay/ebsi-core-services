const notBefore = Math.floor(Date.now() / 1000 - 24 * 3600);
const notAfter = Math.floor(Date.now() / 1000 + 5 * 365 * 24 * 3600);

export const didDocument = {
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/jws-2020/v1",
  ],
  testKey: "34d02adc-1f0c-433a-b25d-9845ab4e678b",
  service: [],
  id: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
  controller: ["did:ebsi:ziuZbygL2HMhNFHcoB5W99h"],
  verificationMethod: [
    {
      id: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h#WOLnKUBaBqFDLdcensmBLp0xFbMIaXB54UjTCmSIuEE",
      type: "JsonWebKey2020",
      controller: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
      publicKeyJwk: {
        crv: "secp256k1",
        kty: "EC",
        x: "0K29M-nDQkBq1xe_qLyM0nq6XmmT4Z1gnktvaLX1qSA",
        y: "SxvPVT4g0ONU9fRX1DHt5LPdfxFBYvyW9Ak9bZ-3wyQ",
      },
    },
  ],
  authentication: [
    "did:ebsi:ziuZbygL2HMhNFHcoB5W99h#WOLnKUBaBqFDLdcensmBLp0xFbMIaXB54UjTCmSIuEE",
  ],
  capabilityInvocation: [
    "did:ebsi:ziuZbygL2HMhNFHcoB5W99h#WOLnKUBaBqFDLdcensmBLp0xFbMIaXB54UjTCmSIuEE",
  ],
};

export const didDocumentData = {
  didDocument: {
    id: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
    baseDocument:
      '{"@context":["https://www.w3.org/ns/did/v1","https://w3id.org/security/suites/jws-2020/v1"],"testKey":"34d02adc-1f0c-433a-b25d-9845ab4e678b","service":[]}',
    controllers: [
      {
        id: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h#did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
        controller: {
          id: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
        },
        controlledDocument: {
          id: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
        },
        status: "Active",
      },
    ],

    verificationMethods: [
      {
        id: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h#WOLnKUBaBqFDLdcensmBLp0xFbMIaXB54UjTCmSIuEE",
        publicKey:
          "0x04d0adbd33e9c342406ad717bfa8bc8cd27aba5e6993e19d609e4b6f68b5f5a9204b1bcf553e20d0e354f5f457d431ede4b3dd7f114162fc96f4093d6d9fb7c324",
        isSecp256k1: true,
        status: "Active",
      },
      {
        id: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h#KClc_fzaknHRoxjSOmy2MopYPnz2RD5L3oMbn7GIi5g",
        publicKey:
          "0x7b22637276223a2245643235353139222c2278223a2244453745586568653550567964476e476638515258536b704c486f706b6944786b3278377668534d765130222c226b7479223a224f4b50227d",
        isSecp256k1: false,
        status: "Revoked",
      },
    ],

    verificationRelationships: [
      {
        id: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h authentication WOLnKUBaBqFDLdcensmBLp0xFbMIaXB54UjTCmSIuEE",
        name: "authentication",
        vMethodId: "WOLnKUBaBqFDLdcensmBLp0xFbMIaXB54UjTCmSIuEE",
        notBefore,
        notAfter,
      },
      {
        id: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h capabilityInvocation WOLnKUBaBqFDLdcensmBLp0xFbMIaXB54UjTCmSIuEE",
        name: "capabilityInvocation",
        vMethodId: "WOLnKUBaBqFDLdcensmBLp0xFbMIaXB54UjTCmSIuEE",
        notBefore,
        notAfter,
      },
      {
        id: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h assertionMethod KClc_fzaknHRoxjSOmy2MopYPnz2RD5L3oMbn7GIi5g",
        name: "assertionMethod",
        vMethodId: "KClc_fzaknHRoxjSOmy2MopYPnz2RD5L3oMbn7GIi5g",
        notBefore,
        notAfter: notBefore, // expired
      },
      {
        id: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h assertionMethod jFy-BG_mIriRxdE5ZD7XnZeypKoPbv1L_PIPbXbZoO8",
        name: "assertionMethod",
        vMethodId: "jFy-BG_mIriRxdE5ZD7XnZeypKoPbv1L_PIPbXbZoO8",
        notBefore,
        notAfter,
      },
    ],
  },
};

export const didDocumentDataEmpty = {
  didDocument: {},
  verificationMethods: [],
  controllers: [],
  verificationRelationships: [],
};

export const did1 = "did:ebsi:z23FGxCRmGZmei6uY3KCseXA";
export const did2 = "did:ebsi:ziuZbygL2HMhNFHcoB5W99h";
export const did3 = "did:ebsi:z24iHa6jkHi8tdsyA3P5di58";
