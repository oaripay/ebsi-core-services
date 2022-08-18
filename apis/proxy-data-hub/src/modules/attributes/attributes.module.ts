import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import AttributesController from "./attributes.controller";
import { AttributesService } from "./attributes.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [ApiConfigModule, AuthModule],
  controllers: [AttributesController],
  providers: [Logger, AttributesService],
})
export class AttributesModule {}

export default AttributesModule;
