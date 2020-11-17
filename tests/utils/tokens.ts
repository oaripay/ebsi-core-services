import { JWK, JWKECKey, JWT } from "jose";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import base64url from "base64url";

const prefixWith0x = (key: string): string =>
  key.startsWith("0x") ? key : `0x${key}`;
enum TokenType {
  bearer = "Bearer",
}
interface AccessTokenResponseBody {
  accessToken: string;
  tokenType: TokenType.bearer;
  expiresIn: number; // 15 minutes
  issuedAt: number;
}
interface IJwk {
  crv: string;
  x: string;
  y: string;
  d?: string;
  kty: string;
  kid?: string;
}
const getJWKfromHex = (
  configService: ConfigService,
  publicKeyHex: string,
  privateKeyHex: string
): JWK.ECKey => {
  const jwk = <IJwk>{
    crv: "secp256k1",
    kty: "EC",
    kid: configService.get<string>("apiName"),
  };
  const cleanPublicKeyHex = publicKeyHex.replace("0x04", "");
  const cleanPrivateKeyHex = privateKeyHex.replace("0x", "");
  const buf: Buffer = Buffer.from(cleanPrivateKeyHex, "hex");
  jwk.d = base64url(buf);
  const X = cleanPublicKeyHex.substr(0, 64);
  const bufX = Buffer.from(X, "hex");
  jwk.x = base64url(bufX);
  const Y = cleanPublicKeyHex.substr(64, 64);
  const bufY: Buffer = Buffer.from(Y, "hex");
  jwk.y = base64url(bufY);
  const jwkEcKey: JWK.ECKey = JWK.asKey(<JWKECKey>jwk);
  return jwkEcKey;
};
const generateToken = (
  configService: ConfigService,
  opts?: {
    [key: string]: string | number;
  }
): AccessTokenResponseBody => {
  const payload = {
    aud: configService.get<string>("apiName"),
    iss: configService.get<string>("apiName"),
    ...opts,
  };
  const privKey = prefixWith0x(configService.get<string>("apiPrivateKey"));
  const wallet = new ethers.Wallet(privKey);
  const signingKey = new ethers.utils.SigningKey(wallet.privateKey);
  const jwk = getJWKfromHex(
    configService,
    signingKey.publicKey,
    signingKey.privateKey
  );
  const token = JWT.sign(payload, jwk, {
    algorithm: "ES256K",
    header: {
      typ: "JWT",
    },
    expiresIn: "900 seconds",
  });
  return {
    accessToken: token,
    tokenType: TokenType.bearer,
    expiresIn: 900,
    issuedAt: Math.round(Date.now() / 1000),
  };
};
interface TestingSetup {
  token: string;
  did: string;
}
const generateKeys = (): JWK.ECKey =>
  JWK.generateSync("EC", "secp256k1", { use: "sig" });
const toHex = (data: string): string =>
  Buffer.from(data, "base64").toString("hex");
const initSetupForTesting = (configService: ConfigService): TestingSetup => {
  const randNum: number = Math.floor(Math.random() * 1000000);
  const keyJwk = generateKeys();
  const wallet = new ethers.Wallet(prefixWith0x(toHex(keyJwk.d)));
  const did = `did:ebsi:${wallet.address}`;
  const response = generateToken(configService, {
    did,
    nonce: `zizu-${randNum}`, // nonce from the request
    sub: `TEST ENTITY-${randNum}`, // entity Name
  });
  return {
    token: response.accessToken,
    did,
  };
};
export { initSetupForTesting, TestingSetup };
