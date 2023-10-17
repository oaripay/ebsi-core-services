import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration.js";
import { AppController } from "./app.controller.js";
import { AppsModule } from "./modules/apps/apps.module.js";
import { PoliciesModule } from "./modules/policies/policies.module.js";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { LedgerModule } from "./modules/ledger/ledger.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { LoggingInterceptor } from "./interceptors/logging.interceptor.js";
import { VersionInterceptor } from "./interceptors/version.interceptor.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";

@Module({
  imports: [
    ApiConfigModule,
    AuthModule,
    TerminusModule,
    AppsModule,
    PoliciesModule,
    JsonRpcModule,
    LedgerModule,
    HealthModule,
    OpenApiModule,
  ],
  controllers: [AppController],
  providers: [
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
