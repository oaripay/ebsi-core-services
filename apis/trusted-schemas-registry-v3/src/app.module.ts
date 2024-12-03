import { LoggingInterceptor } from "@ebsiint-api/shared";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { type ApiConfig, ApiConfigModule } from "./config/configuration.js";
import { HealthModule } from "./modules/health/health.module.js";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { SchemasModule } from "./modules/schemas/schemas.module.js";

@Module({
  controllers: [AppController],
  imports: [
    ApiConfigModule,
    HealthModule,
    JsonRpcModule,
    SchemasModule,
    OpenApiModule,
  ],
  providers: [
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
