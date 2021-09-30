import { Controller, Body, Post, Response, UseGuards } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { BesuService } from "./besu.service";
import { BesuDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards";

@Controller("/blockchains/besu")
export class BesuController {
  constructor(private besuService: BesuService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async besu(
    @Body() body: BesuDto,
    @Response() res: FastifyReply
  ): Promise<FastifyReply> {
    const ledgerResponse = await this.besuService.sendToBesu(body);

    return res.code(ledgerResponse.status).send(ledgerResponse.data);
  }
}

export default BesuController;
