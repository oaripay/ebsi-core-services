import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { BesuController } from "./besu.controller.js";
import { BesuService } from "./besu.service.js";

@Module({
  controllers: [BesuController],
  imports: [ApiConfigModule],
  providers: [Logger, BesuService],
})
export class BesuModule {}

export default BesuModule;
