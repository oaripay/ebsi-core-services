import { Accepts, PaginatedList } from "@ebsiint-api/shared";
import { Controller, Get, Header, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.js";

import {
  GetSchemaParams,
  GetSchemaRevisionMetadataParams,
  GetSchemaRevisionMetadataQuery,
  GetSchemaRevisionParams,
  GetSchemaRevisionsQuery,
  GetSchemasQuery,
} from "./dto/index.js";
import {
  formatSchemaRevisionMetadataList,
  formatSchemaRevisions,
  formatSchemas,
} from "./schemas.formatter.js";
import {
  GetSchemaRevisionMetadataListResponse,
  GetSchemaRevisionsResponse,
  GetSchemasResponse,
} from "./schemas.interface.js";
import { SchemasService } from "./schemas.service.js";

@Controller("/schemas")
export class SchemasController {
  constructor(
    private schemasService: SchemasService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Accepts("application/json")
  @Get("/:schemaId")
  async getSchema(@Param() params: GetSchemaParams): Promise<unknown> {
    const { schemaId } = params;
    return this.schemasService.getSchema(schemaId);
  }

  @Accepts("application/json")
  @Get("/:schemaId/revisions/:schemaRevisionId")
  async getSchemaRevision(
    @Param() params: GetSchemaRevisionParams,
  ): Promise<unknown> {
    const { schemaId, schemaRevisionId } = params;
    return this.schemasService.getSchemaRevision(schemaId, schemaRevisionId);
  }

  @Accepts("application/ld+json")
  @Get("/:schemaId/revisions/:schemaRevisionId/metadata/:metadataId")
  @Header("Content-type", "application/ld+json")
  async getSchemaRevisionMetadata(
    @Param() params: GetSchemaRevisionMetadataParams,
  ): Promise<unknown> {
    const { metadataId, schemaId, schemaRevisionId } = params;

    return this.schemasService.getSchemaRevisionMetadata(
      schemaId,
      schemaRevisionId,
      metadataId,
    );
  }

  @Accepts("application/json")
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

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata`;

    return formatSchemaRevisionMetadataList(
      metadata,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }

  @Accepts("application/json")
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

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/schemas/${schemaId}/revisions`;

    return formatSchemaRevisions(
      revisions,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      query["valid-at"],
    );
  }

  @Accepts("application/json")
  @Get("")
  async getSchemas(
    @Query() query: GetSchemasQuery,
  ): Promise<PaginatedList<GetSchemasResponse>> {
    const schemas = await this.schemasService.getSchemas(
      query["page[after]"],
      query["page[size]"],
    );

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/schemas`;

    return formatSchemas(
      schemas,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }
}

export default SchemasController;
