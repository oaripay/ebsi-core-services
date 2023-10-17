import { randomInt } from "node:crypto";
import jsonwebtoken from "jsonwebtoken";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { Notification } from "../../src/modules/notifications/notifications.interface.js";

function createToken(did: string): string {
  return jsonwebtoken.sign(
    {
      sub: did,
    },
    "secret",
    {
      audience: "notifications-api",
      issuer: "authorisation-api",
    },
  );
}

function createNotification(
  from = EbsiWallet.createDid(),
  to = EbsiWallet.createDid(),
  ttl = 3600,
): Notification {
  const now = Date.now() + randomInt(1000);
  return {
    schemaId: "notifications-001",
    type: ["Notification", "StoreVerifiableCredential"],
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://essif.europa.eu/schemas/vc/2020/v1",
      "https://essif.europa.eu/schemas/notifications/2020/v1",
    ],
    from,
    to,
    issuanceDate: new Date(now).toISOString(),
    expirationDate: new Date(now + ttl * 1000).toISOString(),
    payload: {},
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      created: "2019-11-17T14:00:00Z",
      proofPurpose: "assertionMethod",
      verificationMethod: `${from}#key-1`,
      jws: "eyJhaa..Iw",
    },
  };
}

export { createToken, createNotification };
