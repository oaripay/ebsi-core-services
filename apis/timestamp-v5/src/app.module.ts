import { LoggingInterceptor } from "@ebsiint-api/shared";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { type ApiConfig, ApiConfigModule } from "./config/configuration.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { HashAlgorithmsModule } from "./modules/hash-algorithms/hash-algorithms.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { RecordsModule } from "./modules/records/records.module.js";
import { TimestampsModule } from "./modules/timestamps/timestamps.module.js";

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
        new LoggingInterceptor(configService.get("logLevel")),
    },
    AppService,
  ],
})
export class AppModule {}

export default AppModule;
