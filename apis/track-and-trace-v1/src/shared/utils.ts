import { remove0xPrefix, encode } from "@ebsiint-api/shared";
import { util } from "@cef-ebsi/key-did-resolver";

export function hexToDid(hex: string) {
  const utf8String = Buffer.from(remove0xPrefix(hex), "hex").toString("utf-8");
  if (utf8String.startsWith("did:ebsi:")) {
    return utf8String;
  }

  const publicKeyJwk = encode.publicKey.fromHexToJWK(hex);
  return util.createDid(publicKeyJwk);
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
