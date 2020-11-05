import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { CassandraService } from "../cassandra/cassandra.service";
import { ApiConfigModule } from "../../config/configuration";

@Module({
  controllers: [NotificationsController],
  imports: [ApiConfigModule],
  providers: [NotificationsService, CassandraService],
  exports: [],
})
export class NotificationsModule {}

export default NotificationsModule;
