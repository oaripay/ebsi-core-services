import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import {
  compactVerify,
  decodeJwt,
  decodeProtectedHeader,
  importJWK,
  JWTPayload,
  jwtVerify,
  ProtectedHeaderParameters,
} from "jose";
import { ec as EC } from "elliptic";
import type { JWK } from "jose";
import { bytes } from "multiformats";
import { base64url } from "multiformats/bases/base64";
import { JsonWebKey, Resolver } from "did-resolver";
import { getResolver, validate } from "@cef-ebsi/ebsi-did-resolver";
import { ConfigService } from "@nestjs/config";
import {
  createVerifiableCredentialJwt,
  EbsiIssuer,
  EbsiVerifiableAttestation,
} from "@cef-ebsi/verifiable-credential";
import { RP, encode } from "@cef-ebsi/siop-auth";
import {
  AuhtenticationResponseRequest,
  AuthenticationRequest,
  AuthenticationResponse,
  VerifiableAuthorization,
} from "../../shared/interfaces";
import {
  InvalidUserAuthentication,
  InvalidScope,
  InvalidResponse,
} from "../../errors/index";
import {
  OnboardingErrors,
  AuthenticationErrors,
} from "../../errors/errorCodes";
import { ApiConfig } from "../../config/configuration";
import { addAlgToJwk, prefix0x } from "./authentication.utils";

const USERS_ONBOARDING_SCOPE = "ebsi users onboarding";

