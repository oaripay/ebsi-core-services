import { SetMetadata, UseGuards, applyDecorators } from "@nestjs/common";
import { AcceptsGuard } from "../guards/accepts.guard.js";

export const Accepts = (...types: string[]) =>
  applyDecorators(SetMetadata("accepts", types), UseGuards(AcceptsGuard));

export default Accepts;
