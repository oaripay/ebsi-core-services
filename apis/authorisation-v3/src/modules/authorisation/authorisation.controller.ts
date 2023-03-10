import {
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Body,
  Headers,
} from "@nestjs/common";
import { BadRequestError } from "@ebsiint-api/shared";
import { AuthorisationService } from "./authorisation.service";
import type {
  JsonWebKeySet,
  OPMetadata,
  TokenResponse,
} from "./authorisation.interfaces";
import { GetPresentationDefinitionsDto, CreateAccessTokenDto } from "./dto";
import { PresentationDefinition } from "../../shared/interfaces/pex";

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

  // TODO: error responses must follow the specs https://www.rfc-editor.org/rfc/rfc6749#section-5.2
  // See https://ec.europa.eu/digital-building-blocks/tracker/browse/EBSIINT-5434
  @HttpCode(200)
  @Post("/token")
  createAccessToken(
    @Headers("content-type") contentType: string,
    @Body() body: CreateAccessTokenDto
  ): Promise<TokenResponse> {
    // Only accept application/x-www-form-urlencoded
    // https://openid.net/specs/openid-connect-core-1_0.html#TokenRequest
    if (
      !contentType.toLowerCase().includes("application/x-www-form-urlencoded")
    ) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: 'Content-type must be "application/x-www-form-urlencoded"',
      });
    }

    return this.authorisationService.createAccessToken(body);
  }
}

export default AuthorisationController;
