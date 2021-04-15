import { Controller, Post, Body, HttpCode } from "@nestjs/common";
import { AkeResponse } from "@cef-ebsi/oauth2-auth";
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
    @Body() body: AuthenticationRequestDto
  ): Promise<AuthenticationRequestResponse> {
    const { scope } = body;

    return this.authorisationService.authenticationRequest(scope);
  }

  @HttpCode(200)
  @Post("/oauth2-sessions")
  async oauth2Sessions(@Body() body: OAuth2SessionDto): Promise<AkeResponse> {
    return this.authorisationService.createSessionOauth2(body);
  }

  @HttpCode(200)
  @Post("/siop-sessions")
  async siopSessions(@Body() body: SiopSessionDto): Promise<AkeResponse> {
    const { id_token: idToken } = body;
    const tokenDecoded = await this.authorisationService.validateIdToken(
      idToken
    );
    return this.authorisationService.createSession("siop", tokenDecoded);
  }
}

export default AuthorisationController;
