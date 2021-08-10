// For more info, read https://docs.nestjs.com/recipes/terminus
import { Controller, Get, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
} from "@nestjs/terminus";
import axios from "axios";
import { ApiConfig } from "../../config/configuration";

@Controller("/health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private health: HealthCheckService,
    private configService: ConfigService<ApiConfig>
  ) {}

  private async pingUrl(
    key: string,
    url: string
  ): Promise<HealthIndicatorResult> {
    try {
      await axios.get(url);
      return {
        [key]: {
          status: "up",
        },
      };
    } catch (e) {
      this.logger.error(`${url} is not available`);
      return {
        [key]: {
          status: "down",
        },
      };
    }
  }

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Let's say we need to communicate with other APIs
      // Make sure the DNS are correctly configured
      () =>
        this.pingUrl(
          "ebsi-apis",
          this.configService.get("externalEbsiApiHealthCheck")
        ),
    ]);
  }
}

export default HealthController;
