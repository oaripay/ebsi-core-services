import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "./config/configuration";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { HashAlgorithmsModule } from "./modules/hash-algorithms/hash-algorithms.module";
import { RecordsModule } from "./modules/records/records.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ApiConfigModule,
    TerminusModule,
    JsonRpcModule,
    HashAlgorithmsModule,
    RecordsModule,
  ],
  controllers: [HealthController],
  providers: [ConfigService],
})
export class AppModule {}

export default AppModule;
