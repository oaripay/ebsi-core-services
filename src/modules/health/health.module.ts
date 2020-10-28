import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { ApiConfigModule } from "../../config/configuration";

@Module({
  controllers: [HealthController],
  imports: [ApiConfigModule, TerminusModule],
  providers: [],
  exports: [],
})
export class HealthModule {}

export default HealthModule;
