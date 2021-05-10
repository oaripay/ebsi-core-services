import crypto from "crypto";
import * as bs58 from "bs58";

export const createDid = (): string => {
  const buf = crypto.randomBytes(32);
  return `did:ebsi:${bs58.encode(buf)}`;
};

export default createDid;