@Injectable()
export default class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  private didRegistryApiUrl: string;

  private kid: string;

  private privateKey: string;

  private domain: string;

  private apiName: string;

  private apiUrlPrefix: string;

  private apiDid: string;

  private apiVerificationMethodKid: string;

  private apiPublicKeyJwk: JWK;

  private apiPrivateKeyJwk: JWK;

  private relyingParty: RP;

  private siopSessionsUrl: string;

  private timeout: number;

  constructor(private configService: ConfigService<ApiConfig, true>) {
    this.privateKey = prefix0x(this.configService.get<string>("apiPrivateKey"));
    this.didRegistryApiUrl = configService.get<string>("didRegistryApiUrl");
    this.apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");

    const trustedAppRegistry = this.configService.get<string>(
      "trustedAppsRegistryApiUrl"
    );
    this.domain = this.configService.get<string>("domain");
    [this.apiDid] = this.configService
      .get<string>("apiVerificationMethodKid")
      .split("#");
    this.apiName = this.configService.get<string>("apiName");
    this.apiVerificationMethodKid = this.configService.get<string>(
      "apiVerificationMethodKid"
    );
    this.kid = `${trustedAppRegistry}/${this.apiName}`;
    this.siopSessionsUrl = `${this.domain}${this.apiUrlPrefix}/authentication-responses`;

    const hexPrivateKey = this.privateKey.replace(/^0x/, "");
    const ec = new EC("secp256k1");
    const apiPubPoint = ec.keyFromPrivate(hexPrivateKey, "hex").getPublic();
    this.apiPublicKeyJwk = {
      kty: "EC",
      crv: "secp256k1",
      x: base64url.baseEncode(apiPubPoint.getX().toBuffer("be", 32)),
      y: base64url.baseEncode(apiPubPoint.getY().toBuffer("be", 32)),
    };
    this.apiPrivateKeyJwk = {
      ...this.apiPublicKeyJwk,
      d: base64url.baseEncode(bytes.fromHex(hexPrivateKey)),
    };
    this.timeout = configService.get<number>("requestTimeout");
  }

  async getRelyingParty(): Promise<RP> {
    if (this.relyingParty) {
      return this.relyingParty;
    }

    this.relyingParty = new RP({
      privateKey: await importJWK(
        encode.privateKey.fromHextoJWK(this.privateKey),
        "ES256K"
      ),
      alg: "ES256K",
      name: this.apiName,
      kid: this.kid,
      redirectUri: this.siopSessionsUrl,
      didRegistry: this.didRegistryApiUrl,
    });

    return this.relyingParty;
  }

  async startAuthentication(
    authenticationRequest: AuthenticationRequest
  ): Promise<AuthenticationResponse> {
    if (authenticationRequest.scope !== USERS_ONBOARDING_SCOPE) {
      throw new InvalidScope(AuthenticationErrors.INVALID_SCOPE);
    }

    const rp = await this.getRelyingParty();
    const uri = await rp.createRequest({
      // claims: {
      //   id_token: { ...claimRequest },
      // },
    });

    const authenticationResponse: AuthenticationResponse = {
      session_token: uri,
    };
    return authenticationResponse;
  }

  async validateResponse(
    responseRequest: AuhtenticationResponseRequest
  ): Promise<string> {
    if (!responseRequest.id_token)
      throw new InvalidResponse(AuthenticationErrors.ID_TOKEN_MISSING);
    const idToken = responseRequest.id_token;
    let idTokenHeader: ProtectedHeaderParameters;
    let idTokenPayload: JWTPayload;

    try {
      idTokenPayload = decodeJwt(idToken);
      idTokenHeader = decodeProtectedHeader(idToken);
    } catch (error) {
      throw new InvalidUserAuthentication(
        `${OnboardingErrors.ERROR_DECODING_ID_TOKEN}: ${error as string}`
      );
    }

    const { kid } = idTokenHeader;

    if (typeof kid !== "string" || kid === "")
      throw new InvalidUserAuthentication(
        `${OnboardingErrors.ERROR_DECODING_ID_TOKEN}: kid not present in the headers`
      );

    // Check if the DID exists
    const did = kid.split("#")[0];
    const resolver = new Resolver(
      getResolver({
        registry: this.didRegistryApiUrl,
        ...(idTokenHeader.jwk && {
          naturalPersonJwks: [idTokenHeader.jwk as JsonWebKey],
        }),
      })
    );

    const result = await resolver.resolve(did, {
      timeout: this.timeout,
    });
    const { error: resError } = result.didResolutionMetadata;

    const didVersion = validate(did);
    let jwk: JsonWebKey;

    if (didVersion === 1) {
      // DID Version 1: Legal Entity
      if (!resError || resError !== "notFound") {
        if (!result.didDocument) {
          throw new InvalidUserAuthentication(
            result.didResolutionMetadata.message as string
          );
        }

        try {
          const publicKeyJwk = result.didDocument.verificationMethod.find(
            (vm) => vm.id === kid
          )?.publicKeyJwk;

          if (!publicKeyJwk) {
            throw new Error(`Can't find verification method related to ${kid}`);
          }

          const publicKey = await importJWK(publicKeyJwk, "ES256K");

          await jwtVerify(idToken, publicKey, {});
        } catch (error) {
          throw new InvalidUserAuthentication((error as Error).message);
        }

        return did;
      }

      // The DID does not exist: Check the signature of the JWT using the
      // public key defined in sub_jwk
      if (
        !idTokenPayload.sub_jwk ||
        typeof idTokenPayload.sub_jwk !== "object"
      ) {
        throw new InvalidUserAuthentication(OnboardingErrors.MISSING_SUB_JWK);
      }

      jwk = idTokenPayload.sub_jwk as JsonWebKey;
    } else {
      // DID Version 2: Natural Person
      jwk = idTokenHeader.jwk as JsonWebKey;
    }

    try {
      const publicKey = await importJWK(addAlgToJwk(jwk));

      const { payload, protectedHeader } = await compactVerify(
        idToken,
        publicKey
      );

      if (!payload || !protectedHeader) {
        throw new InvalidUserAuthentication(
          OnboardingErrors.ERROR_SIGNATURE_AUTHENTICATION_RESPONSE
        );
      }
    } catch (error) {
      throw new InvalidUserAuthentication(
        `${OnboardingErrors.ERROR_SIGNATURE_AUTHENTICATION_RESPONSE}: ${
          error as string
        }`
      );
    }
    return did;
  }

  async createVerifiableAuthorisation(
    subjectDid: string
  ): Promise<VerifiableAuthorization> {
    const issuanceDate = new Date();
    const expirationDate = new Date(
      issuanceDate.getTime() + 1000 * 60 * 60 * 24 * 182 // 365/2 = 6 months
    );

    const issuer: EbsiIssuer = {
      did: this.apiDid,
      kid: this.apiVerificationMethodKid,
      publicKeyJwk: this.apiPublicKeyJwk,
      privateKeyJwk: this.apiPrivateKeyJwk,
      alg: "ES256K",
    };

    const domain = this.configService.get<string>("domain");

    const vc: EbsiVerifiableAttestation = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      id: `vc:ebsi:authentication#${randomUUID()}`,
      type: ["VerifiableCredential", "VerifiableAuthorisation"],
      issuer: this.apiDid,
      issuanceDate: `${issuanceDate.toISOString().slice(0, -5)}Z`,
      issued: `${issuanceDate.toISOString().slice(0, -5)}Z`,
      validFrom: `${issuanceDate.toISOString().slice(0, -5)}Z`,
      expirationDate: `${expirationDate.toISOString().slice(0, -5)}Z`,
      credentialSubject: { id: subjectDid },
      credentialSchema: {
        id: this.configService.get<string>("authorisationCredentialSchema"),
        type: "FullJsonSchemaValidator2021",
      },
    };

    const jwt = await createVerifiableCredentialJwt(vc, issuer, {
      ebsiAuthority: domain.replace(/^https?:\/\//, ""),
      skipValidation: true,
      timeout: this.timeout,
    });

    return {
      verifiableCredential: jwt,
    } as VerifiableAuthorization;
  }
}
