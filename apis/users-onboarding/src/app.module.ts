import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { SessionsModule } from "./modules/sessions/sessions.module";
import { AuthenticationModule } from "./modules/authentication/authentication.module";
import { LoggingInterceptor } from "./interceptors/logging.intereceptor";
import { VersionInterceptor } from "./interceptors/version.interceptor";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    AuthenticationModule,
    SessionsModule,
  ],
  providers: [
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
