import crypto from "crypto";
import axios from "axios";
import { createJwt, SimpleSigner } from "@cef-ebsi/did-jwt";
import { loadConfig } from "../../src/config/configuration";

const { apiName, authApiName, trustedAppsRegistry, testApp } = loadConfig();

async function createFakeToken(useKidAuthApi = false): Promise<string> {
  const payload = {
    iss: authApiName,
    sub: testApp.name,
    aud: apiName,
    atHash: `0x${crypto.randomBytes(32).toString("hex")}`,
    exp: Math.trunc(Date.now() / 1000) + 15,
    nonce: crypto.randomBytes(16).toString("base64"),
  };

  let kid = `${trustedAppsRegistry}/0x${"0".repeat(64)}`;
  if (useKidAuthApi) {
    const response = await axios.get(
      `${trustedAppsRegistry}?name=${authApiName}`
    );
    const { href } = (response.data as {
      items: { href: string }[];
    }).items[0];
    kid = href;
  }
  return createJwt(
    payload,
    {
      alg: "ES256K",
      issuer: authApiName,
      signer: SimpleSigner(crypto.randomBytes(32).toString("hex")),
    },
    {
      kid,
    }
  );
}

export { createFakeToken };

export default createFakeToken;
