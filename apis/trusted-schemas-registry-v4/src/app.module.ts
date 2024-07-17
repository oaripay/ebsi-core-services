import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration.js";
import { HealthModule } from "./modules/health/health.module.js";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.js";
import { SchemasModule } from "./modules/schemas/schemas.module.js";
import { LoggingInterceptor } from "./interceptors/logging.interceptor.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { AppService } from "./app.service.js";
import { AppController } from "./app.controller.js";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    JsonRpcModule,
    SchemasModule,
    OpenApiModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    AppService,
  ],
})
export class AppModule {}

export default AppModule;
