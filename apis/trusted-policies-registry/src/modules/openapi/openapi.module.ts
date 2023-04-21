import { Module } from "@nestjs/common";
import { OpenApiController } from "./openapi.controller";

@Module({
  controllers: [OpenApiController],
  providers: [],
  exports: [],
})
export class OpenApiModule {}

export default OpenApiModule;
