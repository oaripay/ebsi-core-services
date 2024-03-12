import {
  IsInt,
  IsHexadecimal,
  Min,
  IsOptional,
  Matches,
} from "class-validator";
import { IsHexadecimalJSON } from "../../validators/index.js";

export class ArgsTimestampRecordVersionHashes {
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  recordId!: string;

  @IsInt({ each: true })
  @Min(0, { each: true })
  hashAlgorithmIds!: number[];

  @IsHexadecimal({ each: true })
  @Matches(/^0x/, { each: true, message: "must start with 0x" })
  hashValues!: string[];

  @IsOptional()
  @IsHexadecimalJSON({ each: true })
  timestampData?: string[];

  @IsHexadecimalJSON()
  versionInfo!: string;
}

export default { ArgsTimestampRecordVersionHashes };
