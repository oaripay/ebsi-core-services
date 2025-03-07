import { LoggingInterceptor } from "@ebsiint-api/shared";
import { Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";

import type { ApiConfig } from "./config/configuration.ts";

import { AppController } from "./app.controller.ts";
import { AppService } from "./app.service.ts";
import { ApiConfigModule } from "./config/configuration.ts";
import { AccessesModule } from "./modules/accesses/accesses.module.ts";
import { DocumentsModule } from "./modules/documents/documents.module.ts";
import { HealthModule } from "./modules/health/health.module.ts";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.ts";
import { OpenApiModule } from "./modules/openapi/openapi.module.ts";

@Module({
  controllers: [AppController],
  imports: [
    ApiConfigModule,
    HealthModule,
    OpenApiModule,
    DocumentsModule,
    AccessesModule,
    JsonRpcModule,
  ],
  providers: [
    Logger,
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
