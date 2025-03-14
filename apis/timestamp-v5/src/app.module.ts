import { LoggingInterceptor } from "@ebsiint-api/shared";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";

import type { ApiConfig } from "./config/configuration.ts";

import { AppController } from "./app.controller.ts";
import { AppService } from "./app.service.ts";
import { ApiConfigModule } from "./config/configuration.ts";
import { AuthModule } from "./modules/auth/auth.module.ts";
import { HashAlgorithmsModule } from "./modules/hash-algorithms/hash-algorithms.module.ts";
import { HealthModule } from "./modules/health/health.module.ts";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.ts";
import { OpenApiModule } from "./modules/openapi/openapi.module.ts";
import { RecordsModule } from "./modules/records/records.module.ts";
import { TimestampsModule } from "./modules/timestamps/timestamps.module.ts";

@Module({
  controllers: [AppController],
  imports: [
    ApiConfigModule,
    AuthModule,
    JsonRpcModule,
    HashAlgorithmsModule,
    RecordsModule,
    TimestampsModule,
    HealthModule,
    OpenApiModule,
  ],
  providers: [
    ConfigService,
    {
      inject: [ConfigService],
      provide: APP_INTERCEPTOR,
      useFactory: (configService: ConfigService<ApiConfig, true>) =>
        new LoggingInterceptor(configService.get("logLevel", { infer: true })),
    },
    AppService,
  ],
})
export class AppModule {}
