// For more info, read https://docs.nestjs.com/recipes/terminus
import type { HealthCheckResult } from "@nestjs/terminus";

import { Accepts } from "@ebsiint-api/shared";
import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from "@nestjs/terminus";

import type { ApiConfig } from "../../config/configuration.ts";

import { RUNTIME_DEPENDENCIES } from "../../config/configuration.ts";

@Controller("/readiness")
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
      ).map((service) => async () => {
        const version = RUNTIME_DEPENDENCIES[service];
        return this.http.pingCheck(
          `${service}@${version}`,
          `${
            this.configService.get("localOrigin", { infer: true }) ??
            this.configService.get("domain", { infer: true })
          }/${service}/${version}`,
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
