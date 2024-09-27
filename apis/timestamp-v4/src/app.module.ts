import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { LoggingInterceptor } from "@ebsiint-api/shared";
import { ApiConfigModule, type ApiConfig } from "./config/configuration.js";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.js";
import { HashAlgorithmsModule } from "./modules/hash-algorithms/hash-algorithms.module.js";
import { RecordsModule } from "./modules/records/records.module.js";
import { TimestampsModule } from "./modules/timestamps/timestamps.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { AppService } from "./app.service.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { AppController } from "./app.controller.js";

@Module({
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
  controllers: [AppController],
  providers: [
    ConfigService,
    {
      provide: APP_INTERCEPTOR,
      useFactory: (configService: ConfigService<ApiConfig, true>) =>
        new LoggingInterceptor(configService.get("logLevel")),
      inject: [ConfigService],
    },
    AppService,
  ],
})
export class AppModule {}

export default AppModule;
