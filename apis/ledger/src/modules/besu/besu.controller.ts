import { Controller, Body, Post, Response } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { BesuService } from "./besu.service.js";
import { BesuDto } from "./dto/index.js";

@Controller("/blockchains/besu")
export class BesuController {
  constructor(private besuService: BesuService) {}

  @Post()
  async besu(
    @Body() body: BesuDto,
    @Response() res: FastifyReply,
  ): Promise<FastifyReply> {
    const ledgerResponse = await this.besuService.sendToBesu(body);

    return res.code(ledgerResponse.status).send(ledgerResponse.data);
  }
}

export default BesuController;
