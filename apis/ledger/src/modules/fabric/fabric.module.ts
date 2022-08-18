import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { FabricController } from "./fabric.controller";
import { FabricService } from "./fabric.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [FabricController],
  providers: [Logger, FabricService],
})
export class FabricModule {}

export default FabricModule;
