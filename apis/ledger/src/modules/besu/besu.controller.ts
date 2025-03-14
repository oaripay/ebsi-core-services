import type { RawBodyRequest } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

import { Accepts } from "@ebsiint-api/shared";
import { Controller, Post, Req, Response } from "@nestjs/common";

import { BesuService } from "./besu.service.ts";

@Controller("/blockchains/besu")
export class BesuController {
  constructor(private besuService: BesuService) {}

  @Accepts("application/json")
  @Post()
  async besu(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Response({ passthrough: true }) res: FastifyReply,
  ) {
    const ledgerResponse = await this.besuService.sendToBesu(req.rawBody);

    res.status(ledgerResponse.status);
    res.type("application/json");

    return ledgerResponse.data;
  }
}
