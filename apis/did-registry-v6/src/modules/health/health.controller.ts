// For more info, read https://docs.nestjs.com/recipes/terminus
import { Controller, Get } from "@nestjs/common";
import { Accepts } from "@ebsiint-api/shared";
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthCheckError,
} from "@nestjs/terminus";
// eslint-disable-next-line import/extensions, import/no-relative-packages
import { getBuiltGraphSDK } from "../../../.graphclient/index.js";

const sdk = getBuiltGraphSDK();

@Controller("/health")
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get()
  @Accepts("application/json")
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => {
        let message = "";
        try {
          const res = await sdk.GetBlockTimestamp();
          const now = Date.now();
          // eslint-disable-next-line no-underscore-dangle
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
            status: "down",
            message,
          },
        });
      },
    ]);
  }
}

export default HealthController;
