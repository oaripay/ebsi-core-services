import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { AuthModule } from "../auth/auth.module";
import { CassandraModule } from "../cassandra/cassandra.module";

@Module({
  imports: [ApiConfigModule, AuthModule, CassandraModule],
  controllers: [FilesController],
  providers: [Logger, FilesService],
})
export class FilesModule {}

export default FilesModule;
