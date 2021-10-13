import {
  Controller,
  Get,
  Query,
  Param,
  Header,
  Headers,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyReply } from "fastify";
import IdentifiersService from "./identifiers.service";
import {
  formatIdentifiers,
  formatVersions,
  formatMetadata,
} from "./identifiers.formatter";
import {
  DidLink,
  MetadataIdLink,
  VersionIdLink,
} from "./identifiers.interface";
import {
  GetIdentifierParamsDto,
  GetIdentifiersDto,
  GetIdentifiersVersionsDto,
  GetIdentifierVersionMetadataParamsDto,
  GetIdentifierVersionParamsDto,
} from "./dto";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";

@Controller("/identifiers")
export default class IdentifiersController {
  constructor(
    private didMethodsService: IdentifiersService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  async getIdentifiers(
    @Query() query: GetIdentifiersDto
  ): Promise<PaginatedList<DidLink>> {
    const didMethods = await this.didMethodsService.getIdentifiers(
      query["page[after]"],
      query["page[size]"],
      query.controller
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/identifiers`;

    return formatIdentifiers(
      didMethods,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      query.controller
    );
  }

  @Get("/:did")
  async getIdentifier(
    @Param() params: GetIdentifierParamsDto,
    @Headers("Accept") accept: string,
    @Res() res: FastifyReply
  ): Promise<{ [x: string]: unknown }> {
    const { did } = params;

    const identifier = await this.didMethodsService.getIdentifier(did);

    if (accept === "application/did+json") {
      const { "@context": context, ...otherProps } = identifier;
      return res.type("application/did+json").send(otherProps);
    }

    return res.type("application/did+ld+json").send(identifier);
  }

  @Get("/:did/versions")
  async getIdentifiersVersions(
    @Query() query: GetIdentifiersVersionsDto,
    @Param() params: GetIdentifierParamsDto
  ): Promise<PaginatedList<VersionIdLink>> {
    const { did } = params;

    const didMethods = await this.didMethodsService.getIdentifiersVersions(
      did,
      query["page[after]"],
      query["page[size]"],
      query["valid-at"]
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/identifiers/${did}/versions`;

    return formatVersions(
      didMethods,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      query["valid-at"]
    );
  }

  @Get("/:did/versions/:versionId")
  async getIdentifierVersion(
    @Param() params: GetIdentifierVersionParamsDto,
    @Headers("Accept") accept: string,
    @Res() res: FastifyReply
  ): Promise<{ [x: string]: unknown }> {
    const { did, versionId } = params;

    const identifierVersion = await this.didMethodsService.getIdentifierVersion(
      did,
      versionId
    );

    if (accept === "application/did+json") {
      const { "@context": context, ...otherProps } = identifierVersion;
      return res.type("application/did+json").send(otherProps);
    }

    return res.type("application/did+ld+json").send(identifierVersion);
  }

  @Get("/:did/versions/:versionId/metadata")
  async getIdentifiersVersionsMetadata(
    @Query() query: GetIdentifiersVersionsDto,
    @Param() params: GetIdentifierVersionParamsDto
  ): Promise<PaginatedList<MetadataIdLink>> {
    const { did, versionId } = params;

    const didMethods =
      await this.didMethodsService.getIdentifiersVersionsMetadata(
        did,
        versionId,
        query["page[after]"],
        query["page[size]"]
      );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/identifiers/${did}/versions/${versionId}/metadata`;

    return formatMetadata(
      didMethods,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }

  @Get("/:did/versions/:versionId/metadata/:metadataId")
  @Header("Content-Type", "application/json")
  async getIdentifierVersionMetadata(
    @Param() params: GetIdentifierVersionMetadataParamsDto
  ): Promise<{ [x: string]: unknown }> {
    const { did, versionId, metadataId } = params;
    return this.didMethodsService.getIdentifierVersionMetadata(
      did,
      versionId,
      metadataId
    );
  }
}
