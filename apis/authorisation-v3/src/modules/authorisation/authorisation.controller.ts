import { Controller, Get, HttpCode } from "@nestjs/common";
import { AuthorisationService } from "./authorisation.service";
import type { JsonWebKeySet, OPMetadata } from "./authorisation.interfaces";

@Controller("/")
export class AuthorisationController {
  constructor(private authorisationService: AuthorisationService) {}

  @HttpCode(200)
  @Get("/.well-known/openid-configuration")
  getOPMetadata(): OPMetadata {
    return this.authorisationService.getOPMetadata();
  }

  @HttpCode(200)
  @Get("/jwks")
  getJwks(): JsonWebKeySet {
    return this.authorisationService.getJwks();
  }
}

export default AuthorisationController;
