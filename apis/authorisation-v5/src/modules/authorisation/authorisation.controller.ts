import {
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Body,
  Headers,
  Header,
} from "@nestjs/common";
import type { PresentationDefinitionV2 } from "@sphereon/pex-models";
import { Accepts } from "@ebsiint-api/shared";
import { AuthorisationService } from "./authorisation.service.js";
import type {
  JsonWebKeySet,
  OPMetadata,
  TokenResponse,
} from "./authorisation.interfaces.js";
import { GetPresentationDefinitionsDto } from "./dto/index.js";
import { OAuth2TokenError } from "./errors/index.js";
import { CUSTOM_SCOPES } from "./authorisation.constants.js";

@Controller("/")
export class AuthorisationController {
  constructor(private authorisationService: AuthorisationService) {}

  @Get("/.well-known/openid-configuration")
  @Accepts("application/json")
  @HttpCode(200)
  getOPMetadata(): OPMetadata {
    return this.authorisationService.getOPMetadata();
  }

  @Get("/jwks")
  @Accepts("application/jwk-set+json")
  @HttpCode(200)
  @Header("Content-type", "application/jwk-set+json")
  getJwks(): Promise<JsonWebKeySet> {
    return this.authorisationService.getJwks();
  }

  @Get("/presentation-definitions")
  @Accepts("application/json")
  @HttpCode(200)
  getPresentationDefinitions(
    @Query() { scope }: GetPresentationDefinitionsDto,
  ): PresentationDefinitionV2 {
    const customScope = scope.split(" ")[1] as (typeof CUSTOM_SCOPES)[number];
    return this.authorisationService.getPresentationDefinitions(customScope);
  }

  @Post("/token")
  @Accepts("application/json")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @Header("Pragma", "no-cache")
  createAccessToken(
    @Headers("content-type") contentType: string | undefined,
    @Body() body: unknown, // Validate DTO within the service method so we can properly handle the error response
  ): Promise<TokenResponse> {
    // Only accept application/x-www-form-urlencoded
    // https://openid.net/specs/openid-connect-core-1_0.html#TokenRequest
    if (
      !contentType ||
      !contentType.toLowerCase().includes("application/x-www-form-urlencoded")
    ) {
      throw new OAuth2TokenError("invalid_request", {
        errorDescription:
          "Content-type must be application/x-www-form-urlencoded",
      });
    }

    return this.authorisationService.createAccessToken(body);
  }
}

export default AuthorisationController;
