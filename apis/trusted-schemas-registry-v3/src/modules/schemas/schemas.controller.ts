import { Controller, Get, Query, Param, Header } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaginatedList } from "@ebsiint-api/shared";
import { SchemasService } from "./schemas.service.js";
import {
  formatSchemas,
  formatSchemaRevisions,
  formatSchemaRevisionMetadataList,
} from "./schemas.formatter.js";
import {
  GetSchemaRevisionMetadataListResponse,
  GetSchemaRevisionsResponse,
  GetSchemasResponse,
} from "./schemas.interface.js";
import {
  GetSchemaParams,
  GetSchemaRevisionParams,
  GetSchemaRevisionMetadataParams,
  GetSchemasQuery,
  GetSchemaRevisionsQuery,
  GetSchemaRevisionMetadataQuery,
} from "./dto/index.js";
import type { ApiConfig } from "../../config/configuration.js";

@Controller("/schemas")
export class SchemasController {
  constructor(
    private schemasService: SchemasService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Get("")
  async getSchemas(
    @Query() query: GetSchemasQuery,
  ): Promise<PaginatedList<GetSchemasResponse>> {
    const schemas = await this.schemasService.getSchemas(
      query["page[after]"],
      query["page[size]"],
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/schemas`;

    return formatSchemas(
      schemas,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }

  @Get("/:schemaId")
  async getSchema(@Param() params: GetSchemaParams): Promise<unknown> {
    const { schemaId } = params;
    return this.schemasService.getSchema(schemaId);
  }

  @Get("/:schemaId/revisions")
  async getSchemaRevisions(
    @Param() params: GetSchemaParams,
    @Query() query: GetSchemaRevisionsQuery,
  ): Promise<PaginatedList<GetSchemaRevisionsResponse>> {
    const { schemaId } = params;

    const revisions = await this.schemasService.getSchemaRevisions(
      schemaId,
      query["page[after]"],
      query["page[size]"],
      query["valid-at"],
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/schemas/${schemaId}/revisions`;

    return formatSchemaRevisions(
      revisions,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      query["valid-at"],
    );
  }

  @Get("/:schemaId/revisions/:schemaRevisionId")
  async getSchemaRevision(
    @Param() params: GetSchemaRevisionParams,
  ): Promise<unknown> {
    const { schemaId, schemaRevisionId } = params;
    return this.schemasService.getSchemaRevision(schemaId, schemaRevisionId);
  }

  @Get("/:schemaId/revisions/:schemaRevisionId/metadata")
  async getSchemaRevisionMetadataList(
    @Param() params: GetSchemaRevisionParams,
    @Query() query: GetSchemaRevisionMetadataQuery,
  ): Promise<PaginatedList<GetSchemaRevisionMetadataListResponse>> {
    const { schemaId, schemaRevisionId } = params;

    const metadata = await this.schemasService.getSchemaRevisionMetadataList(
      schemaId,
      schemaRevisionId,
      query["page[after]"],
      query["page[size]"],
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata`;

    return formatSchemaRevisionMetadataList(
      metadata,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }

  @Get("/:schemaId/revisions/:schemaRevisionId/metadata/:metadataId")
  @Header("Content-type", "application/ld+json")
  async getSchemaRevisionMetadata(
    @Param() params: GetSchemaRevisionMetadataParams,
  ): Promise<unknown> {
    const { schemaId, schemaRevisionId, metadataId } = params;

    return this.schemasService.getSchemaRevisionMetadata(
      schemaId,
      schemaRevisionId,
      metadataId,
    );
  }
}

export default SchemasController;
