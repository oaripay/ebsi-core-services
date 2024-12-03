import type { FastifyReply } from "fastify";

import { Accepts } from "@ebsiint-api/shared";
import { Body, Controller, Post, Response } from "@nestjs/common";

import { BesuService } from "./besu.service.js";
import { BesuDto } from "./dto/index.js";

@Controller("/blockchains/besu")
export class BesuController {
  constructor(private besuService: BesuService) {}

  @Accepts("application/json")
  @Post()
  async besu(
    @Body() body: BesuDto,
    @Response({ passthrough: true }) res: FastifyReply,
  ) {
    const ledgerResponse = await this.besuService.sendToBesu(body);

    res.status(ledgerResponse.status);

    return ledgerResponse.data;
  }
}

export default BesuController;
