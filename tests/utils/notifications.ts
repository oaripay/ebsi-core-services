import { Notification } from "../../src/modules/notifications/notifications.interface";
import { StoredNotification } from "../../src/modules/cassandra/cassandra.interface";

export const validNotifications = [
  {
    schemaId: "notifications-001",
    type: ["Notification", "StoreVerifiableCredential"],
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://essif.europa.eu/schemas/vc/2020/v1",
      "https://essif.europa.eu/schemas/notifications/2020/v1",
    ],
    from: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
    to: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
    issuanceDate: "2020-11-09T14:11:44Z",
    expirationDate: "2021-06-27T14:11:44Z",
    payload: {},
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      created: "2019-11-17T14:00:00Z",
      proofPurpose: "assertionMethod",
      verificationMethod:
        "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657#key-1",
      jws: "eyJh..Iw",
    },
  },
  {
    schemaId: "notifications-002",
    type: ["Notification", "RequestVerifiablePresentation"],
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://essif.europa.eu/schemas/vc/2020/v1",
      "https://essif.europa.eu/schemas/notifications/2020/v1",
    ],
    from: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
    to: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
    issuanceDate: "2020-11-10T14:11:44Z",
    expirationDate: "2021-06-28T14:11:44Z",
    payload: {},
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      created: "2019-11-17T14:00:00Z",
      proofPurpose: "assertionMethod",
      verificationMethod:
        "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657#key-1",
      jws: "eyJh..Iw",
    },
  },
];

export const storedNotifications: StoredNotification[] = [
  {
    id: "cassandraFakeId1",
    issuanceDate: "2020-11-09T14:11:44Z",
    expirationDate: "2021-06-27T14:11:44Z",
    from: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
    to: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
    message: JSON.stringify(validNotifications[0]),
  },
  {
    id: "cassandraFakeId2",
    issuanceDate: "2020-11-10T14:11:44Z",
    expirationDate: "2021-06-28T14:11:44Z",
    from: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
    to: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
    message: JSON.stringify(validNotifications[1]),
  },
];

export const fakeQueryResult = {
  info: {
    queriedHost: "::1:9042",
    triedHosts: { "::1:9042": null },
    speculativeExecutions: 0,
    achievedConsistency: 10,
    traceId: undefined,
    warnings: undefined,
    customPayload: undefined,
    isSchemaInAgreement: true,
  },
  rows: [
    {
      get: jest.fn(),
      id: "03ea09bf577a94157b493b337bf9c356e69a0eaa5427274d971ad7d31fb5aefa",
      issuanceDate: "2020-11-09T14:11:44Z",
      expirationDate: "2021-06-27T14:11:44Z",
      message: JSON.stringify({
        schemaId: "notifications-001",
        type: ["Notification", "StoreVerifiableCredential"],
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://essif.europa.eu/schemas/vc/2020/v1",
          "https://essif.europa.eu/schemas/notifications/2020/v1",
        ],
        from: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
        to: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
        issuanceDate: "2020-11-09T14:11:44Z",
        expirationDate: "2021-06-27T14:11:44Z",
        payload: {},
        proof: {
          type: "EcdsaSecp256k1Signature2019",
          created: "2019-11-17T14:00:00Z",
          proofPurpose: "assertionMethod",
          verificationMethod:
            "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657#key-1",
          jws: "eyJh..Iw",
        },
      }),
      receiver: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
      sender: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
    },
    {
      get: jest.fn(),
      id: "d2f349deeae0eee3a5f674d0edd4a88c38896df69e27ab2d7827ca5d66f43088",
      issuanceDate: "2020-11-10T14:11:44Z",
      expirationDate: "2021-06-28T14:11:44Z",
      message: JSON.stringify({
        schemaId: "notification-002",
        type: ["Notification", "RequestVerifiablePresentation"],
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://essif.europa.eu/schemas/vc/2020/v1",
          "https://essif.europa.eu/schemas/notifications/2020/v1",
        ],
        from: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
        to: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
        issuanceDate: "2020-11-09T14:11:44Z",
        expirationDate: "2021-06-28T14:11:44Z",
        payload: {},
        proof: {
          type: "EcdsaSecp256k1Signature2019",
          created: "2019-11-17T14:00:00Z",
          proofPurpose: "assertionMethod",
          verificationMethod:
            "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657#key-1",
          jws: "eyJh..Iw",
        },
      }),
      receiver: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
      sender: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
    },
  ],
  rowLength: 2,
  columns: [
    { name: "id", type: [Object] },
    { name: "expirationdate", type: [Object] },
    { name: "issuancedate", type: [Object] },
    { name: "message", type: [Object] },
    { name: "receiver", type: [Object] },
    { name: "sender", type: [Object] },
  ],
  pageState: null,
  nextPage: undefined,
  nextPageAsync: undefined,
};

export const fakeEmptyQueryResult = {
  info: {
    queriedHost: "::1:9042",
    triedHosts: { "::1:9042": null },
    speculativeExecutions: 0,
    achievedConsistency: 10,
    traceId: undefined,
    warnings: undefined,
    customPayload: undefined,
    isSchemaInAgreement: true,
  },
  rows: [],
  rowLength: 0,
  columns: [
    { name: "id", type: [Object] },
    { name: "expirationdate", type: [Object] },
    { name: "issuancedate", type: [Object] },
    { name: "message", type: [Object] },
    { name: "receiver", type: [Object] },
    { name: "sender", type: [Object] },
  ],
  pageState: null,
  nextPage: undefined,
  nextPageAsync: undefined,
};

export interface ResultNotifications {
  notification: Notification;
  id: string;
}

export const resultNotifications: ResultNotifications[] = [
  {
    notification: {
      schemaId: "notifications-001",
      type: ["Notification", "StoreVerifiableCredential"],
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://essif.europa.eu/schemas/vc/2020/v1",
        "https://essif.europa.eu/schemas/notifications/2020/v1",
      ],
      from: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
      to: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
      issuanceDate: "2020-11-09T14:11:44Z",
      expirationDate: "2021-06-27T14:11:44Z",
      payload: {},
      proof: {
        type: "EcdsaSecp256k1Signature2019",
        created: "2019-11-17T14:00:00Z",
        proofPurpose: "assertionMethod",
        verificationMethod:
          "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657#key-1",
        jws: "eyJh..Iw",
      },
    },
    id: storedNotifications[0].id,
  },
  {
    notification: {
      schemaId: "notifications-002",
      type: ["Notification", "RequestVerifiablePresentation"],
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://essif.europa.eu/schemas/vc/2020/v1",
        "https://essif.europa.eu/schemas/notifications/2020/v1",
      ],
      from: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
      to: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
      issuanceDate: "2020-11-10T14:11:44Z",
      expirationDate: "2021-06-28T14:11:44Z",
      payload: {},
      proof: {
        type: "EcdsaSecp256k1Signature2019",
        created: "2019-11-17T14:00:00Z",
        proofPurpose: "assertionMethod",
        verificationMethod:
          "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657#key-1",
        jws: "eyJh..Iw",
      },
    },
    id: storedNotifications[1].id,
  },
];
