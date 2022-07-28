import { Module, Logger } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { ApiConfigModule } from "../../config/configuration";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [ApiConfigModule, AuthModule],
  controllers: [NotificationsController],
  providers: [Logger, NotificationsService],
})
export class NotificationsModule {}

export default NotificationsModule;
