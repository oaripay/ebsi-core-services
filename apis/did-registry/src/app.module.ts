import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration.js";
import { HealthModule } from "./modules/health/health.module.js";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.js";
import { DidTimestampsModule } from "./modules/did-timestamps/did-timestamps.module.js";
import { HashAlgorithmsModule } from "./modules/hash-algorithms/hash-algorithms.module.js";
import { IdentifiersModule } from "./modules/identifiers/identifiers.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { LedgerModule } from "./modules/ledger/ledger.module.js";
import { LoggingInterceptor } from "./interceptors/logging.interceptor.js";
import { VersionInterceptor } from "./interceptors/version.interceptor.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { AppService } from "./app.service.js";

@Module({
  imports: [
    ApiConfigModule,
    AuthModule,
    LedgerModule,
    HealthModule,
    JsonRpcModule,
    DidTimestampsModule,
    HashAlgorithmsModule,
    IdentifiersModule,
    OpenApiModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: VersionInterceptor,
    },
    AppService,
  ],
})
export class AppModule {}

export default AppModule;
