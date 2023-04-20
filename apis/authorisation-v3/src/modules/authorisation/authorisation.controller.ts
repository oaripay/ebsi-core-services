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
import { AuthorisationService } from "./authorisation.service";
import type {
  JsonWebKeySet,
  OPMetadata,
  TokenResponse,
} from "./authorisation.interfaces";
import { GetPresentationDefinitionsDto } from "./dto";
import { PresentationDefinition } from "../../shared/interfaces/pex";
import { OAuth2TokenError } from "./errors";

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
  @Header("Content-type", "application/jwk-set+json")
  getJwks(): Promise<JsonWebKeySet> {
    return this.authorisationService.getJwks();
  }

  @HttpCode(200)
  @Get("/presentation-definitions")
  getPresentationDefinitions(
    @Query() query: GetPresentationDefinitionsDto
  ): PresentationDefinition {
    return this.authorisationService.getPresentationDefinitions(query.scope);
  }

  @HttpCode(200)
  @Post("/token")
  @Header("Cache-Control", "no-store")
  @Header("Pragma", "no-cache")
  createAccessToken(
    @Headers("content-type") contentType: string,
    @Body() body: unknown // Validate DTO within the service method so we can properly handle the error response
  ): Promise<TokenResponse> {
    // Only accept application/x-www-form-urlencoded
    // https://openid.net/specs/openid-connect-core-1_0.html#TokenRequest
    if (
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
