import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { ApiConfigModule } from "./config/configuration";
import { AppController } from "./app.controller";
import { AppsModule } from "./modules/apps/apps.module";
import { AdministratorsModule } from "./modules/administrators/administrators.module";
import { PoliciesModule } from "./modules/policies/policies.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { HealthController } from "./health.controller";
import { AuthModule } from "./modules/auth/auth.module";

@Module({
  imports: [
    ApiConfigModule,
    AuthModule,
    TerminusModule,
    AppsModule,
    AdministratorsModule,
    PoliciesModule,
    JsonRpcModule,
  ],
  controllers: [AppController, HealthController],
  providers: [],
})
export class AppModule {}

export default AppModule;
