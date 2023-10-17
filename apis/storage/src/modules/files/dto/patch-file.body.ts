import { IsString, IsNotEmpty, Matches } from "class-validator";

export class PatchFileBody {
  @IsNotEmpty()
  @IsString()
  @Matches(/add|remove|replace/) // only allow "add", "remove" and "replace" operations
  op!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\/metadata/) // all the operations must have /metadata as root path
  path!: string;

  value: unknown;
}

export default PatchFileBody;
