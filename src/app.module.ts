import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "./config/configuration";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [ApiConfigModule, TerminusModule, JsonRpcModule],
  controllers: [HealthController],
  providers: [ConfigService],
})
export class AppModule {}

export default AppModule;
