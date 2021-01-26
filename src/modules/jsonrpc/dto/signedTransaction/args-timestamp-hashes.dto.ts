import { IsArray, ValidateNested, IsHexadecimal } from "class-validator";
import { Type } from "class-transformer";

export class ArgsTimestampHashes {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => String)
  hashAlgorithmIds: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => String)
  hashValues: string[];

  @IsHexadecimal()
  timestampData: string;
}

export default { ArgsTimestampHashes };
