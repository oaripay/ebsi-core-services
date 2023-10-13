import { IsInt, Min, IsHexadecimal, IsOptional } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class ArgsTimestampRecordHashes {
  @IsInt({ each: true })
  @Min(0, { each: true })
  hashAlgorithmIds!: number[];

  @IsHexadecimal({ each: true })
  hashValues!: string[];

  @IsOptional()
  @IsHexadecimalJSON({ each: true })
  timestampData!: string[];

  @IsHexadecimalJSON()
  versionInfo!: string;
}

export default { ArgsTimestampRecordHashes };
