import { IsString, IsInt, Min, Max, IsOptional } from "class-validator";
import { IsMultihash } from "../../validators/index.js";

export class ArgsInsertHashAlgorithm {
  @IsInt()
  @Min(0)
  outputLength!: number;

  @IsString()
  @IsOptional()
  ianaName?: string;

  @IsString()
  @IsOptional()
  oid?: string;

  // Status
  // 1: active
  // 2: revoked
  @IsInt()
  @Min(1)
  @Max(2)
  status!: number;

  @IsMultihash()
  multihash!: string;
}

export default { ArgsInsertHashAlgorithm };
