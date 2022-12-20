import { Controller, Get, HttpCode } from "@nestjs/common";
import { AuthorisationService } from "./authorisation.service";
import type { OpenIdConfiguration } from "./authorisation.interfaces";

@Controller("/")
export class AuthorisationController {
  constructor(private authorisationService: AuthorisationService) {}

  @HttpCode(200)
  @Get("/.well-known/openid-configuration")
  wellKnownOpenIdConfiguration(): OpenIdConfiguration {
    return this.authorisationService.getOpenIdConfiguration();
  }
}

export default AuthorisationController;
