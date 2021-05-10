import { ec as EC } from "elliptic";

export function generateKeyPair(): {
  privateKey: string;
  publicKey: string;
} {
  const ec = new EC("secp256k1");
  const ecKey = ec.genKeyPair();
  return {
    privateKey: ecKey.getPrivate("hex"),
    publicKey: ecKey.getPublic("hex"),
  };
}

export default generateKeyPair;
