import crypto from "crypto";
import jsonwebtoken from "jsonwebtoken";
import { Notification } from "../../src/modules/notifications/notifications.interface";

function randomDid(): string {
  return `did:ebsi:0x${crypto.randomBytes(20).toString("hex")}`;
}

function createToken(did: string): string {
  return jsonwebtoken.sign(
    {
      did,
    },
    "secret",
    {
      audience: "notifications-api",
      issuer: "authorization-api",
    }
  );
}

function createNotification(to = randomDid(), ttl = 3600): Notification {
  const issuer = randomDid();
  const now = Date.now() + Math.trunc(Math.random() * 1000);
  return {
    schemaId: "notifications-001",
    type: ["Notification", "StoreVerifiableCredential"],
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://essif.europa.eu/schemas/vc/2020/v1",
      "https://essif.europa.eu/schemas/notifications/2020/v1",
    ],
    from: issuer,
    to,
    issuanceDate: new Date(now).toISOString(),
    expirationDate: new Date(now + ttl * 1000).toISOString(),
    payload: {},
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      created: "2019-11-17T14:00:00Z",
      proofPurpose: "assertionMethod",
      verificationMethod: `${issuer}#key-1`,
      jws: "eyJhaa..Iw",
    },
  };
}

export { createToken, createNotification, randomDid };
