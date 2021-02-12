import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "./config/configuration";
import { StoresModule } from "./modules/stores/stores.module";
import { HealthModule } from "./modules/health/health.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";

@Module({
  imports: [ApiConfigModule, HealthModule, StoresModule, JsonRpcModule],
  providers: [ConfigService],
})
export class AppModule {}

export default AppModule;
