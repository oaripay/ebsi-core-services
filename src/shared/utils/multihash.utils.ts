import multihash from "multihashes";
import { remove0xPrefix } from "./prefixWith0x.utils";

export const multihashEncode = (
  str: string,
  alg: multihash.HashName = "sha2-256"
): string =>
  multihash.toHexString(
    multihash.encode(multihash.fromHexString(remove0xPrefix(str)), alg)
  );

export default multihashEncode;
