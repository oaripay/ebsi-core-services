import { Controller, Get, Query, Param, HttpCode } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { FabricService } from "./fabric.service";
import { PaginatedList } from "./interfaces";
import { ApiConfig } from "../../config/configuration";
import { PaginationQueryDto } from "./dto/pagination-query.dto";
import { formatChannels } from "./fabric.formatter";
import { GetChannelParams } from "./dto/get-channel.params";

@Controller("/blockchains/fabric")
export class FabricController {
  constructor(
    private fabricService: FabricService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @Get("/channels")
  getChannels(@Query() query: PaginationQueryDto): PaginatedList<string> {
    const channels = this.fabricService.getChannels();

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/blockchains/fabric/channels`;

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
}

export default FabricController;
