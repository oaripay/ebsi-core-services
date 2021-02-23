import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "./config/configuration";
import { AuthorisationModule } from "./modules/authorisation/authorisation.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [ApiConfigModule, TerminusModule, AuthorisationModule],
  controllers: [HealthController],
  providers: [ConfigService],
})
export class AppModule {}

export default AppModule;
