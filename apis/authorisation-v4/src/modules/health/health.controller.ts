// For more info, read https://docs.nestjs.com/recipes/terminus
import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheckResult,
} from "@nestjs/terminus";
import { DEPENDENCIES, type ApiConfig } from "../../config/configuration.js";

@Controller("/health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private configService: ConfigService<ApiConfig, true>,
    private http: HttpHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check(
      (Object.keys(DEPENDENCIES) as (keyof typeof DEPENDENCIES)[]).map(
        (dependency) => async () =>
          this.http.pingCheck(
            dependency,
            `${
              this.configService.get("localOrigin", { infer: true }) ||
              this.configService.get("domain", { infer: true })
            }${DEPENDENCIES[dependency]}`,
          ),
      ),
    );
  }
}

export default HealthController;
