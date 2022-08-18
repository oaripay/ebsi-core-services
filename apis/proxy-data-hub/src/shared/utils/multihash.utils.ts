import multihash from "multihashes";

const remove0xPrefix = (str: string): string =>
  str.startsWith("0x") ? str.slice(2) : str;

export const multihashEncode = (str: string, alg: multihash.HashName): string =>
  multihash.toHexString(
    multihash.encode(multihash.fromHexString(remove0xPrefix(str)), alg)
  );

export default multihashEncode;
