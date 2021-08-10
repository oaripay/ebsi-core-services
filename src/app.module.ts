import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { BesuModule } from "./modules/besu/besu.module";
import { FabricModule } from "./modules/fabric/fabric.module";

@Module({
  imports: [
    ApiConfigModule,
    TerminusModule,
    HealthModule,
    BesuModule,
    FabricModule,
  ],
  providers: [],
})
export class AppModule {}

export default AppModule;
