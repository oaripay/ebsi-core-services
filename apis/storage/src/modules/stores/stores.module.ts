import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { StoresController } from "./stores.controller.js";
import { StoresService } from "./stores.service.js";

@Module({
  imports: [ApiConfigModule],
  controllers: [StoresController],
  providers: [Logger, StoresService],
})
export class StoresModule {}

export default StoresModule;
