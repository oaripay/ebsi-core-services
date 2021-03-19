import { IsString, IsInt, Min, Max } from "class-validator";

export class ArgsUpdateHashAlgorithm {
  @IsInt()
  @Min(0)
  hashAlgorithmId: number;

  @IsInt()
  @Min(0)
  outputLength: number;

  @IsString()
  ianaName: string;

  @IsString()
  oid: string;

  // Status
  // 1: active
  // 2: revoked
  @IsInt()
  @Min(1)
  @Max(2)
  status: number;
}

export default { ArgsUpdateHashAlgorithm };
