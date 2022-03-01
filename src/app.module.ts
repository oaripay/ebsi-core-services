import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { DidMethodsModule } from "./modules/did-methods/did-methods.module";
import { DidTimestampsModule } from "./modules/did-timestamps/did-timestamps.module";
import { HashAlgorithmsModule } from "./modules/hash-algorithms/hash-algorithms.module";
import { IdentifiersModule } from "./modules/identifiers/identifiers.module";
import { PoliciesModule } from "./modules/policies/policies.module";
import { AuthModule } from "./modules/auth/auth.module";
import { LedgerModule } from "./modules/ledger/ledger.module";
import { LoggingInterceptor } from "./interceptors/logging.intereceptor";

@Module({
  imports: [
    ApiConfigModule,
    AuthModule,
    LedgerModule,
    HealthModule,
    JsonRpcModule,
    DidMethodsModule,
    DidTimestampsModule,
    HashAlgorithmsModule,
    IdentifiersModule,
    PoliciesModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}

export default AppModule;
