import { Module, Logger } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { ApiConfigModule } from "./config/configuration";
import { AdministratorsModule } from "./modules/administrators/administrators.module";
import { IssuersModule } from "./modules/issuers/issuers.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { PoliciesModule } from "./modules/policies/policies.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ApiConfigModule,
    TerminusModule,
    AdministratorsModule,
    IssuersModule,
    JsonRpcModule,
    PoliciesModule,
  ],
  controllers: [HealthController],
  providers: [Logger],
})
export class AppModule {}

export default AppModule;
