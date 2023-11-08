import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration.js";
import { HealthModule } from "./modules/health/health.module.js";
import { KeyValuesModule } from "./modules/key-values/key-values.module.js";
import { StoresModule } from "./modules/stores/stores.module.js";
import { FilesModule } from "./modules/files/files.module.js";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.js";
import { LoggingInterceptor } from "./interceptors/logging.interceptor.js";
import { VersionInterceptor } from "./interceptors/version.interceptor.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { AppController } from "./app.controller.js";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    StoresModule,
    KeyValuesModule,
    FilesModule,
    JsonRpcModule,
    OpenApiModule,
  ],
  controllers: [AppController],
  providers: [
    ConfigService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: VersionInterceptor,
    },
  ],
})
export class AppModule {}

export default AppModule;
