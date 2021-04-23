import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AuthenticationRequest,
  AuthenticationResponse,
} from "../../shared/interfaces";
import { InvalidScope } from "../../errors";
import { ApiConfig } from "../../config/configuration";
import { AuthenticationErrors } from "../../errors/errorCodes";
import { prefix0x, prepareDidAuthRequest } from "./authentication.utils";

const USERS_ONBOARDING_SCOPE = "ebsi users onboarding";

@Injectable()
export default class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  private kid: string;

  private privateKey: string;

  private domain: string;

  private apiUrlPrefix: string;

  private applicationDid: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.privateKey = prefix0x(this.configService.get<string>("apiPrivateKey"));

    this.apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");

    const trustedAppRegistry = this.configService.get<string>(
      "trustedAppsRegistry"
    );
    this.domain = this.configService.get<string>("domain");

    const applicationId = this.configService.get<string>("applicationId");
    this.applicationDid = this.configService.get<string>("applicationDid");
    this.kid = `${trustedAppRegistry}/${applicationId}`;
  }

  async startAuthentication(
    authenticationRequest: AuthenticationRequest
  ): Promise<AuthenticationResponse> {
    if (authenticationRequest.scope !== USERS_ONBOARDING_SCOPE)
      throw new InvalidScope(AuthenticationErrors.UNKNOWN_SCOPE);

    const uri = await prepareDidAuthRequest(
      `${this.domain}/${this.apiUrlPrefix}/authentication-responses`,
      this.privateKey,
      this.kid,
      this.applicationDid
    );
    const authenticationResponse: AuthenticationResponse = {
      session_token: uri,
    };
    return authenticationResponse;
  }
}
