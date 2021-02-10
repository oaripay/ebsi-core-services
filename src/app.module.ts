import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "./config/configuration";
import { StoresModule } from "./modules/stores/stores.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [ApiConfigModule, HealthModule, StoresModule],
  providers: [ConfigService],
})
export class AppModule {}

export default AppModule;
