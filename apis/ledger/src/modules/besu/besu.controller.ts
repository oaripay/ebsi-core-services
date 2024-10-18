import { Controller, Body, Post, Response } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { Accepts } from "@ebsiint-api/shared";
import { BesuService } from "./besu.service.js";
import { BesuDto } from "./dto/index.js";

@Controller("/blockchains/besu")
export class BesuController {
  constructor(private besuService: BesuService) {}

  @Post()
  @Accepts("application/json")
  async besu(
    @Body() body: BesuDto,
    @Response() res: FastifyReply,
  ): Promise<FastifyReply> {
    const ledgerResponse = await this.besuService.sendToBesu(body);

    return res.code(ledgerResponse.status).send(ledgerResponse.data);
  }
}

export default BesuController;
