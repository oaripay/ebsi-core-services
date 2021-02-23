import { Controller, Post, Body, HttpCode } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthorisationService } from "./authorisation.service";
import { AuthenticationRequestResponse } from "./authorisation.interface";
import { ApiConfig } from "../../config/configuration";
import { AuthenticationRequestDto } from "./dto";

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
}

export default AuthorisationController;
