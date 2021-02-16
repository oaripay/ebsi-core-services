import {
  Controller,
  Response,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyReply } from "fastify";
import { KeyValuesService } from "./key-values.service";
import { GetKeyValuesQuery, GetKeyValueParams, PutKeyValueParams } from "./dto";
import { formatKeys } from "./key-values.formatter";
import { ApiConfig } from "../../config/configuration";
import { JwtAuthGuard } from "../auth/guards";
import { User, UserInfo } from "../auth/decorators";
import { PaginatedList } from "../../shared/interfaces";

@Controller("/stores/distributed/key-values")
export class KeyValuesController {
  constructor(
    private keyValuesService: KeyValuesService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Get()
  async getKeys(
    @Query() query: GetKeyValuesQuery,
    @User() user: UserInfo
  ): Promise<PaginatedList<string>> {
    const { did } = user;
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];

    const { keys, pageState } = await this.keyValuesService.getKeys(
      did,
      pageAfter,
      pageSize
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/stores/distributed/key-values`;

    // Known issues: because of how Cassandra works, we only return the "next" link, not other links
    // We don't return the total either, as it would require a separate, time-consuming query
    return formatKeys(keys, pageAfter, pageState, pageSize, baseUrl);
  }

  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Get("/:key")
  async getKeyValue(
    @Param() params: GetKeyValueParams,
    @User() user: UserInfo
  ): Promise<string> {
    const { key } = params;
    const { did } = user;

    return this.keyValuesService.getKeyValue({ did, key });
  }

  @UseGuards(JwtAuthGuard)
  @Put("/:key")
  async putKeyValue(
    @Param() params: PutKeyValueParams,
    @Body() value: string,
    @User() user: UserInfo,
    @Response() res: FastifyReply
  ): Promise<FastifyReply> {
    const { key } = params;
    const { did } = user;

    const { keyValue, isNew } = await this.keyValuesService.putKeyValue(
      did,
      key,
      value
    );

    return res
      .code(isNew ? 201 : 200)
      .type("application/json")
      .send(keyValue);
  }
}

export default KeyValuesController;
