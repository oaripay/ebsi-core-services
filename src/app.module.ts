import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { SessionsModule } from "./modules/sessions/sessions.module";
import { AuthenticationModule } from "./modules/authentication/authentication.module";
import { LoggingInterceptor } from "./interceptors/logging.intereceptor";

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
  ],
})
export class AppModule {}

export default AppModule;
