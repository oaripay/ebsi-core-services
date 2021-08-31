import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "./config/configuration";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { HashAlgorithmsModule } from "./modules/hash-algorithms/hash-algorithms.module";
import { RecordsModule } from "./modules/records/records.module";
import { TimestampsModule } from "./modules/timestamps/timestamps.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    ApiConfigModule,
    JsonRpcModule,
    HashAlgorithmsModule,
    RecordsModule,
    TimestampsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [ConfigService],
})
export class AppModule {}

export default AppModule;
