import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TerminusModule } from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "../../config/configuration.js";
import { HealthController } from "./health.controller.js";

@Module({
  imports: [ApiConfigModule, TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [ConfigService],
})
export class HealthModule {}

export default HealthModule;
