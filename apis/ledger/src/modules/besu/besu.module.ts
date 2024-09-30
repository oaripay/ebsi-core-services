import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { BesuController } from "./besu.controller.js";
import { BesuService } from "./besu.service.js";

@Module({
  imports: [ApiConfigModule],
  controllers: [BesuController],
  providers: [Logger, BesuService],
})
export class BesuModule {}

export default BesuModule;
