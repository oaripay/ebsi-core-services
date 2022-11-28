import { bases } from "multiformats/basics";

// Export bases we support in DID Registry API
export const multibase = {
  base16: bases.base16,
  base64: bases.base64,
  base58btc: bases.base58btc,
  base64url: bases.base64url,
};

export default multibase;
