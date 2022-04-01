import crypto from "node:crypto";
import { createJWT, ES256KSigner } from "did-jwt";

export async function createFakeToken({
  apiName,
  authorisationApiName,
  trustedAppsRegistryApiUrl,
}: {
  apiName: string;
  authorisationApiName: string;
  trustedAppsRegistryApiUrl: string;
  useKidAuthApi?: boolean;
}): Promise<string> {
  const payload = {
    iss: authorisationApiName,
    sub: "testApp",
    aud: apiName,
    atHash: `0x${crypto.randomBytes(32).toString("hex")}`,
    exp: Math.trunc(Date.now() / 1000) + 15,
    nonce: crypto.randomBytes(16).toString("base64"),
  };

  const kid = `${trustedAppsRegistryApiUrl}/${"0".repeat(64)}`;

  return createJWT(
    payload,
    {
      alg: "ES256K",
      issuer: authorisationApiName,
      signer: ES256KSigner(crypto.randomBytes(32).toString("hex")),
      canonicalize: true,
    },
    {
      kid,
    }
  );
}

export default createFakeToken;
