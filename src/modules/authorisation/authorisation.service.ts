import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import crypto from "crypto";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import {
  Session as OAuth2Session,
  AkeResponse,
  InvalidAppError,
  InvalidTokenError,
} from "@cef-ebsi/oauth2-auth";
import {
  DidAuthValidationResponse,
  EbsiDidAuth,
  Session as SiopSession,
} from "@cef-ebsi/siop-auth";
import { ApiConfig } from "../../config/configuration";
import { AuthenticationRequestResponse } from "./authorisation.interface";
import { OAuth2SessionDto, SiopSessionDto } from "./dto";

function prefix0x(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

@Injectable()
export class AuthorisationService {
  private readonly logger = new Logger(AuthorisationService.name);

  private siopSessionsUrl: string;

  private privateKey: string;

  private kid: string;

  private did: string;

  private didRegistry: string;

  private oauth2Session: OAuth2Session;

  private siopSession: SiopSession;

  constructor(private configService: ConfigService<ApiConfig>) {
    const domain = this.configService.get<string>("domain");
    const urlPrefix = this.configService.get<string>("apiUrlPrefix");
    this.siopSessionsUrl = `${domain}${urlPrefix}/siop-sessions`;
    this.privateKey = prefix0x(this.configService.get<string>("apiPrivateKey"));
    const trustedAppRegistry = this.configService.get<string>(
      "trustedAppsRegistry"
    );
    const apiTarId = this.configService.get<string>("apiTarId");
    this.kid = `${trustedAppRegistry}/${apiTarId}`;
    this.didRegistry = this.configService.get<string>("didRegistry");
    this.did = this.configService.get<string>("apiDid");

    this.oauth2Session = new OAuth2Session(
      this.configService.get<string>("apiPrivateKey"),
      {
        appName: this.configService.get<string>("apiName"),
        tarProvider: trustedAppRegistry,
        kid: this.kid,
      }
    );

    this.siopSession = new SiopSession({
      privateKey: this.privateKey,
      kid: this.kid,
      did: this.did,
    });
  }

  async authenticationRequest(): Promise<AuthenticationRequestResponse> {
    return EbsiDidAuth.createAuthenticationRequest({
      redirectUri: this.siopSessionsUrl,
      hexPrivateKey: this.privateKey,
      kid: this.kid,
      issuer: this.did,
    });
  }

  async createOAuth2Session(body: OAuth2SessionDto): Promise<AkeResponse> {
    let publicKey: crypto.KeyObject;
    try {
      publicKey = await this.oauth2Session.verifyAuthenticationRequest(
        body.clientAssertion
      );
    } catch (error) {
      if (
        error instanceof InvalidAppError ||
        error instanceof InvalidTokenError
      ) {
        throw new BadRequestError("Invalid Client Assertion", {
          detail: error.message,
        });
      }

      throw error;
    }
    return this.oauth2Session.createAccessToken(body, publicKey);
  }

  async createSiopSession(body: SiopSessionDto): Promise<AkeResponse> {
    let payload: DidAuthValidationResponse;

    try {
      payload = await EbsiDidAuth.verifyAuthenticationResponse(
        body.id_token,
        this.didRegistry,
        this.siopSessionsUrl
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestError("Invalid ID Token", {
          detail: error.message,
        });
      }

      throw error;
    }

    return this.siopSession.createAccessToken(payload);
  }
}

export default AuthorisationService;
