import * as b64 from "multiformats/bases/base64";
import multihash from "multihashes";
import { remove0xPrefix } from "./strings.utils";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const multibase64Encode = (str: string): string =>
  b64.base64url.encode(textEncoder.encode(str)).toString();

export const multibase64Decode = (str: string): string =>
  textDecoder.decode(b64.base64url.decode(str));

export const multihashEncode = (
  str: string,
  alg: multihash.HashName,
  length?: number
): string =>
  multihash.toHexString(
    multihash.encode(multihash.fromHexString(remove0xPrefix(str)), alg, length)
  );
