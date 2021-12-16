import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { KeyValuesModule } from "./modules/key-values/key-values.module";
import { StoresModule } from "./modules/stores/stores.module";
import { FilesModule } from "./modules/files/files.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    StoresModule,
    KeyValuesModule,
    FilesModule,
    JsonRpcModule,
  ],
  providers: [
    ConfigService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}

export default AppModule;
