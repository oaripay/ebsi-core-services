export const didDocument = {
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/jws-2020/v1",
  ],
  testKey: "34d02adc-1f0c-433a-b25d-9845ab4e678b",
  service: [],
  id: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
  controller: [
    {
      controller: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
      did: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
      status: "Active",
    },
  ],
  verificationMethod: [
    {
      id: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h#KClc_fzaknHRoxjSOmy2MopYPnz2RD5L3oMbn7GIi5g",
      type: "JsonWebKey2020",
      controller: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
      publicKeyJwk: {
        crv: "Ed25519",
        x: "DE7EXehe5PVydGnGf8QRXSkpLHopkiDxk2x7vhSMvQ0",
        kty: "OKP",
      },
    },
  ],
  authentication: [
    "did:ebsi:ziuZbygL2HMhNFHcoB5W99h#WOLnKUBaBqFDLdcensmBLp0xFbMIaXB54UjTCmSIuEE",
  ],
  capabilityInvocation: [
    "did:ebsi:ziuZbygL2HMhNFHcoB5W99h#WOLnKUBaBqFDLdcensmBLp0xFbMIaXB54UjTCmSIuEE",
  ],
  assertionMethod: [
    "did:ebsi:ziuZbygL2HMhNFHcoB5W99h#KClc_fzaknHRoxjSOmy2MopYPnz2RD5L3oMbn7GIi5g",
    "did:ebsi:ziuZbygL2HMhNFHcoB5W99h#jFy-BG_mIriRxdE5ZD7XnZeypKoPbv1L_PIPbXbZoO8",
  ],
};

export const didDocumentData = {
  didDocument: {
    did: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
    baseDocument:
      '{"@context":["https://www.w3.org/ns/did/v1","https://w3id.org/security/suites/jws-2020/v1"],"testKey":"34d02adc-1f0c-433a-b25d-9845ab4e678b","service":[]}',
    vMethodId: "WOLnKUBaBqFDLdcensmBLp0xFbMIaXB54UjTCmSIuEE",
    publicKey:
      "0x04d0adbd33e9c342406ad717bfa8bc8cd27aba5e6993e19d609e4b6f68b5f5a9204b1bcf553e20d0e354f5f457d431ede4b3dd7f114162fc96f4093d6d9fb7c324",
    isSecp256k1: true,
    notBefore: "1708010585",
    notAfter: "1723562585",
    verificationMethods: [
      {
        did: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
        id: "KClc_fzaknHRoxjSOmy2MopYPnz2RD5L3oMbn7GIi5g",
        publicKey:
          "0x7b22637276223a2245643235353139222c2278223a2244453745586568653550567964476e476638515258536b704c486f706b6944786b3278377668534d765130222c226b7479223a224f4b50227d",
        isSecp256k1: false,
        status: "Revoked",
      },
    ],
    controllers: [
      {
        controller: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
        did: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
        status: "Active",
      },
    ],
    verificationRelationships: [
      {
        vrId: "108486707788049780489891407876319581317588030026313505031462879228301328270300",
        did: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
        name: "authentication",
        vMethodId: "WOLnKUBaBqFDLdcensmBLp0xFbMIaXB54UjTCmSIuEE",
        notBefore: "1708010585",
        notAfter: "1723562585",
      },
      {
        vrId: "48074758187642959565465761639297202470415874079676630034599268630776103542573",
        did: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
        name: "capabilityInvocation",
        vMethodId: "WOLnKUBaBqFDLdcensmBLp0xFbMIaXB54UjTCmSIuEE",
        notBefore: "1708010585",
        notAfter: "1723562585",
      },
      {
        vrId: "54953362885688891964217329253721539315512096101272347730469823943946302328414",
        did: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
        name: "assertionMethod",
        vMethodId: "KClc_fzaknHRoxjSOmy2MopYPnz2RD5L3oMbn7GIi5g",
        notBefore: "1708010585",
        notAfter: "1723562585",
      },
      {
        vrId: "93458758382933885282563535605683998728226123785012270348062086226618097033929",
        did: "did:ebsi:ziuZbygL2HMhNFHcoB5W99h",
        name: "assertionMethod",
        vMethodId: "jFy-BG_mIriRxdE5ZD7XnZeypKoPbv1L_PIPbXbZoO8",
        notBefore: "1708010585",
        notAfter: "1723562585",
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
