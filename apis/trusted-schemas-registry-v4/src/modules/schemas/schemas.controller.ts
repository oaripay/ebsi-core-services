import type { PaginatedListWithoutTotal } from "@ebsiint-api/shared";

import { Accepts } from "@ebsiint-api/shared";
import { Controller, Get, Header, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  Revision_filter,
  Schema_filter,
} from "../../../.graphclient/index.js";
import type { ApiConfig } from "../../config/configuration.ts";
import type {
  GetSchemaRevisionMetadataListResponse,
  GetSchemaRevisionsResponse,
  GetSchemasResponse,
} from "./schemas.interface.ts";

import {
  GetSchemaParams,
  GetSchemaRevisionMetadataParams,
  GetSchemaRevisionMetadataQuery,
  GetSchemaRevisionParams,
  GetSchemaRevisionsQuery,
  GetSchemasQuery,
} from "./dto/index.ts";
import {
  formatSchemaRevisionMetadataList,
  formatSchemaRevisions,
  formatSchemas,
} from "./schemas.formatter.ts";
import { SchemasService } from "./schemas.service.ts";

@Controller("/schemas")
export class SchemasController {
  constructor(
    private schemasService: SchemasService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Accepts("application/json")
  @Get("")
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

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/schemas`;

    const searchParams = new URLSearchParams();
    for (const k of Object.keys(query)) {
      const key = k as keyof GetSchemasQuery;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        searchParams.append(key, query[key]);
      }
    }
    const extraQuery =
      searchParams.size > 0 ? `&${searchParams.toString()}` : "";

    return formatSchemas(
      schemas,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      extraQuery,
    );
  }

  @Accepts("application/json")
  @Get("/:schemaId")
  async getSchema(@Param() params: GetSchemaParams): Promise<unknown> {
    const { schemaId } = params;
    return this.schemasService.getSchema(schemaId);
  }

  @Accepts("application/json")
  @Get("/:schemaId/revisions")
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

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/schemas/${schemaId}/revisions`;

    const searchParams = new URLSearchParams();
    for (const k of Object.keys(query)) {
      const key = k as keyof GetSchemaRevisionsQuery;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        searchParams.append(key, query[key]!);
      }
    }
    const extraQuery =
      searchParams.size > 0 ? `&${searchParams.toString()}` : "";

    return formatSchemaRevisions(
      revisions,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      extraQuery,
    );
  }

  @Accepts("application/json")
  @Get("/:schemaId/revisions/:schemaRevisionId")
  async getSchemaRevision(
    @Param() params: GetSchemaRevisionParams,
  ): Promise<unknown> {
    const { schemaId, schemaRevisionId } = params;
    return this.schemasService.getSchemaRevision(schemaId, schemaRevisionId);
  }

  @Accepts("application/json")
  @Get("/:schemaId/revisions/:schemaRevisionId/metadata")
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
}
