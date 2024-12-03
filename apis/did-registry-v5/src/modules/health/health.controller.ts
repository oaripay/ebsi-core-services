import { Accepts } from "@ebsiint-api/shared";
// For more info, read https://docs.nestjs.com/recipes/terminus
import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HttpHealthIndicator,
} from "@nestjs/terminus";

import { type ApiConfig, DEPENDENCIES } from "../../config/configuration.js";

@Controller("/health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private configService: ConfigService<ApiConfig, true>,
    private http: HttpHealthIndicator,
  ) {}

  @Accepts("application/json")
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      ...(Object.keys(DEPENDENCIES) as (keyof typeof DEPENDENCIES)[]).map(
        (dependency) => async () =>
          this.http.pingCheck(
            dependency,
            `${
              this.configService.get<string>("localOrigin") ||
              this.configService.get<string>("domain")
            }${DEPENDENCIES[dependency]}`,
          ),
      ),
      () =>
        this.http.pingCheck(
          "Besu",
          this.configService.get<string>("besuReadinessEndpoint"),
        ),
    ]);
  }
}

export default HealthController;
