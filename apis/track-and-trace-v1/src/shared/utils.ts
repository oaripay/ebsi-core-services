import { Resolver } from "did-resolver";
import { remove0xPrefix, encode } from "@ebsiint-api/shared";
import { util, getResolver } from "@cef-ebsi/key-did-resolver";

export function hexToDid(hex: string) {
  const utf8String = Buffer.from(remove0xPrefix(hex), "hex").toString("utf-8");
  if (utf8String.startsWith("did:ebsi:")) {
    return utf8String;
  }

  const publicKeyJwk = encode.publicKey.fromHexToJWK(hex);
  return util.createDid(publicKeyJwk);
}

export async function didToHex(did: string) {
  if (did.startsWith("did:key")) {
    const didResolver = new Resolver(getResolver());
    const result = await didResolver.resolve(did);
    const publicKeyJwk =
      result.didDocument?.verificationMethod![0]?.publicKeyJwk;

    if (!publicKeyJwk) {
      throw new Error(`DID ${did} can't be resolved`);
    }

    if (publicKeyJwk.crv !== "secp256k1") {
      throw new Error(
        `The did ${did} must use secp256k1 curve. Received: ${publicKeyJwk.crv}`,
      );
    }
    const publicKeyHex = encode.publicKey.fromJWKToHex(publicKeyJwk);
    return `0x${publicKeyHex}`;
  }
  return `0x${Buffer.from(did).toString("hex")}`;
}

export function permissionToString(permission: number) {
  switch (permission) {
    case 0:
      return "delegate";
    case 1:
      return "write";
    case 2:
      return "creator";
    default:
      throw new Error(`unsupported permission ${permission}`);
  }
}
