import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration";
import { AppController } from "./app.controller";
import { AppsModule } from "./modules/apps/apps.module";
import { AdministratorsModule } from "./modules/administrators/administrators.module";
import { PoliciesModule } from "./modules/policies/policies.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { AuthModule } from "./modules/auth/auth.module";
import { LedgerModule } from "./modules/ledger/ledger.module";
import { HealthModule } from "./modules/health/health.module";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";

@Module({
  imports: [
    ApiConfigModule,
    AuthModule,
    TerminusModule,
    AppsModule,
    AdministratorsModule,
    PoliciesModule,
    JsonRpcModule,
    LedgerModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}

export default AppModule;
