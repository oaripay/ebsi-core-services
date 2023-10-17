import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { FilesController } from "./files.controller.js";
import { FilesService } from "./files.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { CassandraModule } from "../cassandra/cassandra.module.js";

@Module({
  imports: [ApiConfigModule, AuthModule, CassandraModule],
  controllers: [FilesController],
  providers: [Logger, FilesService],
})
export class FilesModule {}

export default FilesModule;
