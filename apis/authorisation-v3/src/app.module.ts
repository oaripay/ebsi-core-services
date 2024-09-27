import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { LoggingInterceptor } from "@ebsiint-api/shared";
import { ApiConfigModule, type ApiConfig } from "./config/configuration.js";
import { AuthorisationModule } from "./modules/authorisation/authorisation.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { AppController } from "./app.controller.js";

@Module({
  imports: [ApiConfigModule, AuthorisationModule, HealthModule, OpenApiModule],
  controllers: [AppController],
  providers: [
    ConfigService,
    {
      provide: APP_INTERCEPTOR,
      useFactory: (configService: ConfigService<ApiConfig, true>) =>
        new LoggingInterceptor(configService.get("logLevel")),
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}

export default AppModule;
