import { Controller, Post, Body, HttpCode } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthorisationService } from "./authorisation.service";
import { ApiConfig } from "../../config/configuration";
import { AuthenticationRequestDto, OAuth2SessionDto } from "./dto";
import {
  AuthenticationRequestResponse,
  AkeResponse,
} from "./authorisation.interface";

@Controller("/")
export class AuthorisationController {
  constructor(
    private authorisationService: AuthorisationService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @HttpCode(200)
  @Post("/authentication-requests")
  async authenticationRequests(
    @Body() body: AuthenticationRequestDto
  ): Promise<AuthenticationRequestResponse> {
    const { scope } = body;

    return this.authorisationService.authenticationRequest(scope);
  }

  @HttpCode(200)
  @Post("/oauth2-sessions")
  async oauth2Sessions(@Body() body: OAuth2SessionDto): Promise<AkeResponse> {
    const { clientAssertion } = body;
    const {
      header,
      payload,
      publicKey,
    } = await this.authorisationService.validateClientAssertion(
      clientAssertion
    );
    return this.authorisationService.oauth2Session(
      payload,
      publicKey,
      header.kid
    );
  }
}

export default AuthorisationController;
