import { Module, Logger } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";
import { ApiConfigModule } from "../../config/configuration.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [ApiConfigModule, AuthModule],
  controllers: [NotificationsController],
  providers: [Logger, NotificationsService],
})
export class NotificationsModule {}

export default NotificationsModule;
