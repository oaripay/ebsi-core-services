import { Module } from "@nestjs/common";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { AdministratorsModule } from "./modules/administrators/administrators.module";
import { DidMethodsModule } from "./modules/did-methods/did-methods.module";
import { HashAlgorithmsModule } from "./modules/hash-algorithms/hash-algorithms.module";
import { PoliciesModule } from "./modules/policies/policies.module";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    JsonRpcModule,
    AdministratorsModule,
    DidMethodsModule,
    HashAlgorithmsModule,
    PoliciesModule,
  ],
  providers: [],
})
export class AppModule {}

export default AppModule;
