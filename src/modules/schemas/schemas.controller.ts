import { Controller, Get, Query, Param } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchemasService } from "./schemas.service";
import { formatSchemas } from "./schemas.formatter";
import { GetSchemasResponse } from "./schemas.interface";
import { GetSchemaParams, GetSchemasQuery } from "./dto";
import { PaginatedList } from "../../shared/interfaces";
import { ApiConfig } from "../../config/configuration";

@Controller("/schemas")
export class SchemasController {
  constructor(
    private schemasService: SchemasService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("")
  async getSchemas(
    @Query() query: GetSchemasQuery
  ): Promise<PaginatedList<GetSchemasResponse>> {
    const schemas = await this.schemasService.getSchemas(
      query["page[after]"],
      query["page[size]"]
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/schemas`;

    return formatSchemas(
      schemas,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }

  @Get("/:schemaId")
  async getSchema(@Param() params: GetSchemaParams): Promise<unknown> {
    const { schemaId } = params;
    // TODO: change response content-type based on schema metadata?
    // Waiting for feedback https://ec.europa.eu/cefdigital/wiki/display/BLOCKCHAININT/Trusted+Schemas+Registry+API?focusedCommentId=356876619#comment-356876619
    return this.schemasService.getSchema(schemaId);
  }
}

export default SchemasController;
