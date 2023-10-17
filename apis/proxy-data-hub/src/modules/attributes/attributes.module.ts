import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import AttributesController from "./attributes.controller.js";
import { AttributesService } from "./attributes.service.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [ApiConfigModule, AuthModule],
  controllers: [AttributesController],
  providers: [Logger, AttributesService],
})
export class AttributesModule {}

export default AttributesModule;
