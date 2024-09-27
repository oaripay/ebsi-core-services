import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { LoggingInterceptor } from "@ebsiint-api/shared";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule, type ApiConfig } from "./config/configuration.js";
import { HealthModule } from "./modules/health/health.module.js";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.js";
import { DidTimestampsModule } from "./modules/did-timestamps/did-timestamps.module.js";
import { HashAlgorithmsModule } from "./modules/hash-algorithms/hash-algorithms.module.js";
import { IdentifiersModule } from "./modules/identifiers/identifiers.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { AppService } from "./app.service.js";
import { AppController } from "./app.controller.js";

@Module({
  imports: [
    ApiConfigModule,
    AuthModule,
    HealthModule,
    JsonRpcModule,
    DidTimestampsModule,
    HashAlgorithmsModule,
    IdentifiersModule,
    OpenApiModule,
  ],
  controllers: [AppController],
  providers: [
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
