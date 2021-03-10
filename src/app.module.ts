import { Module } from "@nestjs/common";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { SchemasModule } from "./modules/schemas/schemas.module";

@Module({
  imports: [ApiConfigModule, HealthModule, JsonRpcModule, SchemasModule],
  providers: [],
})
export class AppModule {}

export default AppModule;
