import { LoggingInterceptor } from "@ebsiint-api/shared";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { AppController } from "./app.controller.js";
import { type ApiConfig, ApiConfigModule } from "./config/configuration.js";
import { AuthorisationModule } from "./modules/authorisation/authorisation.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";

@Module({
  controllers: [AppController],
  imports: [ApiConfigModule, AuthorisationModule, HealthModule, OpenApiModule],
  providers: [
    ConfigService,
    {
      inject: [ConfigService],
      provide: APP_INTERCEPTOR,
      useFactory: (configService: ConfigService<ApiConfig, true>) =>
        new LoggingInterceptor(configService.get("logLevel")),
    },
  ],
})
export class AppModule {}

export default AppModule;
