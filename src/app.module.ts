import { Module } from "@nestjs/common";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { SchemasModule } from "./modules/schemas/schemas.module";
import { AdministratorsModule } from "./modules/administrators/administrators.module";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    JsonRpcModule,
    SchemasModule,
    AdministratorsModule,
  ],
  providers: [],
})
export class AppModule {}

export default AppModule;
