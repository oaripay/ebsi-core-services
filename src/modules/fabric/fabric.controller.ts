import {
  Controller,
  Get,
  Query,
  Param,
  HttpCode,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { FabricService } from "./fabric.service";
import { PaginatedList, Block } from "./interfaces";
import { ApiConfig } from "../../config/configuration";
import { PaginationQueryDto } from "./dto/pagination-query.dto";
import { formatBlocks, formatChannels } from "./fabric.formatter";
import { GetChannelParams } from "./dto/get-channel.params";
import { FabricEnabledGuard } from "./fabric.guard";

@Controller("/blockchains/fabric")
@UseGuards(FabricEnabledGuard)
export class FabricController {
  private apiUrlPrefix: string;

  private domain: string;

  constructor(
    private fabricService: FabricService,
    private configService: ConfigService<ApiConfig>
  ) {
    this.apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    this.domain = this.configService.get<string>("domain");
  }

  @Get("/channels")
  getChannels(@Query() query: PaginationQueryDto): PaginatedList<string> {
    const channels = this.fabricService.getChannels();

    const baseUrl = `${this.domain}${this.apiUrlPrefix}/blockchains/fabric/channels`;

    return formatChannels(
      channels,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }

  @Get("/channels/:channelName")
  @HttpCode(204)
  getChannel(@Param() params: GetChannelParams): void {
    const channels = this.fabricService.getChannels();

    if (!channels.includes(params.channelName)) {
      throw new NotFoundError(NotFoundError.defaultTitle, {
        detail: `Channel ${params.channelName} not found`,
      });
    }
  }

  @Get("/channels/:channelName/blocks")
  @HttpCode(200)
  async getChannelBlocks(
    @Param() params: GetChannelParams,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedList<Block>> {
    // Make sure the channel exists
    this.getChannel(params);

    // Get blocks
    const { blocks, total } = await this.fabricService.getChannelBlocks(
      params.channelName,
      query["page[after]"],
      query["page[size]"]
    );

    const baseUrl = `${this.domain}${this.apiUrlPrefix}/blockchains/fabric/channels/${params.channelName}/blocks`;

    return formatBlocks(
      blocks,
      total,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }
}

export default FabricController;
