import { Module } from "@nestjs/common";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { LedgersModule } from "./modules/ledgers/ledgers.module";

@Module({
  imports: [ApiConfigModule, HealthModule, JsonRpcModule, LedgersModule],
  providers: [],
})
export class AppModule {}

export default AppModule;
