import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { StoresController } from "./stores.controller";
import { StoresService } from "./stores.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [StoresController],
  providers: [Logger, StoresService],
})
export class StoresModule {}

export default StoresModule;
