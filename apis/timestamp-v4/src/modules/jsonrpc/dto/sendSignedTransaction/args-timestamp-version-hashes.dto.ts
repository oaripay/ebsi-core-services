import { IsInt, Min, IsHexadecimal, IsOptional } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class ArgsTimestampVersionHashes {
  @IsInt({ each: true })
  @Min(0, { each: true })
  hashAlgorithmIds!: number[];

  @IsHexadecimal({ each: true })
  hashValues!: string[];

  @IsOptional()
  @IsHexadecimalJSON({ each: true })
  timestampData!: string[];

  @IsHexadecimal()
  versionHash!: string;

  @IsHexadecimalJSON()
  versionInfo!: string;
}

export default { ArgsTimestampVersionHashes };
