import { IsEthereumAddress, IsString, IsInt, Min, Max } from "class-validator";

export class InsertHashAlgorithmParam {
  @IsEthereumAddress()
  from: string;

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

export default { InsertHashAlgorithmParam };
