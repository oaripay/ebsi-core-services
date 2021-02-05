import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "./config/configuration";
import { BesuModule } from "./modules/besu/besu.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [ApiConfigModule, TerminusModule, BesuModule],
  controllers: [HealthController],
  providers: [ConfigService],
})
export class AppModule {}

export default AppModule;
