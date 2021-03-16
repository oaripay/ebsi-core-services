import { Module } from "@nestjs/common";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";

@Module({
  imports: [ApiConfigModule, HealthModule, JsonRpcModule],
  providers: [],
})
export class AppModule {}

export default AppModule;
