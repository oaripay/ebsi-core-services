import { Module } from "@nestjs/common";
import { OpenApiController } from "./openapi.controller.js";

@Module({
  controllers: [OpenApiController],
  providers: [],
  exports: [],
})
export class OpenApiModule {}

export default OpenApiModule;
