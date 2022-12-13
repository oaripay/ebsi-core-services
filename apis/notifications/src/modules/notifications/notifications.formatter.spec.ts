import { describe, it, expect } from "@jest/globals";
import { formatNotifications } from "./notifications.formatter";
import { NotificationResponseObject } from "./notifications.interface";

const notifications: NotificationResponseObject[] = [
  {
    schemaId: "notification-001",
    type: ["Notification", "StoreVerifiableCredential"],
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://essif.europa.eu/schemas/vc/2020/v1",
      "https://essif.europa.eu/schemas/notifications/2020/v1",
    ],
    from: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj",
    to: "did:ebsi:znbuGDt6tEqpGZNAuGc2uvZ",
    issuanceDate: "2019-06-22T14:11:44Z",
    expirationDate: "2019-06-27T14:11:44Z",
    payload: {},
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      created: "2019-11-17T14:00:00Z",
      proofPurpose: "assertionMethod",
      verificationMethod: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj#key-1",
      jws: "eyJh..Iw",
    },
    _links: {
      self: {
        href: "/notifications/v2/notifications/123",
      },
    },
  },
  {
    schemaId: "notification-001",
    type: ["Notification", "RequestVerifiablePresentation"],
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://essif.europa.eu/schemas/vc/2020/v1",
      "https://essif.europa.eu/schemas/notifications/2020/v1",
    ],
    from: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj",
    to: "did:ebsi:znbuGDt6tEqpGZNAuGc2uvZ",
    issuanceDate: "2019-06-22T14:11:44Z",
    expirationDate: "2019-06-27T14:11:44Z",
    payload: {},
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      created: "2019-11-17T14:00:00Z",
      proofPurpose: "assertionMethod",
      verificationMethod: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj#key-1",
      jws: "eyJh..Iw",
    },
    _links: {
      self: {
        href: "https://api.ebsi.xyz/notifications/v2/notifications/124",
      },
    },
  },
  {
    schemaId: "notification-001",
    type: ["Notification", "RequestVerifiablePresentation"],
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://essif.europa.eu/schemas/vc/2020/v1",
      "https://essif.europa.eu/schemas/notifications/2020/v1",
    ],
    from: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj",
    to: "did:ebsi:znbuGDt6tEqpGZNAuGc2uvZ",
    issuanceDate: "2019-06-22T14:11:44Z",
    expirationDate: "2019-06-27T14:11:44Z",
    payload: {},
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      created: "2019-11-17T14:00:00Z",
      proofPurpose: "assertionMethod",
      verificationMethod: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj#key-1",
      jws: "eyJh..Iw",
    },
    _links: {
      self: {
        href: "https://api.ebsi.xyz/notifications/v2/notifications/124",
      },
    },
  },
];

describe("formatNotifications", () => {
  it("should paginate the values returned by Cassandra", () => {
    expect.assertions(2);

    let currentPageToken = "";
    const nextPageToken = "abc";
    const pageSize = 2;

    // should ignore the currentPageToken if it's empty
    expect(
      formatNotifications(
        notifications,
        currentPageToken,
        nextPageToken,
        pageSize,
        "",
        3,
        "?test=true"
      )
    ).toStrictEqual({
      items: notifications,
      links: {
        next: `?page[after]=${nextPageToken}&page[size]=${pageSize}?test=true`,
      },
      total: 3,
      pageSize,
      self: `?page[size]=${pageSize}?test=true`,
    });

    currentPageToken = "cde";

    expect(
      formatNotifications(
        notifications,
        currentPageToken,
        nextPageToken,
        pageSize,
        "",
        3,
        "?test=true"
      )
    ).toStrictEqual({
      items: notifications,
      links: {
        next: `?page[after]=${nextPageToken}&page[size]=${pageSize}?test=true`,
      },
      total: 3,
      pageSize,
      self: `?page[after]=${currentPageToken}&page[size]=${pageSize}?test=true`,
    });
  });

  it("should return empty links if pageState is empty", () => {
    expect.assertions(1);

    const currentPageToken = "";
    const nextPageToken = ""; // pageState
    const pageSize = 2;

    // should ignore the currentPageToken if it's empty
    expect(
      formatNotifications(
        notifications,
        currentPageToken,
        nextPageToken,
        pageSize,
        "",
        3,
        "?test=true"
      )
    ).toStrictEqual({
      items: notifications,
      links: {},
      total: 3,
      pageSize,
      self: `?page[size]=${pageSize}?test=true`,
    });
  });
});
