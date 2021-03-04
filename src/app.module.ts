import { Module } from "@nestjs/common";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { LedgersModule } from "./modules/ledgers/ledgers.module";
import { SmartContractsModule } from "./modules/smart-contracts/smart-contracts.module";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    JsonRpcModule,
    LedgersModule,
    SmartContractsModule,
  ],
  providers: [],
})
export class AppModule {}

export default AppModule;
