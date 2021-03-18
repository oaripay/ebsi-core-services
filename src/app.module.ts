import { Module } from "@nestjs/common";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { AdministratorsModule } from "./modules/administrators/administrators.module";
import { PoliciesModule } from "./modules/policies/policies.module";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    JsonRpcModule,
    AdministratorsModule,
    PoliciesModule,
  ],
  providers: [],
})
export class AppModule {}

export default AppModule;
