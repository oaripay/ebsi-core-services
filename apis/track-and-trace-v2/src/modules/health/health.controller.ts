import { Accepts } from "@ebsiint-api/shared";
// For more info, read https://docs.nestjs.com/recipes/terminus
import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckResult,
  HealthCheckService,
  HttpHealthIndicator,
} from "@nestjs/terminus";

import { getBuiltGraphSDK } from "../../../.graphclient/index.js";
import { type ApiConfig, DEPENDENCIES } from "../../config/configuration.js";

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
      async () => {
        let message = "";
        try {
          const res = await sdk.GetBlockTimestamp();
          const now = Date.now();

          const blockTimestamp = res._meta.block.timestamp * 1000;
          if (now - blockTimestamp <= 300_000) {
            return {
              "TNT Subgraph": {
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
          "TNT Subgraph": {
            message,
            status: "down",
          },
        });
      },
    ]);
  }
}

export default HealthController;
