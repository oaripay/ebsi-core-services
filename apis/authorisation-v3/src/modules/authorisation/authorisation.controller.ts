import { Controller, Get, HttpCode } from "@nestjs/common";
import { AuthorisationService } from "./authorisation.service";
import type { OPMetadata } from "./authorisation.interfaces";

@Controller("/")
export class AuthorisationController {
  constructor(private authorisationService: AuthorisationService) {}

  @HttpCode(200)
  @Get("/.well-known/openid-configuration")
  getOPMetadata(): OPMetadata {
    return this.authorisationService.getOPMetadata();
  }
}

export default AuthorisationController;
