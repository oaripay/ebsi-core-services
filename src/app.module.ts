import { Module, Logger } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration";
import { AdministratorsModule } from "./modules/administrators/administrators.module";
import { IssuersModule } from "./modules/issuers/issuers.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { PoliciesModule } from "./modules/policies/policies.module";
import { HealthModule } from "./modules/health/health.module";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";

@Module({
  imports: [
    ApiConfigModule,
    TerminusModule,
    AdministratorsModule,
    IssuersModule,
    JsonRpcModule,
    PoliciesModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    Logger,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}

export default AppModule;
