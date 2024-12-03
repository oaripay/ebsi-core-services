import { Module } from "@nestjs/common";

import { OpenApiController } from "./openapi.controller.js";

@Module({
  controllers: [OpenApiController],
  exports: [],
  providers: [],
})
export class OpenApiModule {}

export default OpenApiModule;
