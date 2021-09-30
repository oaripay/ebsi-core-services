import { Controller, Post, Body, HttpCode } from "@nestjs/common";
import type { AkeResponse } from "@cef-ebsi/oauth2-auth";
import { AuthorisationService } from "./authorisation.service";
import {
  AuthenticationRequestDto,
  OAuth2SessionDto,
  SiopSessionDto,
} from "./dto";
import { AuthenticationRequestResponse } from "./authorisation.interface";

@Controller("/")
export class AuthorisationController {
  constructor(private authorisationService: AuthorisationService) {}

  @HttpCode(200)
  @Post("/authentication-requests")
  async authenticationRequests(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Body() _body: AuthenticationRequestDto
  ): Promise<AuthenticationRequestResponse> {
    return this.authorisationService.authenticationRequest();
  }

  @HttpCode(200)
  @Post("/oauth2-sessions")
  async oauth2Sessions(@Body() body: OAuth2SessionDto): Promise<AkeResponse> {
    return this.authorisationService.createOAuth2Session(body);
  }

  @HttpCode(200)
  @Post("/siop-sessions")
  async siopSessions(@Body() body: SiopSessionDto): Promise<AkeResponse> {
    return this.authorisationService.createSiopSession(body);
  }
}

export default AuthorisationController;
