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

import type { ApiConfig } from "../../config/configuration.js";

import { RUNTIME_DEPENDENCIES } from "../../config/configuration.js";

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
      ...(
        Object.keys(
          RUNTIME_DEPENDENCIES,
        ) as (keyof typeof RUNTIME_DEPENDENCIES)[]
      ).map((dependency) => async () => {
        const version = RUNTIME_DEPENDENCIES[dependency];
        return this.http.pingCheck(
          `${dependency}@${version}`,
          `${
            this.configService.get("localOrigin", { infer: true }) ??
            this.configService.get("domain", { infer: true })
          }/${dependency}/${version}`,
        );
      }),
      () =>
        this.http.pingCheck(
          "Besu",
          this.configService.get("besuReadinessEndpoint", { infer: true }),
        ),
    ]);
  }
}

export default HealthController;
