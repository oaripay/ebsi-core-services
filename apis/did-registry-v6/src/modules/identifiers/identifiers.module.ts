import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.ts";
import IdentifiersController from "./identifiers.controller.ts";
import IdentifiersService from "./identifiers.service.ts";

@Module({
  controllers: [IdentifiersController],
  imports: [ApiConfigModule],
  providers: [Logger, IdentifiersService],
})
export class IdentifiersModule {}

export default IdentifiersModule;
