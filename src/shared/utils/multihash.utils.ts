import multihash from "multihashes";
import { remove0xPrefix } from "./strings.utils";

export const multihashEncode = (
  hexHash: string,
  alg: multihash.HashName = "sha2-256",
  length?: number
): Uint8Array =>
  multihash.encode(
    multihash.fromHexString(remove0xPrefix(hexHash)),
    alg,
    length
  );

export default multihashEncode;
