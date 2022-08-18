import { IsString, IsNotEmpty, Matches } from "class-validator";

export class PatchAttributeBody {
  @IsNotEmpty()
  @IsString()
  @Matches(/add|remove|replace/) // only allow "add", "remove" and "replace" operations
  op: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^(\/visibility)|(\/sharedWith)|(\/contentType)|(\/dataLabel)$/)
  path: string;

  value: string;
}

export default PatchAttributeBody;
