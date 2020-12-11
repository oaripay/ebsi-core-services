// For more info, read https://docs.nestjs.com/recipes/terminus
import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  DNSHealthIndicator,
  HealthCheckResult,
} from "@nestjs/terminus";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private dns: DNSHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Let's say we need to communicate with other APIs
      // Make sure the DNS are correctly configured
      () => this.dns.pingCheck("ebsi-apis", "https://api.intebsi.xyz/docs/"),
    ]);
  }
}

export default HealthController;
