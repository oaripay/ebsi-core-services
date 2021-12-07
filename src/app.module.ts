import { Module } from "@nestjs/common";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { PoliciesModule } from "./modules/policies/policies.module";

@Module({
  imports: [ApiConfigModule, HealthModule, PoliciesModule],
  providers: [],
})
export class AppModule {}

export default AppModule;
