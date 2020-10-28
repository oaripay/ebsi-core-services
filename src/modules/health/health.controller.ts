// For more info, read https://docs.nestjs.com/recipes/terminus
import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  HealthCheck,
  HealthCheckService,
  DNSHealthIndicator,
  HealthCheckResult,
} from "@nestjs/terminus";
import { ConfigObject } from "../../config/configuration";

@Controller("/health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private dns: DNSHealthIndicator,
    private configService: ConfigService<ConfigObject>
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Let's say we need to communicate with other APIs
      // Make sure the DNS are correctly configured
      () =>
        this.dns.pingCheck(
          "ebsi-api",
          this.configService.get("healthcheckEbsiApi")
        ),
    ]);
  }
}

export default HealthController;
