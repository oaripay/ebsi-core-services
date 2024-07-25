import { p256 } from "@noble/curves/p256";
import { secp256k1 } from "@noble/curves/secp256k1";
import { ed25519 } from "@noble/curves/ed25519";

export function generatePrivateKey(alg: "ES256K" | "ES256" | "EdDSA") {
  if (alg === "ES256K") {
    return secp256k1.utils.randomPrivateKey();
  }

  if (alg === "ES256") {
    return p256.utils.randomPrivateKey();
  }

  if (alg === "EdDSA") {
    return ed25519.utils.randomPrivateKey();
  }

  throw new Error(`Unsupported algorithm ${alg as string}`);
}

export default generatePrivateKey;
