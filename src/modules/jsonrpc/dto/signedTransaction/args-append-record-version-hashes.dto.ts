import { IsInt, IsHexadecimal, Min, IsOptional } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class ArgsAppendRecordVersionHashes {
  @IsHexadecimal()
  recordId: string;

  @IsInt()
  @Min(0)
  versionId: number;

  @IsInt({ each: true })
  @Min(0, { each: true })
  hashAlgorithmIds: number[];

  @IsHexadecimal({ each: true })
  hashValues: string[];

  @IsOptional()
  @IsHexadecimalJSON({ each: true })
  timestampData: string[];

  @IsHexadecimalJSON()
  versionInfo: string;
}

export default { ArgsAppendRecordVersionHashes };
