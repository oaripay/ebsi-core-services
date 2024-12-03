import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import IdentifiersController from "./identifiers.controller.js";
import IdentifiersService from "./identifiers.service.js";

@Module({
  controllers: [IdentifiersController],
  imports: [ApiConfigModule],
  providers: [Logger, IdentifiersService],
})
export class IdentifiersModule {}

export default IdentifiersModule;
