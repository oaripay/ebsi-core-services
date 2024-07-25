import { ES256KSigner, ES256Signer, EdDSASigner } from "did-jwt";

export function getSigner(
  privateKey: Uint8Array,
  alg: "ES256K" | "ES256" | "EdDSA",
) {
  if (alg === "ES256K") {
    return ES256KSigner(privateKey);
  }

  if (alg === "ES256") {
    return ES256Signer(privateKey);
  }

  if (alg === "EdDSA") {
    return EdDSASigner(privateKey);
  }

  throw new Error(`Unsupported algorithm ${alg as string}`);
}

export default getSigner;
