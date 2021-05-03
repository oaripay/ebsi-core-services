import { Module } from "@nestjs/common";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { AdministratorsModule } from "./modules/administrators/administrators.module";
import { DidMethodsModule } from "./modules/did-methods/did-methods.module";
import { DidTimestampsModule } from "./modules/did-timestamps/did-timestamps.module";
import { HashAlgorithmsModule } from "./modules/hash-algorithms/hash-algorithms.module";
import { IdentifiersModule } from "./modules/identifiers/identifiers.module";
import { PoliciesModule } from "./modules/policies/policies.module";
import { AuthModule } from "./modules/auth/auth.module";
import { LedgerModule } from "./modules/ledger/ledger.module";

@Module({
  imports: [
    ApiConfigModule,
    AuthModule,
    LedgerModule,
    HealthModule,
    JsonRpcModule,
    AdministratorsModule,
    DidMethodsModule,
    DidTimestampsModule,
    HashAlgorithmsModule,
    IdentifiersModule,
    PoliciesModule,
  ],
  providers: [],
})
export class AppModule {}

export default AppModule;
