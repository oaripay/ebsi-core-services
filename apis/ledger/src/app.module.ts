import { LoggingInterceptor } from "@ebsiint-api/shared";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";

import type { ApiConfig } from "./config/configuration.ts";

import { AppController } from "./app.controller.ts";
import { ApiConfigModule } from "./config/configuration.ts";
import { BesuModule } from "./modules/besu/besu.module.ts";
import { HealthModule } from "./modules/health/health.module.ts";
import { OpenApiModule } from "./modules/openapi/openapi.module.ts";

@Module({
  controllers: [AppController],
  imports: [ApiConfigModule, HealthModule, BesuModule, OpenApiModule],
  providers: [
    {
      inject: [ConfigService],
      provide: APP_INTERCEPTOR,
      useFactory: (configService: ConfigService<ApiConfig, true>) =>
        new LoggingInterceptor(configService.get("logLevel", { infer: true })),
    },
  ],
})
export class AppModule {}
