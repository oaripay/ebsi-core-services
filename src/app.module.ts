import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "./config/configuration";
import { AttributesModule } from "./modules/attributes/attributes.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [ApiConfigModule, TerminusModule, AttributesModule],
  controllers: [HealthController],
  providers: [ConfigService],
})
export class AppModule {}

export default AppModule;
