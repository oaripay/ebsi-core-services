import { Module } from "@nestjs/common";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { AuthenticationModule } from "./modules/authentication/authentication.module";

@Module({
  imports: [ApiConfigModule, HealthModule, AuthenticationModule],
  providers: [],
})
export class AppModule {}

export default AppModule;
