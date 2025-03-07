// For more info, read https://docs.nestjs.com/recipes/terminus
import type { HealthCheckResult } from "@nestjs/terminus";

import { Accepts } from "@ebsiint-api/shared";
import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckService,
  HttpHealthIndicator,
} from "@nestjs/terminus";

import type { ApiConfig } from "../../config/configuration.ts";

import { getBuiltGraphSDK } from "../../../.graphclient/index.js";
import { RUNTIME_DEPENDENCIES } from "../../config/configuration.ts";

const sdk = getBuiltGraphSDK();

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
      async () => {
        let message = "";
        try {
          const res = await sdk.GetBlockTimestamp();
          const now = Date.now();

          const blockTimestamp = res._meta.block.timestamp * 1000;
          if (now - blockTimestamp <= 300_000) {
            return {
              "Timestamp Subgraph": {
                status: "up",
              },
            };
          }
          message = "Not synchronized";
        } catch {
          // empty
          message = "Internal Server Error";
        }
        throw new HealthCheckError("health check error TSR", {
          "Timestamp Subgraph": {
            message,
            status: "down",
          },
        });
      },
    ]);
  }
}

export default HealthController;
