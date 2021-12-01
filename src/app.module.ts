import { Module } from "@nestjs/common";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    // PoliciesModule,
  ],
  providers: [],
})
export class AppModule {}

export default AppModule;
