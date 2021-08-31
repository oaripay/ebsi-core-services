import multihash from "multihashes";
import { remove0xPrefix } from "./strings.utils";

export const multihashEncode = (
  hexHash: string,
  alg: multihash.HashName = "sha2-256",
  lengthInBytes?: number
): Uint8Array =>
  multihash.encode(
    multihash.fromHexString(remove0xPrefix(hexHash)),
    alg,
    lengthInBytes
  );

export const multihashDecode = (bytes: Uint8Array): Uint8Array =>
  multihash.decode(bytes).digest;
