// For more info, read https://docs.nestjs.com/recipes/terminus
import type { HealthCheckResult } from "@nestjs/terminus";

import { Accepts } from "@ebsiint-api/shared";
import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckService,
} from "@nestjs/terminus";

import { getBuiltGraphSDK } from "../../../.graphclient/index.js";

const sdk = getBuiltGraphSDK();

@Controller("/health")
export class HealthController {
  private readonly health: HealthCheckService;

  constructor(health: HealthCheckService) {
    this.health = health;
  }

  @Accepts("application/json")
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => {
        let message = "";
        try {
          const res = await sdk.GetBlockTimestamp();
          const now = Date.now();

          const blockTimestamp = res._meta!.block.timestamp! * 1000;
          if (now - blockTimestamp <= 300_000) {
            return {
              "DIDR Subgraph": {
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
          "DIDR Subgraph": {
            message,
            status: "down",
          },
        });
      },
    ]);
  }
}
