import { Module, Logger } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { LoggingInterceptor } from "@ebsiint-api/shared";
import { ApiConfigModule, type ApiConfig } from "./config/configuration.js";
import { HealthModule } from "./modules/health/health.module.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { DocumentsModule } from "./modules/documents/documents.module.js";
import { AccessesModule } from "./modules/accesses/accesses.module.js";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.js";
import { AppService } from "./app.service.js";
import { AppController } from "./app.controller.js";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    OpenApiModule,
    DocumentsModule,
    AccessesModule,
    JsonRpcModule,
  ],
  controllers: [AppController],
  providers: [
    Logger,
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
