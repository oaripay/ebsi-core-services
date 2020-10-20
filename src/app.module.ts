import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import { HashesModule } from "./modules/hashes/hashes.module";
import { ApiConfigModule } from "./config/configuration";
import { HealthController } from "./health.controller";

@Module({
  imports: [ApiConfigModule, HashesModule, TerminusModule],
  controllers: [HealthController],
  providers: [ConfigService],
})
export default class AppModule {}
