import { JWK, JWKECKey } from "jose";
import base64url from "base64url";
import { Buffer } from "buffer";
import { COMPONENT_WALLET_ID } from "src/config";

interface IJwk {
  crv: string;
  x: string;
  y: string;
  d?: string;
  kty: string;
  kid?: string;
}

const toHex = (data: string): string =>
  Buffer.from(data, "base64").toString("hex");

const getPublicKeyHexFromJWK = (jwk: IJwk): string => {
  const publikKeyHex = `0x04${toHex(jwk.x)}${toHex(jwk.y)}`;
  return publikKeyHex;
};

const getJWKfromHex = (
  publicKeyHex: string,
  privateKeyHex: string
): JWK.ECKey => {
  const jwk = <IJwk>{
    crv: "secp256k1",
    kty: "EC",
    kid: COMPONENT_WALLET_ID,
  };

  const cleanPublicKeyHex = publicKeyHex.replace("0x04", "");
  const cleanPrivateKeyHex = privateKeyHex.replace("0x", "");

  const buf = Buffer.from(cleanPrivateKeyHex, "hex");
  jwk.d = base64url(buf);

  const X = cleanPublicKeyHex.substr(0, 64);
  const bufX = Buffer.from(X, "hex");
  jwk.x = base64url(bufX);

  const Y = cleanPublicKeyHex.substr(64, 64);
  const bufY = Buffer.from(Y, "hex");
  jwk.y = base64url(bufY);

  const jwkEcKey = JWK.asKey(<JWKECKey>jwk);
  return jwkEcKey;
};

export { getJWKfromHex, getPublicKeyHexFromJWK };
