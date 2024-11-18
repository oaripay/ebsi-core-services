import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import IdentifiersController from "./identifiers.controller.js";
import IdentifiersService from "./identifiers.service.js";

@Module({
  imports: [ApiConfigModule],
  controllers: [IdentifiersController],
  providers: [Logger, IdentifiersService],
})
export class IdentifiersModule {}

export default IdentifiersModule;
