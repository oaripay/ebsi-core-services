import { Controller, Body, Post, Response, UseGuards } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { BesuService } from "./besu.service.js";
import { BesuDto } from "./dto/index.js";
import { JwtAuthGuard } from "../auth/guards/index.js";

@Controller("/blockchains/besu")
export class BesuController {
  constructor(private besuService: BesuService) {}

  @UseGuards(JwtAuthGuard)
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
