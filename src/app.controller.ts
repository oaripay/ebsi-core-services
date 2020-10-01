import { Controller, Get, Logger } from "@nestjs/common";

@Controller("/trusted-issuers-registry")
export default class AppController {
  private readonly logger = new Logger(AppController.name);

  @Get("/v2/health")
  health(): string {
    this.logger.debug("GET health/");
    return "ok";
  }
}
