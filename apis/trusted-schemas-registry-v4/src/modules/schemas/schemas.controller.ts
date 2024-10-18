import { Controller, Get, Query, Param, Header } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Accepts, PaginatedListWithoutTotal } from "@ebsiint-api/shared";
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
import {
  Schema_filter,
  Revision_filter,
  // eslint-disable-next-line import/extensions, import/no-relative-packages
} from "../../../.graphclient/index.js";

@Controller("/schemas")
export class SchemasController {
  constructor(
    private schemasService: SchemasService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Get("")
  @Accepts("application/json")
  async getSchemas(
    @Query() query: GetSchemasQuery,
  ): Promise<PaginatedListWithoutTotal<GetSchemasResponse>> {
    const where: Schema_filter = {
      ...(query["schema-revision-id"] && {
        revisions_: {
          id: query["schema-revision-id"],
        },
      }),
    };

    const schemas = await this.schemasService.getSchemas(
      query["page[after]"],
      query["page[size]"],
      where,
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/schemas`;

    const searchParams = new URLSearchParams();
    Object.keys(query).forEach((k) => {
      const key = k as keyof GetSchemasQuery;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        searchParams.append(key, query[key]);
      }
    });
    const extraQuery = searchParams.size ? `&${searchParams.toString()}` : "";

    return formatSchemas(
      schemas,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      extraQuery,
    );
  }

  @Get("/:schemaId")
  @Accepts("application/json")
  async getSchema(@Param() params: GetSchemaParams): Promise<unknown> {
    const { schemaId } = params;
    return this.schemasService.getSchema(schemaId);
  }

  @Get("/:schemaId/revisions")
  @Accepts("application/json")
  async getSchemaRevisions(
    @Param() params: GetSchemaParams,
    @Query() query: GetSchemaRevisionsQuery,
  ): Promise<PaginatedListWithoutTotal<GetSchemaRevisionsResponse>> {
    const { schemaId } = params;

    const where: Revision_filter = {
      ...(query["metadata-id"] && {
        metadata_: {
          id: query["metadata-id"],
        },
      }),
    };

    const revisions = await this.schemasService.getSchemaRevisions(
      schemaId,
      query["page[after]"],
      query["page[size]"],
      where,
      query["valid-at"],
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/schemas/${schemaId}/revisions`;

    const searchParams = new URLSearchParams();
    Object.keys(query).forEach((k) => {
      const key = k as keyof GetSchemaRevisionsQuery;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        searchParams.append(key, query[key]!);
      }
    });
    const extraQuery = searchParams.size ? `&${searchParams.toString()}` : "";

    return formatSchemaRevisions(
      revisions,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      extraQuery,
    );
  }

  @Get("/:schemaId/revisions/:schemaRevisionId")
  @Accepts("application/json")
  async getSchemaRevision(
    @Param() params: GetSchemaRevisionParams,
  ): Promise<unknown> {
    const { schemaId, schemaRevisionId } = params;
    return this.schemasService.getSchemaRevision(schemaId, schemaRevisionId);
  }

  @Get("/:schemaId/revisions/:schemaRevisionId/metadata")
  @Accepts("application/json")
  async getSchemaRevisionMetadataList(
    @Param() params: GetSchemaRevisionParams,
    @Query() query: GetSchemaRevisionMetadataQuery,
  ): Promise<PaginatedListWithoutTotal<GetSchemaRevisionMetadataListResponse>> {
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
  @Accepts("application/ld+json")
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
