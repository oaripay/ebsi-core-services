import { Controller, Head, HttpCode, Query } from "@nestjs/common";
import AccessesService from "./accesses.service.js";
import { HeadAccessesDto } from "./dto/index.js";

@Controller("/accesses")
export default class AccessesController {
  constructor(private accessesService: AccessesService) {}

  @Head("")
  @HttpCode(204)
  async isCreator(@Query() query: HeadAccessesDto): Promise<void> {
    const { creator } = query;

    await this.accessesService.isCreator(creator);
  }
}
