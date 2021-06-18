import multibase from "multibase";
import multihash from "multihashes";
import { remove0xPrefix } from "./strings.utils";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const multibase64Encode = (str: string): string =>
  textDecoder.decode(multibase.encode("base64url", textEncoder.encode(str)));

export const multibase64Decode = (str: string): string =>
  textDecoder.decode(multibase.decode(textEncoder.encode(str)));

export const multihashEncode = (
  str: string,
  alg: multihash.HashName,
  length?: number
): string =>
  multihash.toHexString(
    multihash.encode(multihash.fromHexString(remove0xPrefix(str)), alg, length)
  );
