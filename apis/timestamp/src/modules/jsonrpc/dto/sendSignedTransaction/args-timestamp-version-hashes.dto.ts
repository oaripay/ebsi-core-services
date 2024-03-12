import {
  IsInt,
  Min,
  IsHexadecimal,
  IsOptional,
  Matches,
} from "class-validator";
import { IsHexadecimalJSON } from "../../validators/index.js";

export class ArgsTimestampVersionHashes {
  @IsInt({ each: true })
  @Min(0, { each: true })
  hashAlgorithmIds!: number[];

  @IsHexadecimal({ each: true })
  @Matches(/^0x/, { each: true, message: "must start with 0x" })
  hashValues!: string[];

  @IsOptional()
  @IsHexadecimalJSON({ each: true })
  timestampData?: string[];

  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  versionHash!: string;

  @IsHexadecimalJSON()
  versionInfo!: string;
}

export default { ArgsTimestampVersionHashes };
