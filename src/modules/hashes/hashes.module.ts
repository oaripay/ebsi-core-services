import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HashesController } from "./hashes.controller";
import { HashesService } from "./hashes.service";

@Module({
  controllers: [HashesController],
  imports: [],
  providers: [HashesService, ConfigService],
  exports: [],
})
export class HashesModule {}

export default HashesModule;
