import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { KeyValuesModule } from "./modules/key-values/key-values.module";
import { StoresModule } from "./modules/stores/stores.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    StoresModule,
    KeyValuesModule,
    JsonRpcModule,
  ],
  providers: [ConfigService],
})
export class AppModule {}

export default AppModule;
