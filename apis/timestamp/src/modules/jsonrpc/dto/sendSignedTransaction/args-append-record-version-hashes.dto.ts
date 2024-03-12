import {
  IsInt,
  IsHexadecimal,
  Min,
  IsOptional,
  Matches,
} from "class-validator";
import { IsHexadecimalJSON } from "../../validators/index.js";

export class ArgsAppendRecordVersionHashes {
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  recordId!: string;

  @IsInt()
  @Min(0)
  versionId!: number;

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

export default { ArgsAppendRecordVersionHashes };
