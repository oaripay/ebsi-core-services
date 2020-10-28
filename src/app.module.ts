import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { HealthModule } from "./modules/health/health.module";
import { ApiConfigModule } from "./config/configuration";

@Module({
  imports: [ApiConfigModule, NotificationsModule, HealthModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

export default AppModule;
