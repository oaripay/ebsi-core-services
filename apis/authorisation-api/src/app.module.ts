import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration";
import { AuthorisationModule } from "./modules/authorisation/authorisation.module";
import { HealthModule } from "./modules/health/health.module";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";
import { VersionInterceptor } from "./interceptors/version.interceptor";

@Module({
  imports: [ApiConfigModule, TerminusModule, AuthorisationModule, HealthModule],
  controllers: [],
  providers: [
    ConfigService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: VersionInterceptor,
    },
  ],
})
export class AppModule {}

export default AppModule;
