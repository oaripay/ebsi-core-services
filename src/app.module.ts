import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "./config/configuration";
import { AuthorisationModule } from "./modules/authorisation/authorisation.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [ApiConfigModule, TerminusModule, AuthorisationModule, HealthModule],
  controllers: [],
  providers: [ConfigService],
})
export class AppModule {}

export default AppModule;
