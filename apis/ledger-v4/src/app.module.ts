import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { LoggingInterceptor } from "@ebsiint-api/shared";
import { ApiConfigModule, type ApiConfig } from "./config/configuration.js";
import { HealthModule } from "./modules/health/health.module.js";
import { BesuModule } from "./modules/besu/besu.module.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { AppController } from "./app.controller.js";

@Module({
  imports: [ApiConfigModule, HealthModule, BesuModule, OpenApiModule],
  controllers: [AppController],
  providers: [
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
