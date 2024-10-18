// For more info, read https://docs.nestjs.com/recipes/terminus
import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Accepts } from "@ebsiint-api/shared";
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheckResult,
} from "@nestjs/terminus";
import { type ApiConfig } from "../../config/configuration.js";

@Controller("/health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private configService: ConfigService<ApiConfig, true>,
    private http: HttpHealthIndicator,
  ) {}

  @Get()
  @Accepts("application/json")
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () =>
        this.http.pingCheck(
          "Besu",
          this.configService.get<string>("besuReadinessEndpoint"),
        ),
    ]);
  }
}

export default HealthController;
