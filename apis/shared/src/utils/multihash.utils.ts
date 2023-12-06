import multihash from "multihashes";
import { remove0xPrefix } from "./strings.utils.js";

export const multihashEncode = (
  hexHash: string,
  alg: multihash.HashName = "sha2-256",
  length?: number,
): Uint8Array =>
  multihash.encode(
    multihash.fromHexString(remove0xPrefix(hexHash)),
    alg,
    length,
  );

export const multihashDecode = (bytes: Uint8Array): Uint8Array =>
  multihash.decode(bytes).digest;

export const generateMultihash = (hash: string): string => {
  const hashLength = Buffer.from(hash.slice(2), "hex").length;
  const hashLengthHex = Buffer.from([hashLength]).toString("hex");
  const algCode = "12"; // code for sha2-256 in multihash
  return `${algCode}${hashLengthHex}${hash.slice(2)}`;
};
