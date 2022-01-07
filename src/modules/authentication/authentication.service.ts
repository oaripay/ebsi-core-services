import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { compactVerify, importJWK } from "jose";
import type { JWK } from "jose";
import { createJWT, decodeJWT, ES256KSigner, verifyJWT } from "did-jwt";
import { Resolver } from "did-resolver";
import { getResolver } from "@cef-ebsi/ebsi-did-resolver";
import { ConfigService } from "@nestjs/config";
import {
  createCredential,
  createVerifiableCredential,
  RequiredProof,
  SignatureValue,
} from "@cef-ebsi/verifiable-credential";
import { JWTDecoded } from "did-jwt/lib/JWT";
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

import { prefix0x, prepareDidAuthRequest } from "./authentication.utils";

const USERS_ONBOARDING_SCOPE = "ebsi users onboarding";

@Injectable()
export default class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  private didResolver: string;

  private kid: string;

  private privateKey: string;

  private domain: string;

  private apiUrlPrefix: string;

  private applicationDid: string;

  private authResponsesEndpoint: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.privateKey = prefix0x(this.configService.get<string>("apiPrivateKey"));
    this.didResolver = configService.get<string>("didResolver");
    this.apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");

    const trustedAppRegistry = this.configService.get<string>(
      "trustedAppsRegistry"
    );
    this.domain = this.configService.get<string>("domain");

    const applicationId = this.configService.get<string>("applicationId");
    this.applicationDid = this.configService.get<string>("applicationDid");
    this.kid = `${trustedAppRegistry}/${applicationId}`;

    this.authResponsesEndpoint = `${this.domain}${this.apiUrlPrefix}/authentication-responses`;
  }

  async startAuthentication(
    authenticationRequest: AuthenticationRequest
  ): Promise<AuthenticationResponse> {
    if (authenticationRequest.scope !== USERS_ONBOARDING_SCOPE)
      throw new InvalidScope(AuthenticationErrors.INVALID_SCOPE);

    const uri = await prepareDidAuthRequest(
      `${this.domain}${this.apiUrlPrefix}/authentication-responses`,
      this.privateKey,
      this.kid,
      this.applicationDid
    );
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
    let decodedIdToken: JWTDecoded;
    try {
      decodedIdToken = decodeJWT(idToken);
    } catch (error) {
      throw new InvalidUserAuthentication(
        `${OnboardingErrors.ERROR_DECODING_ID_TOKEN}: ${error as string}`
      );
    }

    const { kid } = decodedIdToken.header;

    if (typeof kid !== "string" || kid === "")
      throw new InvalidUserAuthentication(
        `${OnboardingErrors.ERROR_DECODING_ID_TOKEN}: kid not present in the headers`
      );

    // Check if the DID exists
    const did = kid.split("#")[0];
    const resolver = new Resolver(getResolver({ registry: this.didResolver }));
    const result = await resolver.resolve(did);
    const { error: resError } = result.didResolutionMetadata;

    if (!resError || resError !== "notFound") {
      if (!result.didDocument) {
        throw new InvalidUserAuthentication(
          result.didResolutionMetadata.message as string
        );
      }

      try {
        await verifyJWT(idToken, {
          resolver,
          callbackUrl: this.authResponsesEndpoint,
        });
      } catch (error) {
        throw new InvalidUserAuthentication((error as Error).message);
      }
      return did;
    }

    // The DID does not exist: Check the signature of the JWT using the
    // public key defined in sub_jwk
    if (!decodedIdToken.payload.sub_jwk) {
      throw new InvalidUserAuthentication(OnboardingErrors.MISSING_SUB_JWK);
    }

    try {
      const publicKey = await importJWK({
        alg: "ES256",
        ...decodedIdToken.payload.sub_jwk,
      } as JWK);

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
    const credential = createCredential({
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1",
        "https://w3c-ccg.github.io/lds-jws2020/contexts/lds-jws2020-v1.json",
      ],
      id: `vc:ebsi:authentication#${randomUUID()}`,
      type: ["VerifiableCredential", "VerifiableAuthorisation"],
      issuer: this.applicationDid,
      issuanceDate: `${issuanceDate.toISOString().slice(0, -5)}Z`,
      validFrom: `${issuanceDate.toISOString().slice(0, -5)}Z`,
      expirationDate: `${expirationDate.toISOString().slice(0, -5)}Z`,
      credentialSubject: { id: subjectDid },
      credentialSchema: {
        id: this.configService.get<string>("authorisationCredentialSchema"),
        type: "OID",
      },
    });
    const signer = ES256KSigner(this.privateKey);
    const jwt = await createJWT(credential, {
      alg: "ES256K",
      issuer: this.applicationDid,
      signer,
      canonicalize: true,
    });
    const splitJwt = jwt.split(".");
    const detachedJwt = `${splitJwt[0]}..${splitJwt[2]}`;
    const requiredProof = {
      type: "EcdsaSecp256k1Signature2019",
      proofPurpose: "assertionMethod",
      verificationMethod: `${this.applicationDid}#keys-1`,
    } as RequiredProof;
    const signatureValue = {
      proofValue: detachedJwt,
      proofValueName: "jws",
      iat: decodeJWT(jwt).payload.iat,
    } as SignatureValue;
    const verifiableAuthorisation = createVerifiableCredential(
      credential,
      requiredProof,
      signatureValue
    );
    return {
      verifiableCredential: verifiableAuthorisation,
    } as VerifiableAuthorization;
  }
}
