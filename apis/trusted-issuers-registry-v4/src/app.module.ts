import { Module, Logger } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration";
import { IssuersModule } from "./modules/issuers/issuers.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { HealthModule } from "./modules/health/health.module";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";
import { VersionInterceptor } from "./interceptors/version.interceptor";

@Module({
  imports: [
    ApiConfigModule,
    TerminusModule,
    IssuersModule,
    JsonRpcModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    Logger,
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
