import { Module, Logger } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration.js";
import { IssuersModule } from "./modules/issuers/issuers.module.js";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { LoggingInterceptor } from "./interceptors/logging.interceptor.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { AppService } from "./app.service.js";
import { AppController } from "./app.controller.js";

@Module({
  imports: [
    ApiConfigModule,
    IssuersModule,
    JsonRpcModule,
    HealthModule,
    OpenApiModule,
  ],
  controllers: [AppController],
  providers: [
    Logger,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    AppService,
  ],
})
export class AppModule {}

export default AppModule;
