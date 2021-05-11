import { Module } from "@nestjs/common";
import { ApiConfigModule } from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { SessionsModule } from "./modules/sessions/sessions.module";
import { AuthenticationModule } from "./modules/authentication/authentication.module";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    AuthenticationModule,
    SessionsModule,
  ],
  providers: [],
})
export class AppModule {}

export default AppModule;
