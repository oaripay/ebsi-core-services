import { Resolver } from "did-resolver";
import { verifyJWT } from "did-jwt";
import { JWK, JWT } from "jose";
import moment from "moment";
import * as config from "src/config";
import { doGetCallWithToken } from "src/utils/api";
import { PRINT_ERROR } from "src/utils/Util";
import ComponentSecureEnclave from "./ComponentSecureEnclave";
import {
  IComponentAuthZToken,
  JWTHeader,
  JWTVerifyOptions,
  VerifiedJwt,
} from "./JWT";
import SecureEnclave from "../secureEnclave";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const EbsiDidResolver = require("ebsi-did-resolver");

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export default interface IVerifier {
  verifyVcJwt(data: string, options?: JWTVerifyOptions): Promise<VerifiedJwt>;

  verifyJwt(jwt: string): Promise<VerifiedJwt>;
  // eslint-disable-next-line semi
}

export class Verifier implements IVerifier {
  private static instance: Verifier;

  private resolver: Resolver;

  private constructor(
    private iSecureEnclave: SecureEnclave = ComponentSecureEnclave.Instance
  ) {
    this.resolver = new Resolver(
      EbsiDidResolver.getResolver({
        rpcUrl: config.besu.provider,
        registry: config.besu.didRegistry,
      })
    );
  }

  static get Instance(): Verifier {
    if (!this.instance) this.instance = new this();
    return this.instance;
  }

  /**
   * Verifies JWS signed using did-jwt library thus using ES256K-R.
   * Used for VCs and VPs.
   * @param data
   * @param options
   */
  async verifyVcJwt(
    data: string,
    inOptions?: JWTVerifyOptions
  ): Promise<VerifiedJwt> {
    let options = inOptions;
    if (!options) options = <JWTVerifyOptions>{};

    try {
      options.resolver = this.resolver;
      const signedJwt = data;
      const result = await verifyJWT(signedJwt, options);

      return result;
    } catch (error) {
      PRINT_ERROR((<Error>error).message, "Error verifying JWT: verifyVcJwt");
      PRINT_ERROR((<Error>error).name);
      PRINT_ERROR((<Error>error).stack);
      throw error;
    }
  }

  /**
   * Verifies JWS using Jose library.
   * Used for API JWT AuthZ/N.
   * @param jwt, following this structure:
   *  JWT Header:
   *    "alg"  : "ES256K", //secp256k1
   *    "type" : "JWT"
   *    "jku" : "API URL of EBSI-TrustedApp-Register"
   *    "kid": "A key identifier" (example of the consuming App ID: "ebsi-notary, "ebsi-wallet", "ebsi-diploma"...)
   *  JWT Body:
   *    "sub" : "Source Trusted Application Name: like ebsi-notary, ebsi-wallet, ebsi-eca,..."
   *    "iat"   :  "Date/Time when JWT has been generated"
   *    "exp" :  "Expiration Date/time of JWT - Should be longer, Which value = 1 day?"
   *    "aud" : "TargetApp"
   */
  async verifyJwt(jwt: string): Promise<VerifiedJwt> {
    const parsedJwt = JWT.decode(jwt, { complete: true });
    const header = <JWTHeader>parsedJwt.header;
    const payload = <IComponentAuthZToken>parsedJwt.payload;

    if (header.jku && header.kid) {
      // call the SC or BESU API Endpoint to get the key from the kid
      const publicKey = await this.getPublicKeyfromTrustedList(header.kid);
      const decodedKey = Buffer.from(publicKey, "base64").toString("utf8");
      const jwk = JWK.asKey(decodedKey);

      const verifiedPayload = JWT.verify(jwt, jwk);
      return <VerifiedJwt>{ payload: verifiedPayload, jwt };
    }

    if (payload.iss) {
      const publicKey = await this.getPublicKeyfromTrustedList(payload.iss);
      const decodedKey = Buffer.from(publicKey, "base64").toString("utf8");
      const jwk = JWK.asKey(decodedKey);

      const payloadVerified = JWT.verify(jwt, jwk);
      return <VerifiedJwt>{ payload: payloadVerified, jwt };
    }

    PRINT_ERROR("No public key found to validate the token: verifyJwt");
    throw new Error("No public key found to validate the token.");
  }

  async getPublicKeyfromTrustedList(
    appName: string,
    url?: string
  ): Promise<string> {
    const trustedListApiUrl = url
      ? `${url}/${appName}`
      : `${config.EBSI_TRUSTED_APP_API_URI}/public-keys/${appName}`;
    const se = this.iSecureEnclave;

    // Temporary, the JWT should not be needed in the future.
    const payload = {
      sub: "ebsi-wallet", // Should be the id of the app that is requesting the token
      iat: moment().unix(),
      exp: moment().add(15, "minutes").unix(),
      aud: config.COMPONENT_WALLET_ID,
    };
    const buffer = Buffer.from(JSON.stringify(payload));
    const token = await se.signJwt(se.enclaveDid, buffer);

    const publicKey = await doGetCallWithToken(token, trustedListApiUrl);

    return publicKey.pubKey;
  }
}
