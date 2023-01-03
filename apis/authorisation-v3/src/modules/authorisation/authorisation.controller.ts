import { Controller, Get, HttpCode, Query } from "@nestjs/common";
import type { PresentationDefinitionV2 } from "@sphereon/pex-models";
import { AuthorisationService } from "./authorisation.service";
import type { JsonWebKeySet, OPMetadata } from "./authorisation.interfaces";
import { GetPresentationDefinitionsDto } from "./dto";

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

  @HttpCode(200)
  @Get("/presentation-definitions")
  getPresentationDefinitions(
    @Query() query: GetPresentationDefinitionsDto
  ): PresentationDefinitionV2 {
    return this.authorisationService.getPresentationDefinitions(query.scope);
  }
}

export default AuthorisationController;
