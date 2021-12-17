import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";
import { HealthModule } from "./modules/health/health.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { PoliciesModule } from "./modules/policies/policies.module";

@Module({
  imports: [ApiConfigModule, HealthModule, JsonRpcModule, PoliciesModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}

export default AppModule;
