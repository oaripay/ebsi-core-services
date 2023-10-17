// For more info, read https://docs.nestjs.com/recipes/terminus
import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheckResult,
} from "@nestjs/terminus";
import type { ApiConfig } from "../../config/configuration.js";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private configService: ConfigService<ApiConfig, true>,
    private http: HttpHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Let's say we need to communicate with other APIs
      // Make sure the DNS are correctly configured
      async () =>
        this.http.pingCheck(
          "ebsi-apis",
          this.configService.get("externalEbsiApiHealthCheck"),
        ),
    ]);
  }
}

export default HealthController;
