import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HttpModule } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "../../config/configuration";
import { HealthController } from "./health.controller";

@Module({
  imports: [ApiConfigModule, TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [ConfigService],
})
export class HealthModule {}

export default HealthModule;
